/**
 * Global type definitions for the Economic Indicators Monitoring System
 */

// Environment bindings for Cloudflare Workers
export interface Env {
  ECONOMIC_DATA: KVNamespace;
  FRED_API_KEY: string;
}

// Economic Indicator metadata
export interface Indicator {
  id: string;
  name: string;
  frequency: string;
  units: string;
  category?: string;
}

// FRED API Series data
export interface FredSeries {
  id: string;
  title: string;
  units: string;
  frequency: string;
  frequency_short: string;
  seasonal_adjustment: string;
  seasonal_adjustment_short: string;
  last_updated: string;
  notes: string;
  observations: Observation[];
  // Added optional properties that may be added during processing
  transformation?: string;
}

// Single time series observation
export interface Observation {
  date: string;
  value: number | null;
  status?: string;
}

// Dashboard configuration
export interface DashboardConfig {
  title: string;
  description: string;
  series: DashboardSeries[];
}

// Series configuration for a dashboard
export interface DashboardSeries {
  id: string;
  transformation?: string;
  params?: Record<string, any>;
}

// Processed dashboard data
export interface Dashboard {
  id: string;
  title: string;
  description: string;
  last_updated: string;
  series: DashboardSeriesData[];
}

// Processed series data for a dashboard
export interface DashboardSeriesData {
  id: string;
  title: string;
  units: string;
  frequency: string;
  last_updated: string;
  observations: Observation[];
  transformation?: string;
}

// Result of indicator list request
export interface IndicatorsList {
  indicators: Indicator[];
  categories: string[];
  count: number;
}

// Result of indicators by category request
export interface CategoryIndicators {
  category: string;
  indicators: Indicator[];
  count: number;
}

// Parameters for series data requests
export interface SeriesDataParams {
  frequency?: string;
  units?: string;
  transformation?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  sort_order?: 'asc' | 'desc';
}

// Latest data point for a series
export interface LatestDataPoint {
  series_id: string;
  title: string;
  last_updated: string;
  units: string;
  frequency: string;
  latest_value: number;
  date: string;
}

// Update results for scheduled indicator updates
export interface UpdateResults {
  frequency: string;
  updated: string[];
  failed: { seriesId: string; error: string }[];
  timestamp: string;
}

// Recession period
export interface RecessionPeriod {
  start: string;
  end: string;
}
