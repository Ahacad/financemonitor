/**
 * Cache Utility
 * Handles interactions with Cloudflare Workers KV storage
 */

import { Env } from '../types';

/**
 * Get a value from the cache
 * @param key - Cache key
 * @param env - The environment variables and bindings
 * @returns Cached value or null if not found
 */
export async function getFromCache(key: string, env: Env): Promise<string | null> {
  try {
    // Advanced debugging to help diagnose KV binding issues
    if (!env) {
      console.error(`[KV ERROR] getFromCache: env is undefined`);
      throw new Error('Environment is undefined');
    }
    
    if (!env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] getFromCache: env.ECONOMIC_DATA is undefined`);
      console.error(`[KV ERROR] Available env keys: ${Object.keys(env).join(', ')}`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    // Try to get the value
    return await env.ECONOMIC_DATA.get(key);
  } catch (error) {
    console.error(`[KV ERROR] Error getting key ${key} from cache: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[KV ERROR] Error stack: ${error instanceof Error && error.stack ? error.stack : 'No stack trace'}`);
    // Throw the error to make it visible in the response
    throw error;
  }
}

/**
 * Set a value in the cache with optional TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time-to-live in seconds (optional)
 * @param env - The environment variables and bindings
 * @returns Success status
 */
export async function setCache(key: string, value: string, ttl: number | null = null, env: Env): Promise<boolean> {
  try {
    // Advanced debugging to help diagnose KV binding issues
    if (!env) {
      console.error(`[KV ERROR] setCache: env is undefined`);
      throw new Error('Environment is undefined');
    }
    
    if (!env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] setCache: env.ECONOMIC_DATA is undefined`);
      console.error(`[KV ERROR] Available env keys: ${Object.keys(env).join(', ')}`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    const options = ttl ? { expirationTtl: ttl } : {};
    await env.ECONOMIC_DATA.put(key, value, options);
    console.log(`[KV SUCCESS] Successfully cached key: ${key}`);
    return true;
  } catch (error) {
    console.error(`[KV ERROR] Error setting key ${key} in cache: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[KV ERROR] Error stack: ${error instanceof Error && error.stack ? error.stack : 'No stack trace'}`);
    // Throw the error to make it visible in the response
    throw error;
  }
}

/**
 * Delete a value from the cache
 * @param key - Cache key
 * @param env - The environment variables and bindings
 * @returns Success status
 */
export async function deleteCache(key: string, env: Env): Promise<boolean> {
  try {
    if (!env || !env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] deleteCache: KV namespace is missing`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    await env.ECONOMIC_DATA.delete(key);
    return true;
  } catch (error) {
    console.error(`[KV ERROR] Error deleting key ${key} from cache: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get multiple values from the cache
 * @param keys - Array of cache keys
 * @param env - The environment variables and bindings
 * @returns Object mapping keys to values
 */
export async function getMultiCache(keys: string[], env: Env): Promise<Record<string, string | null>> {
  try {
    if (!env || !env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] getMultiCache: KV namespace is missing`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    // KV doesn't have a native getMany, so we'll use Promise.all
    const promises = keys.map(key => getFromCache(key, env));
    const values = await Promise.all(promises);
    
    // Create a key-value object from the results
    const result: Record<string, string | null> = {};
    keys.forEach((key, index) => {
      result[key] = values[index];
    });
    
    return result;
  } catch (error) {
    console.error(`[KV ERROR] Error getting multiple keys from cache: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Check if a key exists in the cache
 * @param key - Cache key
 * @param env - The environment variables and bindings
 * @returns Whether the key exists
 */
export async function cacheHas(key: string, env: Env): Promise<boolean> {
  try {
    if (!env || !env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] cacheHas: KV namespace is missing`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    const value = await env.ECONOMIC_DATA.get(key, { type: 'text' });
    return value !== null;
  } catch (error) {
    console.error(`[KV ERROR] Error checking if key ${key} exists in cache: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * List all keys in the cache with a given prefix
 * @param prefix - Key prefix
 * @param limit - Maximum number of keys to return
 * @param env - The environment variables and bindings
 * @returns Array of keys
 */
export async function listCacheKeys(prefix: string, limit: number = 1000, env: Env): Promise<string[]> {
  try {
    if (!env || !env.ECONOMIC_DATA) {
      console.error(`[KV ERROR] listCacheKeys: KV namespace is missing`);
      throw new Error('KV namespace ECONOMIC_DATA is missing from environment');
    }
    
    const list = await env.ECONOMIC_DATA.list({ prefix, limit });
    return list.keys.map(key => key.name);
  } catch (error) {
    console.error(`[KV ERROR] Error listing cache keys with prefix ${prefix}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
