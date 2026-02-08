#!/usr/bin/env npx tsx
/**
 * Pulcrix Deployment Verification Script
 *
 * Verifies production deployment is correctly configured.
 * Run with: npm run verify
 */

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Result tracking
interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: CheckResult[] = [];

// Helper functions
function log(message: string) {
  console.log(message);
}

function success(name: string, message: string) {
  results.push({ name, passed: true, message });
  log(`${colors.green}✅ ${name}${colors.reset}: ${message}`);
}

function failure(name: string, message: string, details?: string) {
  results.push({ name, passed: false, message, details });
  log(`${colors.red}❌ ${name}${colors.reset}: ${message}`);
  if (details) {
    log(`   ${colors.yellow}→ ${details}${colors.reset}`);
  }
}

function warn(name: string, message: string) {
  log(`${colors.yellow}⚠️  ${name}${colors.reset}: ${message}`);
}

function header(title: string) {
  log(`\n${colors.cyan}${colors.bold}═══ ${title} ═══${colors.reset}\n`);
}

// Environment variable helpers
function getEnv(key: string): string | undefined {
  return process.env[key];
}

function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ============================================
// Verification Checks
// ============================================

async function checkEnvironmentVariables(): Promise<void> {
  header('Environment Variables');

  const requiredVars = [
    'VITE_SUPABASE_URL',
  ];

  const keyVars = [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const optionalVars = [
    'VITE_APP_URL',
    'VITE_ENABLE_ANALYTICS',
    'VITE_SENTRY_DSN',
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    const value = getEnv(varName);
    if (value) {
      success(varName, 'Present');
    } else {
      failure(varName, 'Missing required variable');
      allPresent = false;
    }
  }

  // Check for at least one key variable
  const hasKey = keyVars.some(v => getEnv(v));
  if (hasKey) {
    for (const varName of keyVars) {
      const value = getEnv(varName);
      if (value) {
        success(varName, 'Present');
      }
    }
  } else {
    failure('Supabase Key', 'Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
    allPresent = false;
  }

  for (const varName of optionalVars) {
    const value = getEnv(varName);
    if (value) {
      success(varName, 'Present (optional)');
    } else {
      warn(varName, 'Not set (optional)');
    }
  }

  if (!allPresent) {
    throw new Error('Missing required environment variables');
  }
}

async function checkSupabaseConnection(): Promise<void> {
  header('Supabase Connection');

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY') ||
                      getEnv('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    failure('Supabase URL', 'Not configured');
    return;
  }

  if (!supabaseKey) {
    failure('Supabase', 'No API key found');
    return;
  }

  try {
    // Test connection by hitting the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (response.ok || response.status === 200) {
      success('Supabase Connection', 'Connected successfully');
    } else if (response.status === 401) {
      failure('Supabase Connection', 'Authentication failed', 'Check API key');
    } else {
      failure('Supabase Connection', `HTTP ${response.status}`);
    }

    // Verify URL format
    if (supabaseUrl.includes('.supabase.co')) {
      success('Supabase URL Format', 'Valid Supabase URL');
    } else {
      warn('Supabase URL Format', 'Non-standard URL format');
    }

  } catch (error) {
    failure('Supabase Connection', 'Connection failed',
            error instanceof Error ? error.message : 'Unknown error');
  }
}

async function checkEdgeFunctions(): Promise<void> {
  header('Edge Functions');

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!supabaseUrl) {
    failure('Edge Functions', 'Supabase URL not configured');
    return;
  }

  const functionsToCheck = [
    'check-subscription',
    'create-checkout',
    'customer-portal',
    'send-email',
  ];

  for (const funcName of functionsToCheck) {
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/${funcName}`,
        {
          method: 'OPTIONS',
        }
      );

      // OPTIONS should return 200 or 204 for CORS preflight
      if (response.ok || response.status === 204) {
        success(`Function: ${funcName}`, 'Accessible');
      } else if (response.status === 401 || response.status === 403) {
        // 401/403 means function exists but needs auth - still accessible
        success(`Function: ${funcName}`, 'Accessible (requires auth)');
      } else {
        failure(`Function: ${funcName}`, `HTTP ${response.status}`);
      }
    } catch (error) {
      failure(`Function: ${funcName}`, 'Not reachable',
              error instanceof Error ? error.message : 'Network error');
    }
  }
}

async function checkStripeConnectivity(): Promise<void> {
  header('Stripe Connectivity');

  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!supabaseUrl) {
    failure('Stripe Integration', 'Supabase URL not configured');
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/check-subscription`,
      {
        method: 'OPTIONS',
      }
    );

    if (response.ok || response.status === 204 || response.status === 401) {
      success('Stripe Integration', 'check-subscription function accessible');
      log(`   ${colors.yellow}→ Full Stripe verification requires authenticated request${colors.reset}`);
    } else {
      failure('Stripe Integration', 'check-subscription not accessible');
    }
  } catch (error) {
    failure('Stripe Integration', 'Connection failed',
            error instanceof Error ? error.message : 'Unknown error');
  }
}

async function checkAppUrl(): Promise<void> {
  header('Application URL');

  const appUrl = getEnv('VITE_APP_URL');

  if (!appUrl) {
    warn('VITE_APP_URL', 'Not configured - skipping URL check');
    return;
  }

  try {
    const response = await fetch(appUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    if (response.ok) {
      success('App URL', `${appUrl} is accessible`);

      // Check for SSL
      if (appUrl.startsWith('https://')) {
        success('SSL', 'HTTPS enabled');
      } else {
        warn('SSL', 'Not using HTTPS - required for production');
      }
    } else {
      failure('App URL', `HTTP ${response.status}`, appUrl);
    }
  } catch (error) {
    failure('App URL', 'Not reachable',
            error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================
// Main Execution
// ============================================

async function main(): Promise<void> {
  log(`${colors.bold}${colors.cyan}`);
  log('╔═══════════════════════════════════════════╗');
  log('║   Pulcrix Deployment Verification Tool    ║');
  log('╚═══════════════════════════════════════════╝');
  log(`${colors.reset}`);

  try {
    await checkEnvironmentVariables();
    await checkSupabaseConnection();
    await checkEdgeFunctions();
    await checkStripeConnectivity();
    await checkAppUrl();

    // Summary
    header('Summary');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    if (failed === 0) {
      log(`${colors.green}${colors.bold}✅ All ${passed} checks passed!${colors.reset}`);
      log(`\n${colors.green}Deployment verification complete. Ready for production.${colors.reset}\n`);
      process.exit(0);
    } else {
      log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
      log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
      log(`\n${colors.red}Deployment verification failed. Please fix the issues above.${colors.reset}\n`);
      process.exit(1);
    }

  } catch (error) {
    log(`\n${colors.red}${colors.bold}Fatal Error:${colors.reset} ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run
main();
