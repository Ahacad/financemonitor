/**
 * Economic Indicators Monitoring System
 * Main Worker Entry Point
 */

import { handleApiRequest } from './api/router';
import { handleCorsHeaders } from './utils/cors';
import { Env } from './types';

// Define the main event listener for the worker
export default {
  // Handle fetch events
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return handleCorsHeaders(new Response(null, { status: 204 }));
    }

    try {
      // Parse the URL to determine the endpoint
      const url = new URL(request.url);
      
      // API routes handling
      if (url.pathname.startsWith('/api/')) {
        return handleApiRequest(request, env);
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
    try {
      // Determine which indicators to update based on the cron pattern
      const updatePattern = event.cron;
      
      // Daily updates
      if (updatePattern === '0 0 * * *') {
        await updateDailyIndicators(env);
      } 
      // Weekly updates
      else if (updatePattern === '0 0 * * 1') {
        await updateWeeklyIndicators(env);
      }
      // Monthly updates
      else if (updatePattern === '0 0 1 * *') {
        await updateMonthlyIndicators(env);
      }
      // Quarterly updates
      else if (updatePattern.includes('0 0 1 1,4,7,10 *')) {
        await updateQuarterlyIndicators(env);
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
