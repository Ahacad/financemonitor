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
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '');
  const segments = path.split('/').filter(Boolean);
  
  // Handle different API endpoints
  try {
    let response: Response;
    
    // GET /api/indicators - List all indicators
    if (path === 'indicators' && request.method === 'GET') {
      const data = await getIndicatorsList(env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/indicators/:category - Get indicators by category
    else if (segments[0] === 'indicators' && segments.length === 2 && request.method === 'GET') {
      const category = segments[1];
      const data = await getIndicatorsByCategory(category, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/data/:seriesId - Get time series data
    else if (segments[0] === 'data' && segments.length === 2 && request.method === 'GET') {
      const seriesId = segments[1];
      const params = Object.fromEntries(url.searchParams);
      const data = await getSeriesData(seriesId, params, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/data/:seriesId/latest - Get latest data point
    else if (segments[0] === 'data' && segments.length === 3 && segments[2] === 'latest' && request.method === 'GET') {
      const seriesId = segments[1];
      const data = await getLatestDataPoint(seriesId, env);
      response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // GET /api/dashboard/:dashboardId - Get dashboard data
    else if (segments[0] === 'dashboard' && segments.length === 2 && request.method === 'GET') {
      const dashboardId = segments[1];
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
