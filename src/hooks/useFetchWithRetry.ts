import { useState, useCallback, useRef, useEffect } from 'react';

interface UseFetchWithRetryOptions<T> {
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
}

export function useFetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  options: UseFetchWithRetryOptions<T>
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
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        reject(new Error('Request timeout - taking too long to respond'));
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

  const execute = useCallback(async (isRetry = false) => {
    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      retryCount: isRetry ? prev.retryCount + 1 : 0,
    }));

    try {
      const result = await executeWithTimeout();
      saveToCache(result);
      setState({
        data: result,
        loading: false,
        error: null,
        isFromCache: false,
        retryCount: 0,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => {
        const newRetryCount = isRetry ? prev.retryCount : 0;
        
        // Auto-retry if under max retries
        if (newRetryCount < maxRetries) {
          retryTimeoutRef.current = setTimeout(() => {
            execute(true);
          }, retryDelay * (newRetryCount + 1)); // Exponential backoff
          
          return {
            ...prev,
            loading: true,
            error: null,
            retryCount: newRetryCount + 1,
          };
        }
        
        // Max retries reached - show error but keep cached data
        return {
          ...prev,
          loading: false,
          error: errorMessage,
          isFromCache: prev.data !== null,
        };
      });
      
      return null;
    }
  }, [executeWithTimeout, saveToCache, maxRetries, retryDelay]);

  const retry = useCallback(() => {
    setState(prev => ({ ...prev, retryCount: 0 }));
    execute(false);
  }, [execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
