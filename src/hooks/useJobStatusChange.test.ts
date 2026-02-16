import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJobStatusChange } from "./useJobStatusChange";
import { toast } from "sonner";

// Mock supabase
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

describe("useJobStatusChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  describe("getNextStatus", () => {
    it('should return "pending" for "scheduled"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("scheduled")).toBe("pending");
    });

    it('should return "in_progress" for "pending"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("pending")).toBe("in_progress");
    });

    it('should return "completed" for "in_progress"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("in_progress")).toBe("completed");
    });

    it('should return null for "completed"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("completed")).toBeNull();
    });

    it('should return null for "cancelled"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("cancelled")).toBeNull();
    });

    it("should return null for invalid status", () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getNextStatus("invalid")).toBeNull();
    });
  });

  describe("getPreviousStatus", () => {
    it('should return null for "scheduled"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getPreviousStatus("scheduled")).toBeNull();
    });

    it('should return "scheduled" for "pending"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getPreviousStatus("pending")).toBe("scheduled");
    });

    it('should return "pending" for "in_progress"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getPreviousStatus("in_progress")).toBe("pending");
    });

    it('should return "in_progress" for "completed"', () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.getPreviousStatus("completed")).toBe("in_progress");
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status in database", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.updateJobStatus("job-123", "pending");
      });

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
      expect(mockEq).toHaveBeenCalledWith("id", "job-123");
    });

    it("should set start_time when moving to in_progress", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.updateJobStatus("job-123", "in_progress");
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "in_progress",
          start_time: expect.any(String),
        }),
      );
    });

    it("should set end_time when moving to completed", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.updateJobStatus("job-123", "completed");
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "completed",
          end_time: expect.any(String),
        }),
      );
    });

    it("should show success toast on update", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.updateJobStatus("job-123", "pending");
      });

      expect(toast.success).toHaveBeenCalledWith("Job moved to Pending");
    });

    it("should call onUpdate callback", async () => {
      const onUpdate = vi.fn();
      const { result } = renderHook(() => useJobStatusChange(onUpdate));

      await act(async () => {
        await result.current.updateJobStatus("job-123", "pending");
      });

      expect(onUpdate).toHaveBeenCalled();
    });

    it("should show error toast on failure", async () => {
      mockEq.mockResolvedValue({ error: new Error("Database error") });
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.updateJobStatus("job-123", "pending");
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to update job status");
    });
  });

  describe("advanceStatus", () => {
    it("should move job to next status", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.advanceStatus("job-123", "scheduled");
      });

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "pending" }));
    });

    it("should show info toast when already completed", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.advanceStatus("job-123", "completed");
      });

      expect(toast.info).toHaveBeenCalledWith("Job is already completed");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("revertStatus", () => {
    it("should move job to previous status", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.revertStatus("job-123", "pending");
      });

      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "scheduled" }));
    });

    it("should show info toast when cannot revert further", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      await act(async () => {
        await result.current.revertStatus("job-123", "scheduled");
      });

      expect(toast.info).toHaveBeenCalledWith("Cannot revert further");
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("updatingJobId state", () => {
    it("should track which job is being updated", async () => {
      const { result } = renderHook(() => useJobStatusChange());

      expect(result.current.updatingJobId).toBeNull();

      let updatePromise: Promise<void>;
      act(() => {
        updatePromise = result.current.updateJobStatus("job-123", "pending");
      });

      // During update, updatingJobId should be set
      expect(result.current.updatingJobId).toBe("job-123");

      await act(async () => {
        await updatePromise;
      });

      // After update, updatingJobId should be cleared
      expect(result.current.updatingJobId).toBeNull();
    });
  });
});
