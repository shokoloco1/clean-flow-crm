import { useState, useCallback, useRef, useEffect } from 'react';

interface UseFetchWithRetryOptions {
  cacheKey: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isFromCache: boolean;
  retryCount: number;
  isRetrying: boolean;
}

export function useFetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchWithRetryOptions
) {
  const { 
    cacheKey, 
    timeout = 5000, 
    maxRetries = 2, 
    retryDelay = 1000 
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    isFromCache: false,
    retryCount: 0,
    isRetrying: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load cached data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - timestamp < 60 * 60 * 1000) {
          setState(prev => ({ ...prev, data, isFromCache: true }));
        }
      }
    } catch (e) {
      console.warn('Failed to load cached data:', e);
    }
  }, [cacheKey]);

  const saveToCache = useCallback((data: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to cache data:', e);
    }
  }, [cacheKey]);

  const executeWithTimeout = useCallback(async (): Promise<T> => {
    abortControllerRef.current = new AbortController();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
        reject(new Error('Request timeout - server is not responding'));
      }, timeout);

      fetchFn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }, [fetchFn, timeout]);

  const execute = useCallback(async (isRetry = false, currentRetryCount = 0) => {
    if (!isMountedRef.current) return null;

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isRetrying: isRetry,
      retryCount: currentRetryCount,
    }));

    try {
      const result = await executeWithTimeout();
      
      if (!isMountedRef.current) return null;
      
      saveToCache(result);
      setState({
        data: result,
        loading: false,
        error: null,
        isFromCache: false,
        retryCount: 0,
        isRetrying: false,
      });
      return result;
    } catch (error) {
      if (!isMountedRef.current) return null;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const nextRetryCount = currentRetryCount + 1;
      
      // Auto-retry if under max retries
      if (nextRetryCount <= maxRetries) {
        setState(prev => ({
          ...prev,
          loading: true,
          error: null,
          isRetrying: true,
          retryCount: nextRetryCount,
        }));
        
        retryTimeoutRef.current = setTimeout(() => {
          execute(true, nextRetryCount);
        }, retryDelay * nextRetryCount); // Exponential backoff
        
        return null;
      }
      
      // Max retries reached - ALWAYS set loading to false and show error
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isFromCache: prev.data !== null,
        isRetrying: false,
        retryCount: nextRetryCount,
      }));
      
      return null;
    }
  }, [executeWithTimeout, saveToCache, maxRetries, retryDelay]);

  const retry = useCallback(() => {
    execute(false, 0);
  }, [execute]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    execute,
    retry,
  };
}
