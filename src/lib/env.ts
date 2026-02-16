import { z } from "zod";

// Default values from Lovable Cloud - these are automatically injected
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://edeprzdcvbejtnhoqawv.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZXByemRjdmJlanRuaG9xYXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzQwNzYsImV4cCI6MjA4MzE1MDA3Nn0._DXUCh4cG4cQo7gltaUxn_VOcbF5JlcHlF2L0xlZvOc";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_ENABLE_ANALYTICS: z.boolean(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

function validateEnv() {
  const envValues = {
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || undefined,
  };

  const result = envSchema.safeParse(envValues);

  if (!result.success) {
    console.error("Environment validation failed:", result.error.errors);
    // Return fallback values instead of throwing
    return {
      VITE_SUPABASE_URL: SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
      VITE_ENABLE_ANALYTICS: false,
      VITE_SENTRY_DSN: undefined,
    };
  }

  return result.data;
}

export const env = validateEnv();
