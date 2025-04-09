/**
 * CORS Utility
 * Handles Cross-Origin Resource Sharing headers
 */

// Default CORS headers
const DEFAULT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Add CORS headers to a response
 * @param response - The response object
 * @param additionalHeaders - Additional CORS headers to add
 * @returns Response with CORS headers
 */
export function handleCorsHeaders(
  response: Response, 
  additionalHeaders: Record<string, string> = {}
): Response {
  // Create a new response with the original response's body, status, and statusText
  const corsResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  
  // Add CORS headers
  const corsHeaders = { ...DEFAULT_CORS_HEADERS, ...additionalHeaders };
  Object.entries(corsHeaders).forEach(([key, value]) => {
    corsResponse.headers.set(key, value);
  });
  
  // Copy all original headers that weren't explicitly set above
  for (const [key, value] of response.headers.entries()) {
    if (!corsResponse.headers.has(key)) {
      corsResponse.headers.set(key, value);
    }
  }
  
  return corsResponse;
}

/**
 * Create a CORS preflight response for OPTIONS requests
 * @param additionalHeaders - Additional CORS headers to add
 * @returns CORS preflight response
 */
export function createCorsPreflightResponse(
  additionalHeaders: Record<string, string> = {}
): Response {
  const headers = { ...DEFAULT_CORS_HEADERS, ...additionalHeaders };
  return new Response(null, {
    status: 204, // No content
    headers,
  });
}

/**
 * Check if a request origin is allowed
 * @param origin - The request origin
 * @param allowedOrigins - List of allowed origins
 * @returns Whether the origin is allowed
 */
export function isOriginAllowed(
  origin: string, 
  allowedOrigins: string[] = ['*']
): boolean {
  // Allow all origins if '*' is in the allowed list
  if (allowedOrigins.includes('*')) {
    return true;
  }
  
  // Check if the origin is in the allowed list
  return allowedOrigins.includes(origin);
}

/**
 * Get appropriate CORS headers based on the request origin
 * @param request - The request object
 * @param allowedOrigins - List of allowed origins
 * @returns CORS headers
 */
export function getCorsHeadersForRequest(
  request: Request, 
  allowedOrigins: string[] = ['*']
): Record<string, string> {
  const origin = request.headers.get('Origin');
  
  // If no origin header or origin not allowed, use default headers
  if (!origin || !isOriginAllowed(origin, allowedOrigins)) {
    return DEFAULT_CORS_HEADERS;
  }
  
  // Return headers with the specific origin
  return {
    ...DEFAULT_CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
  };
}
