import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.info("[Sentry] No DSN configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Session replay for errors
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Environment
    environment: import.meta.env.MODE,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Filter out common non-actionable errors
    beforeSend(event) {
      // Ignore ResizeObserver errors (common, non-critical)
      if (event.message?.includes("ResizeObserver")) {
        return null;
      }
      return event;
    },
  });

  console.info("[Sentry] Error tracking initialized");
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN || !import.meta.env.PROD) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function setUser(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

export function clearUser() {
  Sentry.setUser(null);
}

export { Sentry };
