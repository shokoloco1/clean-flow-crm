// Application configuration constants
// Centralized configuration for values that may need adjustment

export const CONFIG = {
  // API and Network
  api: {
    defaultTimeout: 8000, // 8 seconds
    maxRetries: 2,
    retryDelay: 1500, // 1.5 seconds
    cacheExpiry: 60 * 60 * 1000, // 1 hour in milliseconds
  },

  // Auto-refresh intervals
  refresh: {
    dashboard: 30000, // 30 seconds
    subscription: 60000, // 60 seconds
  },

  // Image compression settings
  imageCompression: {
    maxSizeMB: 2,
    maxDimension: 1920, // pixels
    initialQuality: 0.9,
    minQuality: 0.1,
  },

  // Staff availability defaults
  staffAvailability: {
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
  },

  // Job alerts and thresholds
  alerts: {
    lateStartThresholdMinutes: 15,
    overdueWarningDays: 7,
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  // UI feedback timings
  ui: {
    feedbackDuration: 2000, // 2 seconds for "copied", "saved", etc.
  },

  // Business defaults
  business: {
    defaultCompanyName: "Pulcrix",
    defaultHourlyRate: 50,
    defaultTrialDays: 14,
  },
} as const;

// Type for accessing config values
export type AppConfig = typeof CONFIG;
