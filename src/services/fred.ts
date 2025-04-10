/**
 * FRED API Service
 * Handles interaction with the Federal Reserve Economic Data API
 */

import { ApiError } from '../api/router';
import { Env, FredSeries, RecessionPeriod, SeriesDataParams } from '../types';

// Base URL for FRED API
const FRED_API_BASE_URL = 'https://api.stlouisfed.org/fred';

/**
 * Fetch a time series from the FRED API
 * @param seriesId - FRED series ID
 * @param params - Query parameters
 * @param env - The environment variables and bindings
 * @returns Series data
 */
export async function fetchFredSeries(
  seriesId: string, 
  params: SeriesDataParams = {}, 
  env: Env
): Promise<FredSeries> {
  // Validate series ID
  if (!seriesId) {
    throw new ApiError('Series ID is required', 400);
  }
  
  // Get API key from environment variable
  const apiKey = env.FRED_API_KEY;
  if (!apiKey) {
    throw new ApiError('FRED API key is not configured', 500);
  }
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    ...(params as Record<string, string>)
  });
  
  // Make request to FRED API
  try {
    const response = await fetch(`${FRED_API_BASE_URL}/series/observations?${queryParams}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(`FRED API error (${response.status}): ${errorText}`, response.status);
    }
    
    const data = await response.json() as { observations: Array<{ date: string; value: string; status?: string }> };
    
    // Also fetch series information to include metadata
    const seriesInfo = await fetchSeriesInfo(seriesId, env);
    
    // Combine observations with series metadata
    return {
      ...seriesInfo,
      observations: data.observations.map(obs => ({
        date: obs.date,
        value: obs.value !== '.' ? parseFloat(obs.value) : null,
        status: obs.status
      }))
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch FRED data: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Fetch information about a series from the FRED API
 * @param seriesId - FRED series ID
 * @param env - The environment variables and bindings
 * @returns Series information
 */
async function fetchSeriesInfo(seriesId: string, env: Env): Promise<Omit<FredSeries, 'observations'>> {
  // Get API key from environment variable
  const apiKey = env.FRED_API_KEY;
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json'
  });
  
  // Make request to FRED API
  try {
    const response = await fetch(`${FRED_API_BASE_URL}/series?${queryParams}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(`FRED API error (${response.status}): ${errorText}`, response.status);
    }
    
    const data = await response.json() as { seriess: Array<{
      id: string;
      title: string;
      units: string;
      frequency: string;
      frequency_short: string;
      seasonal_adjustment: string;
      seasonal_adjustment_short: string;
      last_updated: string;
      notes: string;
    }> };
    
    if (!data.seriess || data.seriess.length === 0) {
      throw new ApiError(`Series not found: ${seriesId}`, 404);
    }
    
    const series = data.seriess[0];
    
    return {
      id: series.id,
      title: series.title,
      units: series.units,
      frequency: series.frequency,
      frequency_short: series.frequency_short,
      seasonal_adjustment: series.seasonal_adjustment,
      seasonal_adjustment_short: series.seasonal_adjustment_short,
      last_updated: series.last_updated,
      notes: series.notes
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch series info: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Fetch series categories from the FRED API
 * @param seriesId - FRED series ID
 * @param env - The environment variables and bindings
 * @returns Categories for the series
 */
export async function fetchSeriesCategories(seriesId: string, env: Env): Promise<Array<{
  id: number;
  name: string;
  parent_id?: number;
}>> {
  // Get API key from environment variable
  const apiKey = env.FRED_API_KEY;
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json'
  });
  
  // Make request to FRED API
  try {
    const response = await fetch(`${FRED_API_BASE_URL}/series/categories?${queryParams}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(`FRED API error (${response.status}): ${errorText}`, response.status);
    }
    
    const data = await response.json() as { categories: Array<{
      id: number;
      name: string;
      parent_id?: number;
    }> };
    
    return data.categories || [];
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch series categories: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Fetch recession dates from FRED
 * @param env - The environment variables and bindings
 * @returns Array of recession periods
 */
export async function fetchRecessionDates(env: Env): Promise<RecessionPeriod[]> {
  // The FRED recession indicator series ID
  const recessionSeriesId = 'USREC';
  
  try {
    // Fetch the recession indicator series
    const recessionData = await fetchFredSeries(recessionSeriesId, {}, env);
    
    if (!recessionData || !recessionData.observations) {
      throw new ApiError('Failed to fetch recession data', 500);
    }
    
    // Process the observations to find start and end dates of recessions
    const recessions: RecessionPeriod[] = [];
    let currentRecession: RecessionPeriod | null = null;
    
    for (let i = 0; i < recessionData.observations.length; i++) {
      const obs = recessionData.observations[i];
      
      // USREC value of 1 indicates a recession period
      if (obs.value === 1) {
        if (!currentRecession) {
          // Start of a new recession
          currentRecession = { start: obs.date, end: '' };
        }
      } else if (currentRecession) {
        // End of a recession
        // Use the previous date as the end date
        currentRecession.end = recessionData.observations[i - 1].date;
        recessions.push(currentRecession);
        currentRecession = null;
      }
    }
    
    // Handle case where we're currently in a recession (last observation is 1)
    if (currentRecession) {
      const lastObs = recessionData.observations[recessionData.observations.length - 1];
      currentRecession.end = lastObs.date;
      recessions.push(currentRecession);
    }
    
    return recessions;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch recession dates: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}
