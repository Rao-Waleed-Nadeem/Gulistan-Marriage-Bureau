/**
 * Typed Backend Client Configuration & Security Boundary — Gulistan Marriage Bureau
 * 
 * IMPORTANT ARCHITECTURAL & SECURITY INVARIANTS:
 * 1. Only variables prefixed with VITE_ are exposed to the client bundle by Vite.
 * 2. Service-role keys (SUPABASE_SERVICE_ROLE_KEY) or direct database connection strings
 *    must NEVER be exposed to browser clients.
 * 3. If configuration is missing or invalid on clean checkout, the application fails
 *    SAFELY to 'demo' mode with mock fixtures rather than crashing.
 */

export interface ClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appEnv: 'development' | 'staging' | 'production';
  useMockData: boolean;
}

export interface ConfigValidationResult {
  isValid: boolean;
  mode: 'backend' | 'demo';
  config: ClientConfig | null;
  warnings: string[];
  errors: string[];
}

export interface BackendHealthStatus {
  status: 'demo_mode' | 'configured' | 'misconfigured';
  mode: 'demo' | 'backend';
  url: string | null;
  message: string;
  timestamp: string;
}

/**
 * Validates raw environment dictionary against security and typing invariants.
 * @param rawEnv Raw key-value dictionary (e.g. import.meta.env or process.env)
 * @returns ConfigValidationResult
 */
export function validateClientConfig(rawEnv: Record<string, unknown> = {}): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Strict Security Audit: Detect any leaked server-side secrets
  for (const key of Object.keys(rawEnv)) {
    const upperKey = key.toUpperCase();
    if (
      upperKey.includes('SERVICE_ROLE') ||
      upperKey.includes('DATABASE_URL') ||
      upperKey.includes('PRIVATE_KEY') ||
      upperKey.includes('SECRET_KEY')
    ) {
      errors.push(
        `CRITICAL SECURITY VIOLATION: Privileged server secret "${key}" detected in browser environment variables! This credential must be removed immediately.`
      );
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      mode: 'demo',
      config: null,
      warnings,
      errors,
    };
  }

  // 2. Extract public variables
  const rawUrl = typeof rawEnv.VITE_SUPABASE_URL === 'string' ? rawEnv.VITE_SUPABASE_URL.trim() : '';
  const rawAnonKey = typeof rawEnv.VITE_SUPABASE_ANON_KEY === 'string' ? rawEnv.VITE_SUPABASE_ANON_KEY.trim() : '';
  const rawEnvMode = typeof rawEnv.VITE_APP_ENV === 'string' ? rawEnv.VITE_APP_ENV.trim() : 'development';
  const rawUseMock = typeof rawEnv.VITE_USE_MOCK_DATA === 'string' ? rawEnv.VITE_USE_MOCK_DATA.trim().toLowerCase() : 'true';

  const isPlaceholderUrl = !rawUrl || rawUrl.includes('your-project-ref') || rawUrl.includes('placeholder');
  const isPlaceholderKey = !rawAnonKey || rawAnonKey.includes('your-anon-token') || rawAnonKey.includes('placeholder');

  // 3. Fallback to Demo Mode if variables are missing or placeholders
  if (!rawUrl || !rawAnonKey || isPlaceholderUrl || isPlaceholderKey) {
    warnings.push(
      'Supabase public configuration is not configured or uses placeholder values. Running safely in local demo mode with synthetic fixtures.'
    );

    return {
      isValid: true,
      mode: 'demo',
      config: {
        supabaseUrl: '',
        supabaseAnonKey: '',
        appEnv: (['development', 'staging', 'production'].includes(rawEnvMode) ? rawEnvMode : 'development') as ClientConfig['appEnv'],
        useMockData: true,
      },
      warnings,
      errors: [],
    };
  }

  // 4. Validate URL formatting for backend mode
  let validUrl = false;
  try {
    const parsed = new URL(rawUrl);
    validUrl = parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    validUrl = false;
  }

  if (!validUrl) {
    errors.push(`Invalid VITE_SUPABASE_URL: "${rawUrl}". Must be a valid HTTP or HTTPS URL.`);
    return {
      isValid: false,
      mode: 'demo',
      config: null,
      warnings,
      errors,
    };
  }

  // 5. Valid Backend Mode Configuration
  const appEnv = (['development', 'staging', 'production'].includes(rawEnvMode) ? rawEnvMode : 'development') as ClientConfig['appEnv'];
  const useMockData = rawUseMock === 'true';

  return {
    isValid: true,
    mode: useMockData ? 'demo' : 'backend',
    config: {
      supabaseUrl: rawUrl,
      supabaseAnonKey: rawAnonKey,
      appEnv,
      useMockData,
    },
    warnings,
    errors: [],
  };
}

// Cached singleton validation result
let cachedResult: ConfigValidationResult | null = null;

/**
 * Retrieves the current client configuration.
 * Safely defaults to demo mode if configuration is missing.
 */
export function getClientConfig(): ConfigValidationResult {
  if (!cachedResult) {
    const env = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as Record<string, unknown>) : {};
    cachedResult = validateClientConfig(env);

    // Diagnostic console logging (non-sensitive info only)
    if (cachedResult.mode === 'demo') {
      console.info(
        '[Gulistan] Operating in standalone demo mode with synthetic candidate records.'
      );
    } else {
      console.info(
        `[Gulistan] Backend client configured for environment: ${cachedResult.config?.appEnv}`
      );
    }
  }

  return cachedResult;
}

/**
 * Resets cached configuration (primarily for unit test isolation).
 */
export function resetClientConfigForTesting(): void {
  cachedResult = null;
}

/**
 * Returns non-sensitive health status of the backend connection boundary.
 */
export function getBackendHealthStatus(): BackendHealthStatus {
  const result = getClientConfig();

  if (!result.isValid) {
    return {
      status: 'misconfigured',
      mode: 'demo',
      url: null,
      message: result.errors.join('; '),
      timestamp: new Date().toISOString(),
    };
  }

  if (result.mode === 'demo') {
    return {
      status: 'demo_mode',
      mode: 'demo',
      url: null,
      message: 'Running in standalone demo mode with local mock records.',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: 'configured',
    mode: 'backend',
    url: result.config?.supabaseUrl || null,
    message: `Backend client configured for ${result.config?.appEnv} environment.`,
    timestamp: new Date().toISOString(),
  };
}
