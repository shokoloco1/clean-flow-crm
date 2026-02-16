import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env validation", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
  });

  it("should have required environment variables set in test setup", () => {
    // Test setup provides these values
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
  });

  it("should validate URL format for VITE_SUPABASE_URL", async () => {
    // The env module validates on import
    // Since test setup provides valid values, import should succeed
    const { env } = await import("./env");
    expect(env.VITE_SUPABASE_URL).toContain("https://");
  });

  it("should parse optional VITE_ENABLE_ANALYTICS as boolean", async () => {
    const { env } = await import("./env");
    // Should be boolean (transformed from string)
    expect(typeof env.VITE_ENABLE_ANALYTICS).toBe("boolean");
  });

  it("should allow VITE_SENTRY_DSN to be optional", async () => {
    const { env } = await import("./env");
    // Should not throw if SENTRY_DSN is not set
    expect(env.VITE_SENTRY_DSN).toBeUndefined();
  });
});
