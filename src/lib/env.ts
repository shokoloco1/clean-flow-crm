// Lovable Cloud auto-provides VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
// Hardcoded fallbacks ensure the app never crashes in preview environments where
// the env file may not yet be loaded.

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://edeprzdcvbejtnhoqawv.supabase.co";

const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZXByemRjdmJlanRuaG9xYXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzQwNzYsImV4cCI6MjA4MzE1MDA3Nn0._DXUCh4cG4cQo7gltaUxn_VOcbF5JlcHlF2L0xlZvOc";

export const env = {
  VITE_SUPABASE_URL: SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
  VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN as string | undefined,
} as const;
