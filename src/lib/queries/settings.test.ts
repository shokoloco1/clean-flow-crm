import { describe, it, expect } from "vitest";
import { DEFAULT_SERVICES } from "./settings";

describe("DEFAULT_SERVICES", () => {
  it("should contain 3 default cleaning services", () => {
    expect(DEFAULT_SERVICES).toHaveLength(3);
  });

  it("should have correct service IDs", () => {
    const ids = DEFAULT_SERVICES.map((s) => s.id);
    expect(ids).toEqual(["general", "deep", "end_of_lease"]);
  });

  it("each service should have id, label, and description", () => {
    DEFAULT_SERVICES.forEach((service) => {
      expect(service.id).toBeTruthy();
      expect(service.label).toBeTruthy();
      expect(service.description).toBeTruthy();
    });
  });

  it("should have correct labels", () => {
    expect(DEFAULT_SERVICES[0].label).toBe("General Cleaning");
    expect(DEFAULT_SERVICES[1].label).toBe("Deep Cleaning");
    expect(DEFAULT_SERVICES[2].label).toBe("End of Lease Cleaning");
  });
});
