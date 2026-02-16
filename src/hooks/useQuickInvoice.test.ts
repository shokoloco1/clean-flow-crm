import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuickInvoice } from "./useQuickInvoice";
import { toast } from "sonner";

// Create a more robust mock for Supabase's fluent API
const createSupabaseMock = () => {
  const mockData: Record<string, any> = {};

  const createChain = () => {
    const chain: any = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      single: vi.fn(() => Promise.resolve({ data: mockData.single, error: mockData.singleError })),
    };
    return chain;
  };

  const fromMock = vi.fn(() => createChain());

  return {
    from: fromMock,
    setMockData: (key: string, value: any) => {
      mockData[key] = value;
    },
    getMock: () => fromMock,
  };
};

const supabaseMock = createSupabaseMock();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => (supabaseMock.from as any)(...args),
  },
}));

describe("useQuickInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have isGenerating false initially", () => {
      const { result } = renderHook(() => useQuickInvoice());
      expect(result.current.isGenerating).toBe(false);
    });

    it("should expose generateInvoiceFromJob function", () => {
      const { result } = renderHook(() => useQuickInvoice());
      expect(typeof result.current.generateInvoiceFromJob).toBe("function");
    });

    it("should expose generateInvoiceFromMultipleJobs function", () => {
      const { result } = renderHook(() => useQuickInvoice());
      expect(typeof result.current.generateInvoiceFromMultipleJobs).toBe("function");
    });
  });

  describe("generateInvoiceFromJob", () => {
    it("should return null and show error when job fetch fails", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromJob("job-123");
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate invoice",
        expect.objectContaining({ description: "Job not found" }),
      );
    });

    it("should return null when job has no client", async () => {
      const mockJob = {
        id: "job-123",
        client_id: null,
        location: "Test",
        scheduled_date: "2024-01-15",
        start_time: null,
        end_time: null,
        assigned_staff_id: null,
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromJob("job-123");
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate invoice",
        expect.objectContaining({ description: "Job has no client assigned" }),
      );
    });

    it("should handle invoice creation failure", async () => {
      const mockJob = {
        id: "job-123",
        client_id: "client-456",
        location: "Test",
        scheduled_date: "2024-01-15",
        start_time: null,
        end_time: null,
        assigned_staff_id: null,
        properties: null,
      };

      let callCount = 0;
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: mockJob, error: null });
          }
          return Promise.resolve({ data: null, error: new Error("Insert failed") });
        }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromJob("job-123");
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalled();
    });

    it("should set isGenerating to false after completion", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Error") }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      await act(async () => {
        await result.current.generateInvoiceFromJob("job-123");
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe("generateInvoiceFromMultipleJobs", () => {
    it("should return null for empty job array", async () => {
      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromMultipleJobs([]);
      });

      expect(invoiceResult).toBeNull();
    });

    it("should delegate to single job function for one job", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      await act(async () => {
        await result.current.generateInvoiceFromMultipleJobs(["job-1"]);
      });

      // Should have called from('jobs') for single job fetch
      expect(supabaseMock.from).toHaveBeenCalledWith("jobs");
    });

    it("should return null when jobs fetch fails", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: new Error("Fetch failed") }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromMultipleJobs(["job-1", "job-2"]);
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate invoice",
        expect.objectContaining({ description: "Jobs not found" }),
      );
    });

    it("should return null when jobs belong to different clients", async () => {
      const mockJobs = [
        { id: "job-1", client_id: "client-1", location: "A", scheduled_date: "2024-01-15" },
        { id: "job-2", client_id: "client-2", location: "B", scheduled_date: "2024-01-16" },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromMultipleJobs(["job-1", "job-2"]);
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate invoice",
        expect.objectContaining({ description: "All jobs must belong to the same client" }),
      );
    });

    it("should return null when jobs have no client", async () => {
      const mockJobs = [
        { id: "job-1", client_id: null, location: "A", scheduled_date: "2024-01-15" },
        { id: "job-2", client_id: null, location: "B", scheduled_date: "2024-01-16" },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      let invoiceResult: any;
      await act(async () => {
        invoiceResult = await result.current.generateInvoiceFromMultipleJobs(["job-1", "job-2"]);
      });

      expect(invoiceResult).toBeNull();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to generate invoice",
        expect.objectContaining({ description: "Jobs have no client assigned" }),
      );
    });

    it("should set isGenerating to false after completion", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: new Error("Error") }),
      };
      supabaseMock.from.mockReturnValue(mockChain);

      const { result } = renderHook(() => useQuickInvoice());

      await act(async () => {
        await result.current.generateInvoiceFromMultipleJobs(["job-1", "job-2"]);
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });
});
