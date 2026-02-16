import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSignedUrl, getSignedUrls, extractFilePath, isSignedUrl } from "./signedUrls";

// Mock supabase
const mockCreateSignedUrl = vi.fn();
const mockCreateSignedUrls = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
        createSignedUrls: mockCreateSignedUrls,
      })),
    },
  },
}));

describe("signedUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSignedUrl", () => {
    it("should return signed URL for valid file path", async () => {
      const mockUrl = "https://storage.supabase.co/bucket/file.jpg?token=abc123";
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: mockUrl },
        error: null,
      });

      const result = await getSignedUrl("test-bucket", "path/to/file.jpg");

      expect(result).toBe(mockUrl);
    });

    it("should return null on storage error", async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: new Error("Storage error"),
      });

      const result = await getSignedUrl("test-bucket", "path/to/file.jpg");

      expect(result).toBeNull();
    });

    it("should return null when exception occurs", async () => {
      mockCreateSignedUrl.mockRejectedValue(new Error("Network error"));

      const result = await getSignedUrl("test-bucket", "path/to/file.jpg");

      expect(result).toBeNull();
    });
  });

  describe("getSignedUrls", () => {
    it("should return array of signed URLs for multiple files", async () => {
      const mockUrls = [
        { signedUrl: "https://storage.supabase.co/bucket/file1.jpg?token=abc" },
        { signedUrl: "https://storage.supabase.co/bucket/file2.jpg?token=def" },
      ];
      mockCreateSignedUrls.mockResolvedValue({
        data: mockUrls,
        error: null,
      });

      const result = await getSignedUrls("test-bucket", ["file1.jpg", "file2.jpg"]);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(mockUrls[0].signedUrl);
      expect(result[1]).toBe(mockUrls[1].signedUrl);
    });

    it("should return array of nulls on error", async () => {
      mockCreateSignedUrls.mockResolvedValue({
        data: null,
        error: new Error("Storage error"),
      });

      const result = await getSignedUrls("test-bucket", ["file1.jpg", "file2.jpg"]);

      expect(result).toEqual([null, null]);
    });

    it("should return array of nulls when exception occurs", async () => {
      mockCreateSignedUrls.mockRejectedValue(new Error("Network error"));

      const result = await getSignedUrls("test-bucket", ["file1.jpg", "file2.jpg", "file3.jpg"]);

      expect(result).toEqual([null, null, null]);
    });
  });

  describe("extractFilePath", () => {
    it("should extract file path from full storage URL", () => {
      const url = "https://storage.supabase.co/storage/v1/object/public/photos/user123/image.jpg";
      const result = extractFilePath(url, "photos");

      expect(result).toBe("user123/image.jpg");
    });

    it("should return null for URL without bucket name", () => {
      const url = "https://storage.supabase.co/storage/v1/object/public/other-bucket/file.jpg";
      const result = extractFilePath(url, "photos");

      expect(result).toBeNull();
    });

    it("should return null for invalid URL", () => {
      const result = extractFilePath("not-a-valid-url", "photos");

      expect(result).toBeNull();
    });
  });

  describe("isSignedUrl", () => {
    it("should return true for URL with token parameter", () => {
      const url = "https://storage.supabase.co/bucket/file.jpg?token=abc123";

      expect(isSignedUrl(url)).toBe(true);
    });

    it("should return false for URL without token", () => {
      const url = "https://storage.supabase.co/bucket/file.jpg";

      expect(isSignedUrl(url)).toBe(false);
    });

    it("should return true for URL with token among other params", () => {
      const url = "https://storage.supabase.co/bucket/file.jpg?width=100&token=abc123&height=200";

      expect(isSignedUrl(url)).toBe(true);
    });
  });
});
