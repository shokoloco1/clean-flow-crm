import { describe, it, expect } from "vitest";
import {
  validateABN,
  formatABN,
  GST_RATE,
  calculateGST,
  extractGSTFromTotal,
  formatAUD,
  validateAUPhone,
  formatAUPhone,
  validateAUPostcode,
  getStateFromPostcode,
} from "./australian";

describe("validateABN", () => {
  it("should validate correct ABNs", () => {
    expect(validateABN("51824753556")).toBe(true); // ATO
    expect(validateABN("53004085616")).toBe(true);
    expect(validateABN("51 824 753 556")).toBe(true); // With spaces
  });

  it("should reject invalid ABNs", () => {
    expect(validateABN("12345678901")).toBe(false);
    expect(validateABN("00000000000")).toBe(false);
    expect(validateABN("11111111111")).toBe(false);
  });

  it("should reject ABNs with wrong length", () => {
    expect(validateABN("1234567890")).toBe(false); // 10 digits
    expect(validateABN("123456789012")).toBe(false); // 12 digits
    expect(validateABN("")).toBe(false);
  });

  it("should reject non-numeric ABNs", () => {
    expect(validateABN("5182475355A")).toBe(false);
    expect(validateABN("abcdefghijk")).toBe(false);
  });
});

describe("formatABN", () => {
  it("should format 11-digit ABN correctly", () => {
    expect(formatABN("51824753556")).toBe("51 824 753 556");
  });

  it("should return input if not 11 digits", () => {
    expect(formatABN("12345")).toBe("12345");
    expect(formatABN("123456789012")).toBe("123456789012");
  });

  it("should handle already formatted ABN", () => {
    expect(formatABN("51 824 753 556")).toBe("51 824 753 556");
  });
});

describe("GST calculations", () => {
  it("should have correct GST rate", () => {
    expect(GST_RATE).toBe(0.1);
  });

  describe("calculateGST", () => {
    it("should calculate GST correctly", () => {
      const result = calculateGST(100);
      expect(result.subtotal).toBe(100);
      expect(result.gst).toBe(10);
      expect(result.total).toBe(110);
    });

    it("should handle decimal amounts", () => {
      const result = calculateGST(99.99);
      expect(result.subtotal).toBe(99.99);
      expect(result.gst).toBe(10); // Rounded
      expect(result.total).toBe(109.99);
    });

    it("should handle zero", () => {
      const result = calculateGST(0);
      expect(result.subtotal).toBe(0);
      expect(result.gst).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("extractGSTFromTotal", () => {
    it("should extract GST from inclusive total", () => {
      const result = extractGSTFromTotal(110);
      expect(result.subtotal).toBe(100);
      expect(result.gst).toBe(10);
      expect(result.total).toBe(110);
    });

    it("should handle decimal totals", () => {
      const result = extractGSTFromTotal(109.99);
      expect(result.total).toBe(109.99);
      expect(result.subtotal + result.gst).toBeCloseTo(109.99, 2);
    });
  });
});

describe("formatAUD", () => {
  it("should format currency with symbol", () => {
    const formatted = formatAUD(1234.56);
    expect(formatted).toContain("1,234.56");
    expect(formatted).toMatch(/\$/);
  });

  it("should format without symbol when specified", () => {
    const formatted = formatAUD(1234.56, false);
    expect(formatted).toBe("1,234.56");
  });

  it("should handle zero", () => {
    const formatted = formatAUD(0);
    expect(formatted).toContain("0.00");
  });

  it("should handle negative amounts", () => {
    const formatted = formatAUD(-100);
    expect(formatted).toContain("100.00");
    expect(formatted).toContain("-");
  });
});

describe("validateAUPhone", () => {
  it("should validate mobile numbers", () => {
    expect(validateAUPhone("0412345678")).toBe(true);
    expect(validateAUPhone("0412 345 678")).toBe(true);
    expect(validateAUPhone("+61412345678")).toBe(true);
    expect(validateAUPhone("+61 412 345 678")).toBe(true);
  });

  it("should validate landline numbers", () => {
    expect(validateAUPhone("0212345678")).toBe(true);
    expect(validateAUPhone("0312345678")).toBe(true);
    expect(validateAUPhone("+61212345678")).toBe(true);
  });

  it("should reject invalid numbers", () => {
    expect(validateAUPhone("041234567")).toBe(false); // Too short
    expect(validateAUPhone("04123456789")).toBe(false); // Too long
    expect(validateAUPhone("1234567890")).toBe(false); // No valid prefix
  });
});

describe("formatAUPhone", () => {
  it("should format mobile numbers", () => {
    expect(formatAUPhone("0412345678")).toBe("0412 345 678");
    expect(formatAUPhone("+61412345678")).toBe("0412 345 678");
  });

  it("should format landline numbers", () => {
    expect(formatAUPhone("0212345678")).toBe("(02) 1234 5678");
    expect(formatAUPhone("0312345678")).toBe("(03) 1234 5678");
  });

  it("should return original if cannot format", () => {
    expect(formatAUPhone("12345")).toBe("12345");
  });
});

describe("validateAUPostcode", () => {
  it("should validate 4-digit postcodes", () => {
    expect(validateAUPostcode("2000")).toBe(true);
    expect(validateAUPostcode("3000")).toBe(true);
    expect(validateAUPostcode("0800")).toBe(true);
  });

  it("should reject invalid postcodes", () => {
    expect(validateAUPostcode("200")).toBe(false);
    expect(validateAUPostcode("20000")).toBe(false);
    expect(validateAUPostcode("abcd")).toBe(false);
  });

  it("should handle whitespace", () => {
    expect(validateAUPostcode(" 2000 ")).toBe(true);
  });
});

describe("getStateFromPostcode", () => {
  it("should return correct state for NSW postcodes", () => {
    expect(getStateFromPostcode("2000")).toBe("NSW"); // Sydney
    expect(getStateFromPostcode("2150")).toBe("NSW"); // Parramatta
  });

  it("should return correct state for VIC postcodes", () => {
    expect(getStateFromPostcode("3000")).toBe("VIC"); // Melbourne
    expect(getStateFromPostcode("3350")).toBe("VIC"); // Ballarat
  });

  it("should return correct state for QLD postcodes", () => {
    expect(getStateFromPostcode("4000")).toBe("QLD"); // Brisbane
    expect(getStateFromPostcode("4870")).toBe("QLD"); // Cairns
  });

  it("should return correct state for SA postcodes", () => {
    expect(getStateFromPostcode("5000")).toBe("SA"); // Adelaide
  });

  it("should return correct state for WA postcodes", () => {
    expect(getStateFromPostcode("6000")).toBe("WA"); // Perth
  });

  it("should return correct state for TAS postcodes", () => {
    expect(getStateFromPostcode("7000")).toBe("TAS"); // Hobart
  });

  it("should return correct state for ACT postcodes", () => {
    expect(getStateFromPostcode("2600")).toBe("ACT"); // Canberra
  });

  it("should return correct state for NT postcodes", () => {
    expect(getStateFromPostcode("0800")).toBe("NT"); // Darwin
  });

  it("should return null for invalid postcodes", () => {
    expect(getStateFromPostcode("0000")).toBe(null);
    expect(getStateFromPostcode("9999")).toBe(null);
  });
});
