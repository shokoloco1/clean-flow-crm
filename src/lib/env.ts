import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string({
      required_error: "VITE_SUPABASE_URL is required",
    })
    .url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string({
      required_error: "VITE_SUPABASE_PUBLISHABLE_KEY is required",
    })
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY cannot be empty"),
  VITE_ENABLE_ANALYTICS: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  });

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(
      `Environment validation failed:\n${errors}\n\nPlease check your .env file. See .env.example for required variables.`
    );
  }

  return result.data;
}

export const env = validateEnv();
