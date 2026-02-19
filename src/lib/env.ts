import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_ENABLE_ANALYTICS: z.boolean(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

function validateEnv() {
  const envValues = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
