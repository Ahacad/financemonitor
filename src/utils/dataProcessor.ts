/**
 * Data Processor Utility
 * Handles transformation and processing of time series data
 */

import { FredSeries, Observation, SeriesDataParams } from '../types';

/**
 * Process time series data with optional transformations
 * @param data - Raw time series data
 * @param params - Processing parameters
 * @returns Processed data
 */
export function processTimeSeriesData(data: FredSeries, params: SeriesDataParams = {}): FredSeries {
  if (!data || !data.observations || data.observations.length === 0) {
    return { ...data, observations: [] };
  }
  
  // Make a deep copy of the data to avoid modifying the original
  const processedData = JSON.parse(JSON.stringify(data)) as FredSeries;
  let observations = [...processedData.observations];
  
  // Apply frequency transformation if requested
  if (params.frequency) {
    observations = transformFrequency(observations, params.frequency, data.frequency_short);
  }
  
  // Apply units transformation if requested
  if (params.units) {
    observations = transformUnits(observations, data.units, params.units);
  }
  
  // Apply data transformation if requested
  if (params.transformation) {
    observations = applyTransformation(observations, params.transformation);
  }
  
  // Apply date range filter if requested
  if (params.start_date || params.end_date) {
    observations = filterByDateRange(observations, params.start_date, params.end_date);
  }
  
  // Apply limit if requested
  if (params.limit && params.limit > 0) {
    observations = observations.slice(-params.limit);
  }
  
  // Update the processed data with the transformed observations
  processedData.observations = observations;
  
  // Add transformation metadata
  if (params.transformation) {
    processedData.transformation = params.transformation;
  }
  
  if (params.frequency) {
    processedData.frequency = params.frequency;
  }
  
  if (params.units) {
    processedData.units = params.units;
  }
  
  return processedData;
}

/**
 * Apply a transformation to time series observations
 * @param observations - Time series observations
 * @param transformation - Type of transformation to apply
 * @returns Transformed observations
 */
function applyTransformation(observations: Observation[], transformation: string): Observation[] {
  switch (transformation) {
    case 'pct_change':
      return calculatePercentageChange(observations);
      
    case 'pct_change_yoy':
      return calculateYoYPercentageChange(observations);
      
    case 'diff':
      return calculateDifference(observations);
      
    case 'log':
      return calculateLogTransform(observations);
      
    case 'moving_avg':
    case '3_period_moving_avg':
      return calculateMovingAverage(observations, 3);
      
    case '6_period_moving_avg':
      return calculateMovingAverage(observations, 6);
      
    case '12_period_moving_avg':
      return calculateMovingAverage(observations, 12);
      
    case '4_week_moving_avg':
      return calculateMovingAverage(observations, 4);
      
    case 'cumulative_sum':
      return calculateCumulativeSum(observations);
      
    case 'normalize':
      return normalizeValues(observations);
      
    case 'none':
    default:
      return observations;
  }
}

/**
 * Calculate period-over-period percentage change
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function calculatePercentageChange(observations: Observation[]): Observation[] {
  return observations.map((obs, index) => {
    if (index === 0) {
      return { ...obs, value: null }; // First observation has no previous value
    }
    
    const previousValue = observations[index - 1].value;
    
    if (previousValue === null || previousValue === 0) {
      return { ...obs, value: null }; // Avoid division by zero
    }
    
    const percentChange = ((obs.value !== null ? obs.value : 0) - previousValue) / previousValue * 100;
    return { ...obs, value: percentChange };
  });
}

/**
 * Calculate year-over-year percentage change
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function calculateYoYPercentageChange(observations: Observation[]): Observation[] {
  // Create a map of dates to values for easy lookup
  const dateMap = new Map<string, { date: string; value: number | null }>();
  observations.forEach(obs => {
    const date = new Date(obs.date);
    dateMap.set(`${date.getMonth()}-${date.getDate()}`, { date: obs.date, value: obs.value });
  });
  
  return observations.map(obs => {
    const date = new Date(obs.date);
    const prevYear = date.getFullYear() - 1;
    date.setFullYear(prevYear);
    
    // Check if we have data for the same day/month in the previous year
    const prevYearKey = `${date.getMonth()}-${date.getDate()}`;
    const prevYearData = dateMap.get(prevYearKey);
    
    if (!prevYearData || prevYearData.value === null || prevYearData.value === 0) {
      return { ...obs, value: null }; // No previous year data or value is zero
    }
    
    const percentChange = ((obs.value !== null ? obs.value : 0) - prevYearData.value) / prevYearData.value * 100;
    return { ...obs, value: percentChange };
  });
}

/**
 * Calculate difference between consecutive observations
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function calculateDifference(observations: Observation[]): Observation[] {
  return observations.map((obs, index) => {
    if (index === 0) {
      return { ...obs, value: null }; // First observation has no previous value
    }
    
    const previousValue = observations[index - 1].value;
    
    if (previousValue === null || obs.value === null) {
      return { ...obs, value: null };
    }
    
    const difference = obs.value - previousValue;
    return { ...obs, value: difference };
  });
}

/**
 * Calculate logarithm of values
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function calculateLogTransform(observations: Observation[]): Observation[] {
  return observations.map(obs => {
    if (obs.value === null || obs.value <= 0) {
      return { ...obs, value: null }; // Log of non-positive values is undefined
    }
    
    return { ...obs, value: Math.log(obs.value) };
  });
}

/**
 * Calculate moving average
 * @param observations - Time series observations
 * @param periods - Number of periods for the moving average
 * @returns Transformed observations
 */
function calculateMovingAverage(observations: Observation[], periods: number): Observation[] {
  return observations.map((obs, index) => {
    if (index < periods - 1) {
      return { ...obs, value: null }; // Not enough previous periods
    }
    
    // Calculate the sum of the current and previous periods
    let sum = 0;
    let validValues = 0;
    
    for (let i = 0; i < periods; i++) {
      const value = observations[index - i].value;
      if (value !== null) {
        sum += value;
        validValues++;
      }
    }
    
    // If we don't have enough valid values, return null
    if (validValues === 0) {
      return { ...obs, value: null };
    }
    
    const average = sum / validValues;
    return { ...obs, value: average };
  });
}

/**
 * Calculate cumulative sum
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function calculateCumulativeSum(observations: Observation[]): Observation[] {
  let sum = 0;
  
  return observations.map(obs => {
    if (obs.value === null) {
      return { ...obs };
    }
    
    sum += obs.value;
    return { ...obs, value: sum };
  });
}

/**
 * Normalize values (0-1 scale)
 * @param observations - Time series observations
 * @returns Transformed observations
 */
function normalizeValues(observations: Observation[]): Observation[] {
  // Find min and max values
  const values = observations
    .map(obs => obs.value)
    .filter((value): value is number => value !== null);
  
  if (values.length === 0) {
    return observations;
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // If min equals max, all values are the same
  if (min === max) {
    return observations.map(obs => {
      return { ...obs, value: obs.value !== null ? 1 : null };
    });
  }
  
  // Normalize values to 0-1 range
  return observations.map(obs => {
    if (obs.value === null) {
      return { ...obs };
    }
    
    const normalizedValue = (obs.value - min) / (max - min);
    return { ...obs, value: normalizedValue };
  });
}

/**
 * Filter observations by date range
 * @param observations - Time series observations
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Filtered observations
 */
function filterByDateRange(
  observations: Observation[], 
  startDate?: string, 
  endDate?: string
): Observation[] {
  return observations.filter(obs => {
    if (startDate && obs.date < startDate) {
      return false;
    }
    
    if (endDate && obs.date > endDate) {
      return false;
    }
    
    return true;
  });
}

/**
 * Transform data frequency
 * @param observations - Time series observations
 * @param targetFrequency - Target frequency
 * @param sourceFrequency - Source frequency
 * @returns Transformed observations
 */
function transformFrequency(
  observations: Observation[], 
  targetFrequency: string, 
  sourceFrequency?: string
): Observation[] {
  // This is a complex operation that depends on the specific frequencies
  // For now, we'll implement a simple version that handles common cases
  
  // Special case: If source and target frequencies are the same, no transformation needed
  if (targetFrequency === sourceFrequency) {
    return observations;
  }
  
  // Handle common transformations
  switch (`${sourceFrequency}_to_${targetFrequency}`) {
    // Daily to Monthly (take the last day of each month)
    case 'D_to_M':
      return aggregateToMonthly(observations, 'last');
      
    // Daily to Quarterly (take the last day of each quarter)
    case 'D_to_Q':
      return aggregateToQuarterly(observations, 'last');
      
    // Monthly to Quarterly (take the last month of each quarter)
    case 'M_to_Q':
      return aggregateMonthlyToQuarterly(observations, 'last');
      
    // Monthly to Annual (take the last month of each year)
    case 'M_to_A':
      return aggregateMonthlyToAnnual(observations, 'last');
      
    // Quarterly to Annual (take the last quarter of each year)
    case 'Q_to_A':
      return aggregateQuarterlyToAnnual(observations, 'last');
      
    // For other conversions, return the original data
    default:
      return observations;
  }
}

/**
 * Transform data units
 * @param observations - Time series observations
 * @param sourceUnits - Source units
 * @param targetUnits - Target units
 * @returns Transformed observations
 */
function transformUnits(
  observations: Observation[], 
  sourceUnits: string, 
  targetUnits: string
): Observation[] {
  // This is a complex operation that depends on the specific units
  // For now, we'll implement a simple version that handles common cases
  
  // Special case: If source and target units are the same, no transformation needed
  if (targetUnits === sourceUnits) {
    return observations;
  }
  
  // Handle common transformations
  switch (`${sourceUnits}_to_${targetUnits}`) {
    // Billions to Millions
    case 'Billions of Dollars_to_Millions of Dollars':
      return observations.map(obs => {
        return { ...obs, value: obs.value !== null ? obs.value * 1000 : null };
      });
      
    // Millions to Billions
    case 'Millions of Dollars_to_Billions of Dollars':
      return observations.map(obs => {
        return { ...obs, value: obs.value !== null ? obs.value / 1000 : null };
      });
      
    // Thousands to Millions
    case 'Thousands_to_Millions':
      return observations.map(obs => {
        return { ...obs, value: obs.value !== null ? obs.value / 1000 : null };
      });
      
    // Percent to Decimal
    case 'Percent_to_Decimal':
      return observations.map(obs => {
        return { ...obs, value: obs.value !== null ? obs.value / 100 : null };
      });
      
    // Decimal to Percent
    case 'Decimal_to_Percent':
      return observations.map(obs => {
        return { ...obs, value: obs.value !== null ? obs.value * 100 : null };
      });
      
    // For other conversions, return the original data
    default:
      return observations;
  }
}

/**
 * Aggregate daily data to monthly
 * @param observations - Daily observations
 * @param method - Aggregation method ('first', 'last', 'avg', 'sum')
 * @returns Monthly observations
 */
function aggregateToMonthly(
  observations: Observation[], 
  method: 'first' | 'last' | 'avg' | 'sum' = 'last'
): Observation[] {
  const monthlyData = new Map<string, Observation[]>();
  
  // Group observations by year-month
  observations.forEach(obs => {
    const date = new Date(obs.date);
    const yearMonth = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!monthlyData.has(yearMonth)) {
      monthlyData.set(yearMonth, []);
    }
    
    monthlyData.get(yearMonth)?.push(obs);
  });
  
  // Aggregate each month's data
  const result: Observation[] = [];
  
  monthlyData.forEach((monthObservations, yearMonth) => {
    // Sort by date
    monthObservations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let value: number | null = null;
    let date: string = '';
    
    switch (method) {
      case 'first':
        value = monthObservations[0].value;
        date = monthObservations[0].date;
        break;
        
      case 'last':
        value = monthObservations[monthObservations.length - 1].value;
        date = monthObservations[monthObservations.length - 1].date;
        break;
        
      case 'avg':
        const validValues = monthObservations
          .map(obs => obs.value)
          .filter((value): value is number => value !== null);
          
        if (validValues.length > 0) {
          value = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        }
        
        date = monthObservations[monthObservations.length - 1].date;
        break;
        
      case 'sum':
        value = monthObservations
          .map(obs => obs.value)
          .filter((value): value is number => value !== null)
          .reduce((sum, val) => sum + val, 0);
          
        date = monthObservations[monthObservations.length - 1].date;
        break;
    }
    
    result.push({ date, value });
  });
  
  // Sort by date
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return result;
}

/**
 * Aggregate daily data to quarterly
 * @param observations - Daily observations
 * @param method - Aggregation method ('first', 'last', 'avg', 'sum')
 * @returns Quarterly observations
 */
function aggregateToQuarterly(
  observations: Observation[], 
  method: 'first' | 'last' | 'avg' | 'sum' = 'last'
): Observation[] {
  const quarterlyData = new Map<string, Observation[]>();
  
  // Group observations by year-quarter
  observations.forEach(obs => {
    const date = new Date(obs.date);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const yearQuarter = `${date.getFullYear()}-Q${quarter}`;
    
    if (!quarterlyData.has(yearQuarter)) {
      quarterlyData.set(yearQuarter, []);
    }
    
    quarterlyData.get(yearQuarter)?.push(obs);
  });
  
  // Aggregate each quarter's data
  return aggregateGroupedData(quarterlyData, method);
}

/**
 * Aggregate monthly data to quarterly
 * @param observations - Monthly observations
 * @param method - Aggregation method
 * @returns Quarterly observations
 */
function aggregateMonthlyToQuarterly(
  observations: Observation[], 
  method: 'first' | 'last' | 'avg' | 'sum' = 'last'
): Observation[] {
  const quarterlyData = new Map<string, Observation[]>();
  
  // Group observations by year-quarter
  observations.forEach(obs => {
    const date = new Date(obs.date);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const yearQuarter = `${date.getFullYear()}-Q${quarter}`;
    
    if (!quarterlyData.has(yearQuarter)) {
      quarterlyData.set(yearQuarter, []);
    }
    
    quarterlyData.get(yearQuarter)?.push(obs);
  });
  
  // Aggregate each quarter's data using the same method as daily to monthly
  return aggregateGroupedData(quarterlyData, method);
}

/**
 * Aggregate monthly data to annual
 * @param observations - Monthly observations
 * @param method - Aggregation method
 * @returns Annual observations
 */
function aggregateMonthlyToAnnual(
  observations: Observation[], 
  method: 'first' | 'last' | 'avg' | 'sum' = 'last'
): Observation[] {
  const annualData = new Map<string, Observation[]>();
  
  // Group observations by year
  observations.forEach(obs => {
    const date = new Date(obs.date);
    const year = date.getFullYear().toString();
    
    if (!annualData.has(year)) {
      annualData.set(year, []);
    }
    
    annualData.get(year)?.push(obs);
  });
  
  // Aggregate each year's data
  return aggregateGroupedData(annualData, method);
}

/**
 * Aggregate quarterly data to annual
 * @param observations - Quarterly observations
 * @param method - Aggregation method
 * @returns Annual observations
 */
function aggregateQuarterlyToAnnual(
  observations: Observation[], 
  method: 'first' | 'last' | 'avg' | 'sum' = 'last'
): Observation[] {
  const annualData = new Map<string, Observation[]>();
  
  // Group observations by year
  observations.forEach(obs => {
    const date = new Date(obs.date);
    const year = date.getFullYear().toString();
    
    if (!annualData.has(year)) {
      annualData.set(year, []);
    }
    
    annualData.get(year)?.push(obs);
  });
  
  // Aggregate each year's data
  return aggregateGroupedData(annualData, method);
}

/**
 * Helper function to aggregate grouped data
 * @param groupedData - Map of grouped observations
 * @param method - Aggregation method
 * @returns Aggregated observations
 */
function aggregateGroupedData(
  groupedData: Map<string, Observation[]>, 
  method: 'first' | 'last' | 'avg' | 'sum'
): Observation[] {
  const result: Observation[] = [];
  
  groupedData.forEach((groupObservations, groupKey) => {
    // Sort by date
    groupObservations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let value: number | null = null;
    let date: string = '';
    
    switch (method) {
      case 'first':
        value = groupObservations[0].value;
        date = groupObservations[0].date;
        break;
        
      case 'last':
        value = groupObservations[groupObservations.length - 1].value;
        date = groupObservations[groupObservations.length - 1].date;
        break;
        
      case 'avg':
        const validValues = groupObservations
          .map(obs => obs.value)
          .filter((value): value is number => value !== null);
          
        if (validValues.length > 0) {
          value = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        }
        
        date = groupObservations[groupObservations.length - 1].date;
        break;
        
      case 'sum':
        value = groupObservations
          .map(obs => obs.value)
          .filter((value): value is number => value !== null)
          .reduce((sum, val) => sum + val, 0);
          
        date = groupObservations[groupObservations.length - 1].date;
        break;
    }
    
    result.push({ date, value });
  });
  
  // Sort by date
  result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return result;
}
