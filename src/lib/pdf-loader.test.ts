import { describe, it, expect, vi } from "vitest";

vi.mock("jspdf", () => ({
  default: class MockJsPDF {
    text() {}
    save() {}
  },
}));

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

describe("loadPdfLibs", () => {
  it("should lazily load jspdf and jspdf-autotable", async () => {
    const { loadPdfLibs } = await import("./pdf-loader");
    const { jsPDF, autoTable } = await loadPdfLibs();

    expect(jsPDF).toBeDefined();
    expect(autoTable).toBeDefined();
    expect(typeof jsPDF).toBe("function");
  });

  it("should return constructable jsPDF class", async () => {
    const { loadPdfLibs } = await import("./pdf-loader");
    const { jsPDF } = await loadPdfLibs();

    const doc = new jsPDF();
    expect(doc).toBeDefined();
  });
});
