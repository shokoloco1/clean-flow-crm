import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_ENABLE_ANALYTICS: z.boolean(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

function validateEnv() {
  // Lovable Cloud auto-provides these; fallbacks ensure the app doesn't crash
  // if the auto-generated .env hasn't been loaded yet in certain preview environments.
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    "https://edeprzdcvbejtnhoqawv.supabase.co";
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZXByemRjdmJlanRuaG9xYXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzQwNzYsImV4cCI6MjA4MzE1MDA3Nn0._DXUCh4cG4cQo7gltaUxn_VOcbF5JlcHlF2L0xlZvOc";

  const envValues = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || undefined,
  };

  const result = envSchema.safeParse(envValues);

  if (!result.success) {
    const missing = result.error.errors.map((e) => e.path.join(".")).join(", ");
    throw new Error(
      `[Pulcrix] Missing or invalid environment variables: ${missing}. ` +
        `Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env.local or your deploy environment.`,
    );
  }

  return result.data;
}

export const env = validateEnv();
