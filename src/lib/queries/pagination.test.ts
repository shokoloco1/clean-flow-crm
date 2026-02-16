import { describe, it, expect } from "vitest";
import { toRange, DEFAULT_PAGE_SIZE } from "./pagination";

describe("toRange", () => {
  it("should return 0-19 for page 1 with pageSize 20", () => {
    expect(toRange(1, 20)).toEqual({ from: 0, to: 19 });
  });

  it("should return 20-39 for page 2 with pageSize 20", () => {
    expect(toRange(2, 20)).toEqual({ from: 20, to: 39 });
  });

  it("should handle pageSize of 1", () => {
    expect(toRange(1, 1)).toEqual({ from: 0, to: 0 });
    expect(toRange(3, 1)).toEqual({ from: 2, to: 2 });
  });

  it("should handle large page numbers", () => {
    expect(toRange(100, 10)).toEqual({ from: 990, to: 999 });
  });

  it("should handle custom page sizes", () => {
    expect(toRange(1, 50)).toEqual({ from: 0, to: 49 });
    expect(toRange(2, 50)).toEqual({ from: 50, to: 99 });
  });
});

describe("DEFAULT_PAGE_SIZE", () => {
  it("should be 20", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });
});
