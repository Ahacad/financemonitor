/**
 * Dashboard API Handler
 * Handles requests for predefined dashboard configurations
 */

import { getFromCache, setCache } from '../utils/cache';
import { getSeriesData } from './series';
import { ApiError } from './router';
import { Dashboard, DashboardConfig, DashboardSeries, DashboardSeriesData, Env } from '../types';

// Cache key prefix for dashboards
const DASHBOARD_CACHE_PREFIX = 'dashboard:';

// TTL for dashboard data (4 hours)
const DASHBOARD_CACHE_TTL = 14400;

// Predefined dashboard configurations
const DASHBOARD_CONFIGS: Record<string, DashboardConfig> = {
  'overview': {
    title: 'Economic Overview',
    description: 'Key indicators across all categories',
    series: [
      { id: 'GDPC1', transformation: 'pct_change_yoy' },
      { id: 'CPIAUCSL', transformation: 'pct_change_yoy' },
      { id: 'UNRATE', transformation: 'none' },
      { id: 'FEDFUNDS', transformation: 'none' },
      { id: 'GS10', transformation: 'none' },
      { id: 'T10Y2Y', transformation: 'none' }
    ]
  },
  'inflation': {
    title: 'Inflation Dashboard',
    description: 'Comprehensive inflation metrics',
    series: [
      { id: 'CPIAUCSL', transformation: 'pct_change_yoy' },
      { id: 'CPILFESL', transformation: 'pct_change_yoy' },
      { id: 'PCEPI', transformation: 'pct_change_yoy' },
      { id: 'PCEPILFE', transformation: 'pct_change_yoy' },
      { id: 'PPIACO', transformation: 'pct_change_yoy' }
    ]
  },
  'employment': {
    title: 'Labor Market Dashboard',
    description: 'Key employment and labor market indicators',
    series: [
      { id: 'UNRATE', transformation: 'none' },
      { id: 'PAYEMS', transformation: 'pct_change_yoy' },
      { id: 'ICSA', transformation: '4_week_moving_avg' },
      { id: 'CIVPART', transformation: 'none' },
      { id: 'JTSJOL', transformation: 'none' }
    ]
  },
  'financial': {
    title: 'Financial Conditions Dashboard',
    description: 'Interest rates and financial market indicators',
    series: [
      { id: 'FEDFUNDS', transformation: 'none' },
      { id: 'GS10', transformation: 'none' },
      { id: 'T10Y2Y', transformation: 'none' },
      { id: 'BAA10Y', transformation: 'none' },
      { id: 'M2SL', transformation: 'pct_change_yoy' }
    ]
  },
  'housing': {
    title: 'Housing Market Dashboard',
    description: 'Housing market indicators',
    series: [
      { id: 'CSUSHPISA', transformation: 'pct_change_yoy' },
      { id: 'HOUST', transformation: 'none' },
      { id: 'MORTGAGE30US', transformation: 'none' },
      { id: 'PERMIT', transformation: 'none' }
    ]
  }
};

/**
 * Get dashboard data for a specific dashboard configuration
 * @param dashboardId - The dashboard identifier
 * @param env - The environment variables and bindings
 * @returns The dashboard data
 */
export async function getDashboardData(dashboardId: string, env: Env): Promise<Dashboard> {
  // Validate dashboard ID
  if (!DASHBOARD_CONFIGS[dashboardId]) {
    throw new ApiError(`Invalid dashboard ID: ${dashboardId}`, 400);
  }
  
  // Try to get from cache first
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}${dashboardId}`;
  const cachedData = await getFromCache(cacheKey, env);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // If not in cache, fetch data for each series in the dashboard
  try {
    const dashboardConfig = DASHBOARD_CONFIGS[dashboardId];
    const seriesPromises = dashboardConfig.series.map(async (series) => {
      // Define parameters based on series configuration
      const params = {
        transformation: series.transformation,
        // Default to 5 years of data
        start_date: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        ...series.params // Apply any additional parameters from the config
      };
      
      // Fetch the series data
      const data = await getSeriesData(series.id, params, env);
      
      return {
        id: series.id,
        title: data.title,
        units: data.units,
        frequency: data.frequency,
        last_updated: data.last_updated,
        observations: data.observations,
        transformation: series.transformation
      } as DashboardSeriesData;
    });
    
    // Wait for all series data to be fetched
    const seriesData = await Promise.all(seriesPromises);
    
    // Construct the dashboard result
    const result: Dashboard = {
      id: dashboardId,
      title: dashboardConfig.title,
      description: dashboardConfig.description,
      last_updated: new Date().toISOString(),
      series: seriesData
    };
    
    // Cache the result
    await setCache(cacheKey, JSON.stringify(result), DASHBOARD_CACHE_TTL, env);
    
    return result;
  } catch (error) {
    throw new ApiError(`Failed to fetch dashboard data for ${dashboardId}: ${error instanceof Error ? error.message : String(error)}`, 500);
  }
}

/**
 * Get all available dashboard configurations
 * @returns Available dashboard configurations
 */
export async function getAvailableDashboards(): Promise<{
  dashboards: Array<{
    id: string;
    title: string;
    description: string;
    series_count: number;
  }>;
  count: number;
}> {
  const dashboards = Object.entries(DASHBOARD_CONFIGS).map(([id, config]) => ({
    id,
    title: config.title,
    description: config.description,
    series_count: config.series.length
  }));
  
  return {
    dashboards,
    count: dashboards.length
  };
}
