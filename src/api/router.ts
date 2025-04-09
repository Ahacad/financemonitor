/**
 * API Router
 * Handles routing of API requests to the appropriate handler
 */

import { handleCorsHeaders } from '../utils/cors';
import { getIndicatorsList, getIndicatorsByCategory } from './indicators';
import { getSeriesData, getLatestDataPoint } from './series';
import { getDashboardData } from './dashboard';
import { Env } from '../types';

/**
 * Route API requests to the appropriate handler
 * @param request - The incoming request
 * @param env - The environment variables and bindings
 * @returns The response
 */
export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  // Debug logging
  console.log(`[Router DEBUG] handleApiRequest: env exists: ${env ? 'Yes' : 'No'}`);
  console.log(`[Router DEBUG] env keys: ${env ? Object.keys(env).join(', ') : 'env is undefined'}`);
  console.log(`[Router DEBUG] ECONOMIC_DATA exists: ${env && env.ECONOMIC_DATA ? 'Yes' : 'No'}`);
  console.log(`[Router DEBUG] FRED_API_KEY exists: ${env && env.FRED_API_KEY ? 'Yes' : 'No'}`);
  
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const segments = path.split('/').filter(Boolean);
  
  // Handle different API endpoints
  try {
    let response: Response;
    
    // GET /api/indicators - List all indicators
    if (path === 'indicators' && request.method === 'GET') {
      console.log(`[Router DEBUG] Calling getIndicatorsList with env: ${env ? 'Yes' : 'No'}`);
      const data = await getIndicatorsList(env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/indicators/:category - Get indicators by category
    else if (segments[0] === 'indicators' && segments.length === 2 && request.method === 'GET') {
      const category = segments[1];
      console.log(`[Router DEBUG] Calling getIndicatorsByCategory with env: ${env ? 'Yes' : 'No'}`);
      const data = await getIndicatorsByCategory(category, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/data/:seriesId - Get time series data
    else if (segments[0] === 'data' && segments.length === 2 && request.method === 'GET') {
      const seriesId = segments[1];
      const params = Object.fromEntries(url.searchParams);
      console.log(`[Router DEBUG] Calling getSeriesData with env: ${env ? 'Yes' : 'No'}`);
      const data = await getSeriesData(seriesId, params, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/data/:seriesId/latest - Get latest data point
    else if (segments[0] === 'data' && segments.length === 3 && segments[2] === 'latest' && request.method === 'GET') {
      const seriesId = segments[1];
      console.log(`[Router DEBUG] Calling getLatestDataPoint with env: ${env ? 'Yes' : 'No'}`);
      const data = await getLatestDataPoint(seriesId, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/dashboard/:dashboardId - Get dashboard data
    else if (segments[0] === 'dashboard' && segments.length === 2 && request.method === 'GET') {
      const dashboardId = segments[1];
      console.log(`[Router DEBUG] Calling getDashboardData with env: ${env ? 'Yes' : 'No'}`);
      const data = await getDashboardData(dashboardId, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // Endpoint not found
    else {
      response = new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add CORS headers to all responses
    return handleCorsHeaders(response);
  } catch (error) {
    // Handle errors
    console.error(`[Router ERROR] ${error instanceof Error ? error.message : String(error)}`);
    const errorResponse = new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      {
        status: error instanceof ApiError ? error.status : 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    return handleCorsHeaders(errorResponse);
  }
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
