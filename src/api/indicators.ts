/**
 * Indicators API Handler
 * Handles requests related to economic indicators metadata
 */

import { getFromCache, setCache } from '../utils/cache';
import { CategoryIndicators, Env, Indicator, IndicatorsList } from '../types';
import { ApiError } from './router';

// Cache keys
const INDICATORS_LIST_CACHE_KEY = 'indicators:list';
const INDICATORS_CATEGORY_CACHE_PREFIX = 'indicators:category:';

// Define indicator categories and their indicators
const INDICATOR_CATEGORIES: Record<string, Indicator[]> = {
  growth: [
    { id: 'GDPC1', name: 'Real GDP', frequency: 'Quarterly', units: 'Billions of Chained 2017 Dollars' },
    { id: 'INDPRO', name: 'Industrial Production Index', frequency: 'Monthly', units: 'Index 2017=100' },
    { id: 'RSXFS', name: 'Retail Sales', frequency: 'Monthly', units: 'Millions of Dollars' },
    { id: 'PCE', name: 'Personal Consumption Expenditures', frequency: 'Monthly', units: 'Billions of Dollars' },
  ],
  inflation: [
    { id: 'CPIAUCSL', name: 'Consumer Price Index', frequency: 'Monthly', units: 'Index 1982-1984=100' },
    { id: 'CPILFESL', name: 'Core CPI', frequency: 'Monthly', units: 'Index 1982-1984=100' },
    { id: 'PCEPI', name: 'PCE Price Index', frequency: 'Monthly', units: 'Index 2017=100' },
    { id: 'PCEPILFE', name: 'Core PCE Price Index', frequency: 'Monthly', units: 'Index 2017=100' },
    { id: 'PPIACO', name: 'Producer Price Index', frequency: 'Monthly', units: 'Index 1982=100' },
  ],
  labor: [
    { id: 'UNRATE', name: 'Unemployment Rate', frequency: 'Monthly', units: 'Percent' },
    { id: 'PAYEMS', name: 'Nonfarm Payrolls', frequency: 'Monthly', units: 'Thousands of Persons' },
    { id: 'ICSA', name: 'Initial Jobless Claims', frequency: 'Weekly', units: 'Number' },
    { id: 'CIVPART', name: 'Labor Force Participation Rate', frequency: 'Monthly', units: 'Percent' },
    { id: 'JTSJOL', name: 'Job Openings', frequency: 'Monthly', units: 'Thousands' },
  ],
  leading: [
    { id: 'T10Y2Y', name: '10Y-2Y Treasury Spread', frequency: 'Daily', units: 'Percentage Points' },
    { id: 'PERMIT', name: 'Building Permits', frequency: 'Monthly', units: 'Thousands of Units' },
    { id: 'UMCSENT', name: 'Consumer Sentiment', frequency: 'Monthly', units: 'Index 1966:Q1=100' },
    { id: 'NAPM', name: 'ISM Manufacturing PMI', frequency: 'Monthly', units: 'Index' },
  ],
  financial: [
    { id: 'FEDFUNDS', name: 'Federal Funds Rate', frequency: 'Monthly', units: 'Percent' },
    { id: 'GS10', name: '10-Year Treasury Yield', frequency: 'Daily', units: 'Percent' },
    { id: 'BAA10Y', name: 'Baa Corporate Bond Spread', frequency: 'Daily', units: 'Percentage Points' },
    { id: 'M2SL', name: 'M2 Money Supply', frequency: 'Monthly', units: 'Billions of Dollars' },
  ],
  housing: [
    { id: 'CSUSHPISA', name: 'Case-Shiller Home Price Index', frequency: 'Monthly', units: 'Index Jan 2000=100' },
    { id: 'HOUST', name: 'Housing Starts', frequency: 'Monthly', units: 'Thousands of Units' },
    { id: 'MORTGAGE30US', name: '30-Year Fixed Rate Mortgage Average', frequency: 'Weekly', units: 'Percent' },
  ],
};

/**
 * Get a list of all economic indicators
 * @param env - The environment variables and bindings
 * @returns List of all indicators with metadata
 */
export async function getIndicatorsList(env: Env): Promise<IndicatorsList> {
  // Try to get from cache first
  const cachedData = await getFromCache(INDICATORS_LIST_CACHE_KEY, env);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // If not in cache, compile the list from categories
  const allIndicators: IndicatorsList = {
    indicators: [],
    categories: Object.keys(INDICATOR_CATEGORIES),
    count: 0
  };
  
  // Flatten all indicators and add category information
  for (const [category, indicators] of Object.entries(INDICATOR_CATEGORIES)) {
    for (const indicator of indicators) {
      allIndicators.indicators.push({
        ...indicator,
        category
      });
    }
  }
  
  allIndicators.count = allIndicators.indicators.length;
  
  // Cache the result (24 hours TTL)
  await setCache(INDICATORS_LIST_CACHE_KEY, JSON.stringify(allIndicators), 86400, env);
  
  return allIndicators;
}

/**
 * Get indicators for a specific category
 * @param category - The category name
 * @param env - The environment variables and bindings
 * @returns Indicators in the specified category
 */
export async function getIndicatorsByCategory(category: string, env: Env): Promise<CategoryIndicators> {
  // Validate the category
  if (!INDICATOR_CATEGORIES[category]) {
    throw new ApiError(`Invalid category: ${category}`, 400);
  }
  
  // Try to get from cache first
  const cacheKey = `${INDICATORS_CATEGORY_CACHE_PREFIX}${category}`;
  const cachedData = await getFromCache(cacheKey, env);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  // If not in cache, get the indicators for this category
  const result: CategoryIndicators = {
    category,
    indicators: INDICATOR_CATEGORIES[category],
    count: INDICATOR_CATEGORIES[category].length
  };
  
  // Cache the result (24 hours TTL)
  await setCache(cacheKey, JSON.stringify(result), 86400, env);
  
  return result;
}
