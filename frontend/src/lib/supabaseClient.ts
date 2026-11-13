/**
 * Browser-Safe Supabase Client Boundary — Gulistan Marriage Bureau
 * 
 * ARCHITECTURAL BOUNDARY RULES:
 * 1. This file runs in the browser. It must NEVER receive or use SUPABASE_SERVICE_ROLE_KEY.
 * 2. In 'demo' mode (default on clean checkout), this boundary operates safely offline
 *    using local synthetic records from mockData.ts.
 * 3. Network operations must fail closed and handle connection errors gracefully.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getClientConfig, getBackendHealthStatus, BackendHealthStatus, ClientConfig } from './config';

export { getClientConfig, getBackendHealthStatus };
export type { BackendHealthStatus, ClientConfig, SupabaseClient };

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the singleton typed Supabase client instance when configuration is valid.
 * Fails closed and returns null when configuration is missing or placeholder.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const result = getClientConfig();
  if (!result.isValid || result.mode === 'demo' || !result.config?.supabaseUrl || !result.config?.supabaseAnonKey) {
    return null;
  }

  supabaseInstance = createClient(result.config.supabaseUrl, result.config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

/**
 * Injects a mock client or clears the singleton instance for testing purposes.
 */
export function setSupabaseClientForTesting(mockClient: SupabaseClient | null): void {
  supabaseInstance = mockClient;
}

/**
 * Resets the cached singleton client.
 */
export function resetSupabaseClientForTesting(): void {
  supabaseInstance = null;
}

/**
 * Checks whether the application is running against a live backend or in local demo mode.
 */
export function isBackendConfigured(): boolean {
  const config = getClientConfig();
  return config.isValid && config.mode === 'backend';
}

/**
 * Diagnostic health check method for operational verification.
 */
export async function checkBackendConnectionHealth(): Promise<BackendHealthStatus> {
  const baseStatus = getBackendHealthStatus();

  if (baseStatus.mode === 'demo') {
    return baseStatus;
  }

  // When live backend is configured, perform a non-sensitive ping
  try {
    const config = getClientConfig().config;
    if (!config?.supabaseUrl) {
      return baseStatus;
    }

    // Ping the Supabase health or rest root endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status === 401 || response.status === 200) {
      // 401 with valid apikey header or 200 confirms gateway is alive
      return {
        ...baseStatus,
        status: 'configured',
        message: 'Supabase gateway reachable and operational.',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      ...baseStatus,
      status: 'misconfigured',
      message: `Supabase gateway returned unexpected HTTP status: ${response.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ...baseStatus,
      status: 'misconfigured',
      message: `Network connectivity check failed: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}
