/**
 * Indicators Service
 * Handles scheduled updates for economic indicators
 */

import { fetchFredSeries } from './fred';
import { getFromCache, setCache, deleteCache } from '../utils/cache';
import { processTimeSeriesData } from '../utils/dataProcessor';
import { ApiError } from '../api/router';
import { Env, UpdateResults } from '../types';

// Cache key prefixes
const SERIES_DATA_CACHE_PREFIX = 'series:data:';
const SERIES_LATEST_CACHE_PREFIX = 'series:latest:';
const LAST_UPDATE_CACHE_PREFIX = 'last_update:';

// Lists of indicators by update frequency
const DAILY_INDICATORS = ['GS10', 'T10Y2Y', 'BAA10Y'];
const WEEKLY_INDICATORS = ['ICSA', 'MORTGAGE30US'];
const MONTHLY_INDICATORS = [
  'UNRATE', 'PAYEMS', 'CPIAUCSL', 'CPILFESL', 'INDPRO',
  'RSXFS', 'PCE', 'PCEPI', 'PCEPILFE', 'CIVPART',
  'JTSJOL', 'PERMIT', 'UMCSENT', 'NAPM', 'FEDFUNDS',
  'M2SL', 'CSUSHPISA', 'HOUST', 'PPIACO'
];
const QUARTERLY_INDICATORS = ['GDPC1'];

/**
 * Update financial indicators that change daily
 * @param env - The environment variables and bindings
 * @returns Update results
 */
export async function updateFinancialIndicators(env: Env): Promise<UpdateResults> {
  return updateIndicators(DAILY_INDICATORS, 'daily', env);
}

/**
 * Update economic indicators that change weekly
 * @param env - The environment variables and bindings
 * @returns Update results
 */
export async function updateWeeklyEconomicIndicators(env: Env): Promise<UpdateResults> {
  return updateIndicators(WEEKLY_INDICATORS, 'weekly', env);
}

/**
 * Update economic indicators that change monthly
 * @param env - The environment variables and bindings
 * @returns Update results
 */
export async function updateMonthlyEconomicIndicators(env: Env): Promise<UpdateResults> {
  return updateIndicators(MONTHLY_INDICATORS, 'monthly', env);
}

/**
 * Update economic indicators that change quarterly
 * @param env - The environment variables and bindings
 * @returns Update results
 */
export async function updateQuarterlyEconomicIndicators(env: Env): Promise<UpdateResults> {
  return updateIndicators(QUARTERLY_INDICATORS, 'quarterly', env);
}

/**
 * Update a list of indicators
 * @param indicators - List of FRED series IDs to update
 * @param frequency - Update frequency label
 * @param env - The environment variables and bindings
 * @returns Update results
 */
async function updateIndicators(
  indicators: string[],
  frequency: string,
  env: Env
): Promise<UpdateResults> {
  const results: UpdateResults = {
    frequency,
    updated: [],
    failed: [],
    timestamp: new Date().toISOString()
  };
  
  // Check when these indicators were last updated
  const lastUpdateKey = `${LAST_UPDATE_CACHE_PREFIX}${frequency}`;
  const lastUpdate = await getFromCache(lastUpdateKey, env);
  
  // Update each indicator in the list
  for (const seriesId of indicators) {
    try {
      // Fetch fresh data from FRED API
      const fredData = await fetchFredSeries(seriesId, {}, env);
      
      // Skip if no new data since last update
      if (lastUpdate && fredData.last_updated <= lastUpdate) {
        continue;
      }
      
      // Process the data
      const processedData = processTimeSeriesData(fredData, {});
      
      // Update series data cache
      const seriesKey = `${SERIES_DATA_CACHE_PREFIX}${seriesId}`;
      await setCache(seriesKey, JSON.stringify(processedData), 86400, env); // 24 hours TTL
      
      // Update latest data point cache
      if (processedData.observations && processedData.observations.length > 0) {
        const latest = processedData.observations[processedData.observations.length - 1];
        const latestData = {
          series_id: seriesId,
          title: processedData.title,
          last_updated: processedData.last_updated,
          units: processedData.units,
          frequency: processedData.frequency,
          latest_value: latest.value !== null ? latest.value : 0,
          date: latest.date
        };
        
        const latestKey = `${SERIES_LATEST_CACHE_PREFIX}${seriesId}`;
        await setCache(latestKey, JSON.stringify(latestData), 86400, env); // 24 hours TTL
      }
      
      // Clear derived caches (transformed versions, etc.)
      await clearDerivedCaches(seriesId, env);
      
      results.updated.push(seriesId);
    } catch (error) {
      results.failed.push({
        seriesId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Update the last update timestamp
  await setCache(lastUpdateKey, new Date().toISOString(), 31536000, env); // 1 year TTL
  
  return results;
}

/**
 * Clear derived caches for a series
 * @param seriesId - FRED series ID
 * @param env - The environment variables and bindings
 */
async function clearDerivedCaches(seriesId: string, env: Env): Promise<void> {
  // In Cloudflare KV, we can't easily list keys with a prefix
  // This is a placeholder for a more sophisticated implementation
  // that would track and clear derived caches
  
  // For a real implementation, consider:
  // 1. Maintaining a registry of derived keys for each series
  // 2. Or using a pattern in derived keys that allows for bulk deletion
}

/**
 * Force update for a specific indicator
 * @param seriesId - FRED series ID
 * @param env - The environment variables and bindings
 * @returns Update result
 */
export async function forceUpdateIndicator(
  seriesId: string,
  env: Env
): Promise<{
  status: string;
  seriesId: string;
  timestamp: string;
  title?: string;
  last_updated?: string;
  error?: string;
}> {
  try {
    // Fetch fresh data from FRED API
    const fredData = await fetchFredSeries(seriesId, {}, env);
    
    // Process the data
    const processedData = processTimeSeriesData(fredData, {});
    
    // Update series data cache
    const seriesKey = `${SERIES_DATA_CACHE_PREFIX}${seriesId}`;
    await setCache(seriesKey, JSON.stringify(processedData), 86400, env); // 24 hours TTL
    
    // Update latest data point cache
    if (processedData.observations && processedData.observations.length > 0) {
      const latest = processedData.observations[processedData.observations.length - 1];
      const latestData = {
        series_id: seriesId,
        title: processedData.title,
        last_updated: processedData.last_updated,
        units: processedData.units,
        frequency: processedData.frequency,
        latest_value: latest.value !== null ? latest.value : 0,
        date: latest.date
      };
      
      const latestKey = `${SERIES_LATEST_CACHE_PREFIX}${seriesId}`;
      await setCache(latestKey, JSON.stringify(latestData), 86400, env); // 24 hours TTL
    }
    
    // Clear derived caches
    await clearDerivedCaches(seriesId, env);
    
    return {
      status: 'success',
      seriesId,
      timestamp: new Date().toISOString(),
      title: processedData.title,
      last_updated: processedData.last_updated
    };
  } catch (error) {
    return {
      status: 'error',
      seriesId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
