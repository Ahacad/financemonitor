/**
 * Safe Environment Utilities
 * Provides safeguards and fallbacks for environment bindings
 */

import { Env } from '../types';

/**
 * Creates a safe version of the environment object that won't throw errors
 * when KV operations are attempted but KV is not available
 * 
 * @param env - The original environment object
 * @returns A safe environment object with fallbacks
 */
export function createSafeEnv(env: Env | undefined): Env {
  // If env is completely undefined, create a mock
  if (!env) {
    console.warn('[SafeEnv] Environment is undefined, creating mock environment');
    return createMockEnv();
  }
  
  // If ECONOMIC_DATA is missing, add a mock KV
  if (!env.ECONOMIC_DATA) {
    console.warn('[SafeEnv] ECONOMIC_DATA KV binding is missing, creating mock KV');
    const safeEnv = { ...env };
    
    // Create a mock KV namespace that will log operations but not fail
    safeEnv.ECONOMIC_DATA = createMockKV();
    
    return safeEnv;
  }
  
  // Environment is good as-is
  return env;
}

/**
 * Creates a complete mock environment when the real one is missing
 * @returns A mock environment object
 */
function createMockEnv(): Env {
  return {
    ECONOMIC_DATA: createMockKV(),
    FRED_API_KEY: process.env.FRED_API_KEY || '' // Try to get from process.env as fallback
  };
}

/**
 * Creates a mock KV namespace for graceful degradation
 * @returns A mock KV namespace
 */
function createMockKV(): KVNamespace {
  const memoryStore = new Map<string, string>();
  
  return {
    get: async (key: string, options?: any): Promise<string | null> => {
      console.log(`[MockKV] get: ${key}`);
      return memoryStore.get(key) || null;
    },
    
    put: async (key: string, value: string, options?: any): Promise<void> => {
      console.log(`[MockKV] put: ${key}`);
      memoryStore.set(key, value);
    },
    
    delete: async (key: string): Promise<void> => {
      console.log(`[MockKV] delete: ${key}`);
      memoryStore.delete(key);
    },
    
    list: async (options?: any): Promise<{ keys: { name: string }[] }> => {
      console.log(`[MockKV] list`);
      return {
        keys: Array.from(memoryStore.keys()).map(name => ({ name }))
      };
    },
    
    getWithMetadata: async (key: string, options?: any): Promise<{ value: string | null, metadata: any }> => {
      console.log(`[MockKV] getWithMetadata: ${key}`);
      return {
        value: memoryStore.get(key) || null,
        metadata: {}
      };
    }
  } as unknown as KVNamespace;
}
