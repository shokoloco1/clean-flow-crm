import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitFor, act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { AuthProvider, useAuth } from "./useAuth";

// Mock supabase auth
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockResend = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (...args: unknown[]) => void) =>
        mockOnAuthStateChange(callback),
      resend: (...args: unknown[]) => mockResend(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock window.location
const mockLocation = {
  origin: "http://localhost:3000",
  href: "",
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("useAuth", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("initial state", () => {
    it("should start with loading true", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("should have null user when not authenticated", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.role).toBeNull();
    });
  });

  describe("signIn", () => {
    it("should call supabase signInWithPassword", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("should return error on failed sign in", async () => {
      const mockError = new Error("Invalid credentials");
      mockSignInWithPassword.mockResolvedValue({ error: mockError });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrong");
      });

      expect(signInResult.error).toBe(mockError);
    });

    it("should set loading state during sign in", async () => {
      mockSignInWithPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)),
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.loading).toBe(true);
    });
  });

  describe("signUp", () => {
    it("should call supabase signUp with email redirect", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp(
          "test@example.com",
          "password123",
          "John Doe",
          "Test Business",
          "staff",
        );
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          emailRedirectTo: "http://localhost:3000/auth",
          data: {
            full_name: "John Doe",
            business_name: "Test Business",
            intended_role: "staff",
          },
        },
      });
    });

    it("should include intended role in user metadata", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp(
          "test@example.com",
          "password123",
          "John Doe",
          "Test Business",
          "admin",
        );
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              business_name: "Test Business",
              intended_role: "admin",
            }),
          }),
        }),
      );
    });

    it("should default to staff role when not specified", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp("test@example.com", "password123", "John Doe", "", null);
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              intended_role: "staff",
            }),
          }),
        }),
      );
    });
  });

  describe("signOut", () => {
    it("should call supabase signOut", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("should redirect to auth page", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(window.location.href).toBe("/auth");
    });

    it("should clear cached role", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      // Verify removeItem was called for the cache keys
      expect(localStorage.removeItem).toHaveBeenCalledWith("pulcrix_user_role");
      expect(localStorage.removeItem).toHaveBeenCalledWith("pulcrix_user_id");
    });

    it("should clear user and session state", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "admin", error: null });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.role).toBeNull();
    });
  });

  describe("refreshRole", () => {
    it("should do nothing when no user", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshRole();
      });

      // RPC should not be called when there's no user
      expect(mockRpc).not.toHaveBeenCalledWith("get_user_role", expect.anything());
    });

    it("should fetch fresh role from database", async () => {
      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the initial RPC call count
      mockRpc.mockClear();
      mockRpc.mockResolvedValue({ data: "admin", error: null });

      await act(async () => {
        await result.current.refreshRole();
      });

      expect(mockRpc).toHaveBeenCalledWith("get_user_role", { _user_id: "user-123" });
    });
  });

  describe("emailVerified", () => {
    it("should return false when no user", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.emailVerified).toBe(false);
    });

    it("should return false when email_confirmed_at is null", async () => {
      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.emailVerified).toBe(false);
    });

    it("should return true when email_confirmed_at is set", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        email_confirmed_at: "2024-01-15T10:00:00Z",
      };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.emailVerified).toBe(true);
    });
  });

  describe("role caching", () => {
    it("should attempt to get cached role from localStorage", async () => {
      // Mock localStorage.getItem to return cached values
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === "pulcrix_user_id") return "user-123";
        if (key === "pulcrix_user_role") return "admin";
        return null;
      });

      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have attempted to read from localStorage
      expect(localStorage.getItem).toHaveBeenCalledWith("pulcrix_user_id");
      expect(localStorage.getItem).toHaveBeenCalledWith("pulcrix_user_role");
      // Role should be cached admin
      expect(result.current.role).toBe("admin");
    });

    it("should not use cache if user ID does not match", async () => {
      // Mock localStorage.getItem to return different user
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
        if (key === "pulcrix_user_id") return "different-user";
        if (key === "pulcrix_user_role") return "admin";
        return null;
      });

      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fetch fresh role since user ID doesn't match
      expect(mockRpc).toHaveBeenCalledWith("get_user_role", { _user_id: "user-123" });
    });

    it("should save role to localStorage after fetch", async () => {
      // Reset localStorage mock to default (returns null)
      (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify setItem was called with the role data
      expect(localStorage.setItem).toHaveBeenCalledWith("pulcrix_user_role", "staff");
      expect(localStorage.setItem).toHaveBeenCalledWith("pulcrix_user_id", "user-123");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should return error when no user email", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resendResult: any;
      await act(async () => {
        resendResult = await result.current.resendVerificationEmail();
      });

      expect(resendResult.error).toBeDefined();
      expect(resendResult.error.message).toBe("No email found");
    });

    it("should call supabase resend when user has email", async () => {
      const mockUser = { id: "user-123", email: "test@example.com", email_confirmed_at: null };
      const mockSession = { user: mockUser, access_token: "token" };

      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockRpc.mockResolvedValue({ data: "staff", error: null });
      mockResend.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resendVerificationEmail();
      });

      expect(mockResend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
        options: {
          emailRedirectTo: "http://localhost:3000/auth",
        },
      });
    });
  });

  describe("useAuth outside provider", () => {
    it("should throw error when used outside AuthProvider", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Use a try-catch since renderHook doesn't propagate errors the same way
      let thrownError: Error | null = null;
      try {
        renderHook(() => useAuth());
      } catch (error) {
        thrownError = error as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toContain("useAuth must be used within an AuthProvider");

      consoleSpy.mockRestore();
    });
  });
});
