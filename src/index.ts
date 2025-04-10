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
    // *** KV Binding Debug Section ***
    // Log details about the worker environment
    console.log(`[KV DEBUG] Worker fetch event: ${new Date().toISOString()}`);
    
    // Check if the env object exists
    if (!env) {
      console.error('[KV ERROR] env object is undefined');
      return new Response('Internal Server Error: Environment is undefined', { status: 500 });
    }
    
    // Log all available environment bindings
    console.log(`[KV DEBUG] Available env bindings: ${Object.keys(env).join(', ')}`);
    
    // Check for the KV namespace binding
    if (!env.ECONOMIC_DATA) {
      console.error('[KV ERROR] ECONOMIC_DATA binding is missing from env');
      
      // Return a detailed error for debugging
      return new Response(
        JSON.stringify({
          error: 'KV binding error',
          message: 'ECONOMIC_DATA binding is missing from environment',
          availableBindings: Object.keys(env)
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Log KV binding type
    console.log(`[KV DEBUG] ECONOMIC_DATA binding type: ${typeof env.ECONOMIC_DATA}`);
    
    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      return handleCorsHeaders(new Response(null, { status: 204 }));
    }

    // Test KV access directly
    if (request.url.includes('/api/debug-kv')) {
      try {
        // Try writing to KV
        const testKey = 'debug-test-key';
        const testValue = 'debug-test-value-' + new Date().toISOString();
        
        await env.ECONOMIC_DATA.put(testKey, testValue);
        console.log(`[KV DEBUG] Successfully wrote test key: ${testKey}`);
        
        // Try reading from KV
        const readValue = await env.ECONOMIC_DATA.get(testKey);
        console.log(`[KV DEBUG] Read value: ${readValue}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'KV test successful',
            written: testValue,
            read: readValue
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error(`[KV ERROR] KV test failed: ${error instanceof Error ? error.message : String(error)}`);
        return new Response(
          JSON.stringify({
            error: 'KV test failed',
            message: error instanceof Error ? error.message : String(error)
          }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
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
    console.log(`[Worker] Scheduled event: ${event.cron}`);
    // Implementation omitted for simplicity while debugging KV binding
  }
};
