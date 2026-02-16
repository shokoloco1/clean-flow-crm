import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreateJob } from "./useCreateJob";
import { toast } from "sonner";

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "clients") {
        return {
          select: mockSelect.mockReturnValue({ order: mockOrder }),
        };
      }
      if (table === "user_roles") {
        return {
          select: mockSelect.mockReturnValue({ eq: mockEq }),
        };
      }
      if (table === "profiles") {
        return {
          select: mockSelect.mockReturnValue({ in: mockIn }),
        };
      }
      if (table === "jobs") {
        return {
          insert: mockInsert,
        };
      }
      return { select: mockSelect, insert: mockInsert };
    }),
  },
}));

describe("useCreateJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful responses
    mockOrder.mockResolvedValue({ data: [], error: null });
    mockEq.mockResolvedValue({ data: [], error: null });
    mockIn.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  describe("initial state", () => {
    it("should have correct initial state", async () => {
      const { result } = renderHook(() => useCreateJob());

      expect(result.current.isCreateOpen).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.fetchError).toBeNull();
      expect(result.current.newJob.scheduled_time).toBe("09:00");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should fetch clients and staff on mount", async () => {
      const mockClients = [
        { id: "client-1", name: "Test Client", address: null, phone: null, email: null },
      ];
      const mockStaffRoles = [{ user_id: "staff-1" }];
      const mockProfiles = [{ user_id: "staff-1", full_name: "John Doe" }];

      mockOrder.mockResolvedValue({ data: mockClients, error: null });
      mockEq.mockResolvedValue({ data: mockStaffRoles, error: null });
      mockIn.mockResolvedValue({ data: mockProfiles, error: null });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clients).toHaveLength(1);
      expect(result.current.staffList).toHaveLength(1);
    });
  });

  describe("fetchClientsAndStaff", () => {
    it("should fetch clients ordered by name", async () => {
      const mockClients = [
        { id: "1", name: "Alpha", address: null, phone: null, email: null },
        { id: "2", name: "Beta", address: null, phone: null, email: null },
      ];
      mockOrder.mockResolvedValue({ data: mockClients, error: null });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clients).toEqual(mockClients);
    });

    it("should set error state on clients fetch failure", async () => {
      mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fetchError).toContain("Failed to load clients");
      expect(toast.error).toHaveBeenCalled();
    });

    it("should set error state on staff roles fetch failure", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockEq.mockResolvedValue({ data: null, error: { message: "Roles error" } });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fetchError).toContain("Failed to load staff roles");
    });

    it("should handle empty staff list", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });
      mockEq.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.staffList).toEqual([]);
    });
  });

  describe("handleCreateJob", () => {
    it("should show error when client_id is missing", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "",
          location: "Test Location",
          assigned_staff_id: "staff-1",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should show error when location is missing", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "",
          assigned_staff_id: "staff-1",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
    });

    it("should show error when assigned_staff_id is missing", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
    });

    it("should parse checklist from newlines", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
          checklist: "Task 1\nTask 2\nTask 3",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          checklist: ["Task 1", "Task 2", "Task 3"],
        }),
      );
    });

    it("should filter empty checklist items", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
          checklist: "Task 1\n\n  \nTask 2",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          checklist: ["Task 1", "Task 2"],
        }),
      );
    });

    it("should show success toast on creation", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(toast.success).toHaveBeenCalledWith("Job created successfully!");
    });

    it("should reset form after creation", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setIsCreateOpen(true);
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
          notes: "Some notes",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(result.current.isCreateOpen).toBe(false);
      expect(result.current.newJob.client_id).toBe("");
      expect(result.current.newJob.notes).toBe("");
    });

    it("should call onJobCreated callback", async () => {
      const onJobCreated = vi.fn();
      const { result } = renderHook(() => useCreateJob(onJobCreated));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(onJobCreated).toHaveBeenCalled();
    });

    it("should show error toast on failure", async () => {
      mockInsert.mockResolvedValue({ error: new Error("Insert failed") });

      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setNewJob({
          ...result.current.newJob,
          client_id: "client-1",
          location: "Test Location",
          assigned_staff_id: "staff-1",
        });
      });

      await act(async () => {
        await result.current.handleCreateJob();
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to create job");
    });
  });

  describe("dialog state", () => {
    it("should toggle isCreateOpen", async () => {
      const { result } = renderHook(() => useCreateJob());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isCreateOpen).toBe(false);

      act(() => {
        result.current.setIsCreateOpen(true);
      });

      expect(result.current.isCreateOpen).toBe(true);
    });
  });
});
