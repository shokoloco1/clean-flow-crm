import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RateLimitState {
  isBlocked: boolean;
  failedAttempts: number;
  blockExpiresAt: Date | null;
  remainingMinutes: number;
}

export function useRateLimit() {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isBlocked: false,
    failedAttempts: 0,
    blockExpiresAt: null,
    remainingMinutes: 0,
  });

  const checkRateLimit = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc("check_login_rate_limit", {
        p_email: email.toLowerCase(),
      });

      if (error) {
        return false; // Allow login attempt if check fails
      }

      if (data && data.length > 0) {
        const result = data[0];
        const isBlocked = result.is_blocked;
        const blockExpiresAt = result.block_expires_at
          ? new Date(result.block_expires_at)
          : null;
        const remainingMinutes = blockExpiresAt
          ? Math.ceil((blockExpiresAt.getTime() - Date.now()) / 60000)
          : 0;

        setRateLimitState({
          isBlocked,
          failedAttempts: result.failed_attempts,
          blockExpiresAt,
          remainingMinutes: Math.max(0, remainingMinutes),
        });

        return isBlocked;
      }

      return false;
    } catch (err) {
      return false;
    }
  }, []);

  const recordAttempt = useCallback(
    async (email: string, success: boolean) => {
      try {
        await supabase.rpc("record_login_attempt", {
          p_email: email.toLowerCase(),
          p_success: success,
          p_ip_address: null, // IP is handled server-side if needed
        });

        // Refresh rate limit state after recording
        if (!success) {
          await checkRateLimit(email);
        } else {
          // Clear state on successful login
          setRateLimitState({
            isBlocked: false,
            failedAttempts: 0,
            blockExpiresAt: null,
            remainingMinutes: 0,
          });
        }
      } catch (err) {
        // Silently fail - don't block user action
      }
    },
    [checkRateLimit]
  );

  const clearRateLimitState = useCallback(() => {
    setRateLimitState({
      isBlocked: false,
      failedAttempts: 0,
      blockExpiresAt: null,
      remainingMinutes: 0,
    });
  }, []);

  return {
    rateLimitState,
    checkRateLimit,
    recordAttempt,
    clearRateLimitState,
  };
}
