/**
 * Series API Handler
 * Handles requests for time series data
 */

import { getFromCache, setCache } from '../utils/cache';
import { fetchFredSeries } from '../services/fred';
import { processTimeSeriesData } from '../utils/dataProcessor';
import { ApiError } from './router';
import { Env, FredSeries, LatestDataPoint, SeriesDataParams } from '../types';

// Cache key prefixes
const SERIES_DATA_CACHE_PREFIX = 'series:data:';
const SERIES_LATEST_CACHE_PREFIX = 'series:latest:';

// Cache TTL (Time-to-live) in seconds
const CACHE_TTL = {
  DAILY: 3600,        // 1 hour
  WEEKLY: 14400,      // 4 hours
  MONTHLY: 86400,     // 1 day
  QUARTERLY: 172800,  // 2 days
};

/**
 * Get time series data for a specific indicator
 * @param seriesId - FRED series ID
 * @param params - Query parameters for filtering
 * @param env - The environment variables and bindings
 * @returns Time series data
 */
export async function getSeriesData(
  seriesId: string, 
  params: Record<string, string> | SeriesDataParams, 
  env: Env
): Promise<FredSeries> {
  // Validate series ID
  if (!seriesId) {
    throw new ApiError('Series ID is required', 400);
  }
  
  // Convert params to proper type
  const typedParams: SeriesDataParams = {
    ...(params as Record<string, string>),
    limit: params.limit ? parseInt(params.limit as string) : undefined
  };
  
  // Generate a cache key that includes relevant query parameters
  const cacheKey = generateCacheKey(seriesId, typedParams);
  
  // Try to get from cache first
  const cachedData = await getFromCache(cacheKey, env);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // If not in cache, fetch from FRED API
  try {
    const fredData = await fetchFredSeries(seriesId, typedParams, env);
    
    // Process the data (calculate derivatives, transformations, etc.)
    const processedData = processTimeSeriesData(fredData, typedParams);
    
    // Determine appropriate TTL based on data frequency
    const ttl = determineCacheTTL(fredData.frequency_short);
    
    // Cache the result
    await setCache(cacheKey, JSON.stringify(processedData), ttl, env);
    
    return processedData;
  } catch (error) {
    throw new ApiError(`Failed to fetch series data for ${seriesId}: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Get the latest data point for a specific indicator
 * @param seriesId - FRED series ID
 * @param env - The environment variables and bindings
 * @returns Latest data point
 */
export async function getLatestDataPoint(seriesId: string, env: Env): Promise<LatestDataPoint> {
  // Validate series ID
  if (!seriesId) {
    throw new ApiError('Series ID is required', 400);
  }
  
  const cacheKey = `${SERIES_LATEST_CACHE_PREFIX}${seriesId}`;
  
  // Try to get from cache first
  const cachedData = await getFromCache(cacheKey, env);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // If not in cache, fetch from FRED API with limit=1 to get only the latest observation
  try {
    const fredData = await fetchFredSeries(seriesId, { limit: 1, sort_order: 'desc' }, env);
    
    if (!fredData || !fredData.observations || fredData.observations.length === 0) {
      throw new ApiError(`No data available for series ${seriesId}`, 404);
    }
    
    const latestObservation = fredData.observations[0];
    
    // Add metadata to the result
    const result: LatestDataPoint = {
      series_id: seriesId,
      title: fredData.title,
      last_updated: fredData.last_updated,
      units: fredData.units,
      frequency: fredData.frequency,
      latest_value: latestObservation.value !== null ? latestObservation.value : 0,
      date: latestObservation.date,
    };
    
    // Determine appropriate TTL based on data frequency
    const ttl = determineCacheTTL(fredData.frequency_short);
    
    // Cache the result
    await setCache(cacheKey, JSON.stringify(result), ttl, env);
    
    return result;
  } catch (error) {
    throw new ApiError(`Failed to fetch latest data point for ${seriesId}: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Generate a cache key based on series ID and parameters
 * @param seriesId - FRED series ID
 * @param params - Query parameters
 * @returns Cache key
 */
function generateCacheKey(seriesId: string, params: SeriesDataParams): string {
  // Start with the base cache key
  let cacheKey = `${SERIES_DATA_CACHE_PREFIX}${seriesId}`;
  
  // Add relevant parameters to the cache key
  const relevantParams = ['frequency', 'units', 'transformation', 'start_date', 'end_date'];
  for (const param of relevantParams) {
    const value = params[param as keyof SeriesDataParams];
    if (value) {
      cacheKey += `:${param}=${value}`;
    }
  }
  
  return cacheKey;
}

/**
 * Determine appropriate cache TTL based on data frequency
 * @param frequency - FRED frequency code (D, W, M, Q, SA, etc.)
 * @returns Cache TTL in seconds
 */
function determineCacheTTL(frequency?: string): number {
  if (!frequency) return CACHE_TTL.DAILY;
  
  const freqChar = frequency.charAt(0).toUpperCase();
  
  switch (freqChar) {
    case 'D': return CACHE_TTL.DAILY;
    case 'W': return CACHE_TTL.WEEKLY;
    case 'M': return CACHE_TTL.MONTHLY;
    case 'Q': return CACHE_TTL.QUARTERLY;
    default: return CACHE_TTL.DAILY; // Default to daily TTL
  }
}
