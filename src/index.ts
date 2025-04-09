/**
 * Economic Indicators Monitoring System
 * Main Worker Entry Point
 */

import { handleApiRequest } from './api/router';
import { handleCorsHeaders } from './utils/cors';
import { createSafeEnv } from './utils/safe-env';
import { Env } from './types';

// Define the main event listener for the worker
export default {
  // Handle fetch events
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Create a safe environment that won't throw errors even if KV is missing
    const safeEnv = createSafeEnv(env);
    
    // Debug logging
    console.log(`[Worker DEBUG] fetch handler called with env: ${env ? 'defined' : 'undefined'}`);
    console.log(`[Worker DEBUG] env keys: ${env ? Object.keys(env).join(', ') : 'env is undefined'}`);
    console.log(`[Worker DEBUG] ECONOMIC_DATA exists: ${env && env.ECONOMIC_DATA ? 'Yes' : 'No'}`);
    console.log(`[Worker DEBUG] FRED_API_KEY exists: ${env && env.FRED_API_KEY ? 'Yes' : 'No'}`);
    
    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return handleCorsHeaders(new Response(null, { status: 204 }));
    }

    try {
      // Parse the URL to determine the endpoint
      const url = new URL(request.url);
      
      // API routes handling
      if (url.pathname.startsWith('/api/')) {
        console.log(`[Worker DEBUG] Calling handleApiRequest with safeEnv`);
        return handleApiRequest(request, safeEnv);
      }

      // Default response for non-matching routes
      return handleCorsHeaders(new Response('Not found', { status: 404 }));
    } catch (error) {
      // Error handling
      console.error(`Worker error: ${error instanceof Error ? error.message : String(error)}`);
      return handleCorsHeaders(new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Internal server error' 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      ));
    }
  },

  // Handle scheduled events
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Create a safe environment that won't throw errors even if KV is missing
    const safeEnv = createSafeEnv(env);
    
    try {
      // Debug logging
      console.log(`[Worker DEBUG] scheduled handler called with env: ${env ? 'defined' : 'undefined'}`);
      console.log(`[Worker DEBUG] env keys: ${env ? Object.keys(env).join(', ') : 'env is undefined'}`);
      
      // Determine which indicators to update based on the cron pattern
      const updatePattern = event.cron;
      
      // Daily updates
      if (updatePattern === '0 0 * * *') {
        await updateDailyIndicators(safeEnv);
      } 
      // Weekly updates
      else if (updatePattern === '0 0 * * 1') {
        await updateWeeklyIndicators(safeEnv);
      }
      // Monthly updates
      else if (updatePattern === '0 0 1 * *') {
        await updateMonthlyIndicators(safeEnv);
      }
      // Quarterly updates
      else if (updatePattern.includes('0 0 1 1,4,7,10 *')) {
        await updateQuarterlyIndicators(safeEnv);
      }
      
      console.log(`Completed scheduled update: ${updatePattern}`);
    } catch (error) {
      console.error(`Scheduled update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

/**
 * Update indicators that change daily
 */
async function updateDailyIndicators(env: Env): Promise<void> {
  // Import dynamically to avoid loading these modules for regular requests
  const { updateFinancialIndicators } = await import('./services/indicators');
  await updateFinancialIndicators(env);
}

/**
 * Update indicators that change weekly
 */
async function updateWeeklyIndicators(env: Env): Promise<void> {
  const { updateWeeklyEconomicIndicators } = await import('./services/indicators');
  await updateWeeklyEconomicIndicators(env);
}

/**
 * Update indicators that change monthly
 */
async function updateMonthlyIndicators(env: Env): Promise<void> {
  const { updateMonthlyEconomicIndicators } = await import('./services/indicators');
  await updateMonthlyEconomicIndicators(env);
}

/**
 * Update indicators that change quarterly
 */
async function updateQuarterlyIndicators(env: Env): Promise<void> {
  const { updateQuarterlyEconomicIndicators } = await import('./services/indicators');
  await updateQuarterlyEconomicIndicators(env);
}
