import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from './useRateLimit';

// Mock supabase
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('useRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have initial state with no blocking', () => {
      const { result } = renderHook(() => useRateLimit());

      expect(result.current.rateLimitState).toEqual({
        isBlocked: false,
        failedAttempts: 0,
        blockExpiresAt: null,
        remainingMinutes: 0,
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should return false when user not blocked', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: false, failed_attempts: 0, block_expires_at: null }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      let isBlocked: boolean;
      await act(async () => {
        isBlocked = await result.current.checkRateLimit('test@example.com');
      });

      expect(isBlocked!).toBe(false);
      expect(result.current.rateLimitState.isBlocked).toBe(false);
    });

    it('should return true when user is blocked', async () => {
      const blockExpiry = new Date(Date.now() + 15 * 60000).toISOString();
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: true, failed_attempts: 5, block_expires_at: blockExpiry }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      let isBlocked: boolean;
      await act(async () => {
        isBlocked = await result.current.checkRateLimit('test@example.com');
      });

      expect(isBlocked!).toBe(true);
      expect(result.current.rateLimitState.isBlocked).toBe(true);
      expect(result.current.rateLimitState.failedAttempts).toBe(5);
    });

    it('should update state with failed attempts count', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: false, failed_attempts: 3, block_expires_at: null }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.checkRateLimit('test@example.com');
      });

      expect(result.current.rateLimitState.failedAttempts).toBe(3);
    });

    it('should calculate remaining block minutes correctly', async () => {
      // Block expires in 10 minutes
      const blockExpiry = new Date(Date.now() + 10 * 60000).toISOString();
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: true, failed_attempts: 5, block_expires_at: blockExpiry }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.checkRateLimit('test@example.com');
      });

      // Should be approximately 10 minutes (may vary by a minute due to timing)
      expect(result.current.rateLimitState.remainingMinutes).toBeGreaterThanOrEqual(9);
      expect(result.current.rateLimitState.remainingMinutes).toBeLessThanOrEqual(11);
    });

    it('should normalize email to lowercase', async () => {
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: false, failed_attempts: 0, block_expires_at: null }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.checkRateLimit('TEST@EXAMPLE.COM');
      });

      expect(mockRpc).toHaveBeenCalledWith('check_login_rate_limit', {
        p_email: 'test@example.com',
      });
    });

    it('should return false on RPC error (fail open)', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const { result } = renderHook(() => useRateLimit());

      let isBlocked: boolean;
      await act(async () => {
        isBlocked = await result.current.checkRateLimit('test@example.com');
      });

      expect(isBlocked!).toBe(false);
    });

    it('should return false when data is empty', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      let isBlocked: boolean;
      await act(async () => {
        isBlocked = await result.current.checkRateLimit('test@example.com');
      });

      expect(isBlocked!).toBe(false);
    });
  });

  describe('recordAttempt', () => {
    it('should record failed login attempt', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.recordAttempt('test@example.com', false);
      });

      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        p_email: 'test@example.com',
        p_success: false,
        p_ip_address: null,
      });
    });

    it('should record successful login attempt', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.recordAttempt('test@example.com', true);
      });

      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        p_email: 'test@example.com',
        p_success: true,
        p_ip_address: null,
      });
    });

    it('should refresh rate limit state after failed attempt', async () => {
      // First call is record_login_attempt, second is check_login_rate_limit
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: [{ is_blocked: false, failed_attempts: 2, block_expires_at: null }],
          error: null,
        });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.recordAttempt('test@example.com', false);
      });

      // Should have called check_login_rate_limit after recording failure
      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockRpc).toHaveBeenLastCalledWith('check_login_rate_limit', {
        p_email: 'test@example.com',
      });
    });

    it('should clear state after successful login', async () => {
      // First set up a blocked state
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: true, failed_attempts: 5, block_expires_at: null }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.checkRateLimit('test@example.com');
      });

      expect(result.current.rateLimitState.isBlocked).toBe(true);

      // Now record successful login
      mockRpc.mockResolvedValue({ data: null, error: null });

      await act(async () => {
        await result.current.recordAttempt('test@example.com', true);
      });

      expect(result.current.rateLimitState).toEqual({
        isBlocked: false,
        failedAttempts: 0,
        blockExpiresAt: null,
        remainingMinutes: 0,
      });
    });

    it('should not throw on RPC error', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRateLimit());

      await expect(
        act(async () => {
          await result.current.recordAttempt('test@example.com', false);
        })
      ).resolves.not.toThrow();
    });
  });

  describe('clearRateLimitState', () => {
    it('should reset all state to initial values', async () => {
      // First set up some state
      mockRpc.mockResolvedValue({
        data: [{ is_blocked: true, failed_attempts: 3, block_expires_at: new Date().toISOString() }],
        error: null,
      });

      const { result } = renderHook(() => useRateLimit());

      await act(async () => {
        await result.current.checkRateLimit('test@example.com');
      });

      expect(result.current.rateLimitState.isBlocked).toBe(true);

      // Now clear
      act(() => {
        result.current.clearRateLimitState();
      });

      expect(result.current.rateLimitState).toEqual({
        isBlocked: false,
        failedAttempts: 0,
        blockExpiresAt: null,
        remainingMinutes: 0,
      });
    });
  });
});
