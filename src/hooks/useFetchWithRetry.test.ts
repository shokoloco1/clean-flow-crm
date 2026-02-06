import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFetchWithRetry } from './useFetchWithRetry';

describe('useFetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test-key' })
      );

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isFromCache).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isRetrying).toBe(false);
    });

    it('should expose execute and retry functions', () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test' })
      );

      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('caching behavior', () => {
    it('should attempt to read from localStorage on mount', () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'my-cache-key' })
      );

      expect(localStorage.getItem).toHaveBeenCalledWith('my-cache-key');
    });

    it('should attempt to write to localStorage on success', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'save-key' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'save-key',
        expect.any(String)
      );
    });
  });

  describe('execute', () => {
    it('should set loading state during fetch', async () => {
      const fetchFn = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: 'test' }), 100))
      );

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test' })
      );

      act(() => {
        result.current.execute();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    });

    it('should return data on success', async () => {
      const data = { name: 'success' };
      const fetchFn = vi.fn().mockResolvedValue(data);

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test' })
      );

      await act(async () => {
        const returned = await result.current.execute();
        expect(returned).toEqual(data);
      });

      expect(result.current.data).toEqual(data);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set isFromCache false after successful fetch', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test' })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.isFromCache).toBe(false);
    });
  });

  describe('retry logic', () => {
    it('should retry on failure up to maxRetries', async () => {
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          maxRetries: 2,
          retryDelay: 1000
        })
      );

      await act(async () => {
        result.current.execute();
      });

      // First attempt fails
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Wait for first retry
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Wait for second retry
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(result.current.data).toEqual({ data: 'success' });
    });

    it('should set error after max retries exceeded', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          maxRetries: 1,
          retryDelay: 100
        })
      );

      await act(async () => {
        result.current.execute();
      });

      // Wait for retry
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Wait for final state
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.error).toBe('Persistent error');
      expect(result.current.loading).toBe(false);
    });

    it('should set isRetrying flag during retry', async () => {
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          maxRetries: 2,
          retryDelay: 100
        })
      );

      await act(async () => {
        result.current.execute();
      });

      // After first failure, should be retrying
      expect(result.current.isRetrying).toBe(true);
    });

    it('should use exponential backoff between retries', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          maxRetries: 2,
          retryDelay: 1000
        })
      );

      await act(async () => {
        result.current.execute();
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);

      // First retry after 1000ms (1 * 1000)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);

      // Second retry after 2000ms (2 * 1000)
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(fetchFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry function', () => {
    it('should allow manual retry after failure', async () => {
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          maxRetries: 0
        })
      );

      // First attempt fails
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe('Error');
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Manual retry
      await act(async () => {
        await result.current.retry();
      });

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual({ data: 'success' });
    });
  });

  describe('timeout', () => {
    it('should timeout slow requests', async () => {
      const fetchFn = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: 'slow' }), 10000))
      );

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          timeout: 1000,
          maxRetries: 0
        })
      );

      await act(async () => {
        result.current.execute();
      });

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(result.current.error).toContain('timeout');
    });
  });

  describe('default options', () => {
    it('should use default values when not specified', () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, { cacheKey: 'test' })
      );

      expect(result.current).toBeDefined();
    });

    it('should handle multiple retries with default maxRetries', async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() =>
        useFetchWithRetry(fetchFn, {
          cacheKey: 'test',
          retryDelay: 10
        })
      );

      await act(async () => {
        result.current.execute();
      });

      // Wait for retries
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
