import { describe, it, expect } from "vitest";
import { CONFIG } from "./config";

describe("CONFIG", () => {
  it("should have correct API defaults", () => {
    expect(CONFIG.api.defaultTimeout).toBe(8000);
    expect(CONFIG.api.maxRetries).toBe(2);
    expect(CONFIG.api.retryDelay).toBe(1500);
    expect(CONFIG.api.cacheExpiry).toBe(60 * 60 * 1000);
  });

  it("should have correct refresh intervals", () => {
    expect(CONFIG.refresh.dashboard).toBe(30000);
    expect(CONFIG.refresh.subscription).toBe(60000);
  });

  it("should have correct image compression settings", () => {
    expect(CONFIG.imageCompression.maxSizeMB).toBe(2);
    expect(CONFIG.imageCompression.maxDimension).toBe(1920);
  });

  it("should have correct staff availability defaults", () => {
    expect(CONFIG.staffAvailability.workDays).toEqual([1, 2, 3, 4, 5]);
    expect(CONFIG.staffAvailability.defaultStartTime).toBe("09:00");
    expect(CONFIG.staffAvailability.defaultEndTime).toBe("17:00");
  });

  it("should have correct pagination settings", () => {
    expect(CONFIG.pagination.defaultPageSize).toBe(20);
    expect(CONFIG.pagination.maxPageSize).toBe(100);
  });

  it("should have correct business defaults", () => {
    expect(CONFIG.business.defaultCompanyName).toBe("Pulcrix");
    expect(CONFIG.business.defaultHourlyRate).toBe(50);
    expect(CONFIG.business.defaultTrialDays).toBe(14);
  });

  it("should match snapshot to catch accidental changes", () => {
    expect(CONFIG).toMatchSnapshot();
  });
});
