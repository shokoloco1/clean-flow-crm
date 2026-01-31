import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// LocalStorage keys for persistent cache
const ROLE_CACHE_KEY = "cleanflow_user_role";
const USER_ID_CACHE_KEY = "cleanflow_user_id";

// Get cached role from localStorage (instant)
const getCachedRole = (userId: string): AppRole => {
  try {
    const cachedUserId = localStorage.getItem(USER_ID_CACHE_KEY);
    if (cachedUserId === userId) {
      const role = localStorage.getItem(ROLE_CACHE_KEY);
      if (role === "admin" || role === "staff") {
        return role;
      }
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
};

// Save role to localStorage
const setCachedRole = (userId: string, role: AppRole) => {
  try {
    if (role) {
      localStorage.setItem(USER_ID_CACHE_KEY, userId);
      localStorage.setItem(ROLE_CACHE_KEY, role);
    } else {
      localStorage.removeItem(USER_ID_CACHE_KEY);
      localStorage.removeItem(ROLE_CACHE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

// Clear role cache
const clearCachedRole = () => {
  try {
    localStorage.removeItem(USER_ID_CACHE_KEY);
    localStorage.removeItem(ROLE_CACHE_KEY);
  } catch {
    // Ignore
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string, useCache = true): Promise<AppRole> => {
    // First, try localStorage cache for instant load
    if (useCache) {
      const cached = getCachedRole(userId);
      if (cached) {
        return cached;
      }
    }
    
    try {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      const fetchedRole = (data as AppRole) || null;
      // Save to localStorage for next time
      setCachedRole(userId, fetchedRole);
      return fetchedRole;
    } catch (err) {
      console.error("Exception fetching user role:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          
          // Try cached role first for instant display
          const cachedRole = getCachedRole(existingSession.user.id);
          if (cachedRole) {
            setRole(cachedRole);
            setLoading(false);
            // Validate in background (non-blocking)
            fetchUserRole(existingSession.user.id, false).then(freshRole => {
              if (mounted && freshRole && freshRole !== cachedRole) {
                setRole(freshRole);
              }
            });
          } else {
            // No cache, fetch and wait
            const userRole = await fetchUserRole(existingSession.user.id);
            if (mounted) {
              setRole(userRole);
              setLoading(false);
            }
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          // Use setTimeout to avoid blocking
          setTimeout(async () => {
            const userRole = await fetchUserRole(newSession.user.id);
            if (mounted) {
              setRole(userRole);
              setLoading(false);
            }
          }, 0);
        } else if (event === "SIGNED_OUT") {
          clearCachedRole();
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, _role?: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    clearCachedRole();
    await supabase.auth.signOut();
    setRole(null);
  }, []);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    // Clear cache and force fresh fetch
    clearCachedRole();
    const nextRole = await fetchUserRole(user.id, false);
    setRole(nextRole);
  }, [user, fetchUserRole]);

  const value = useMemo(() => ({
    user,
    session,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    refreshRole
  }), [user, session, role, loading, signIn, signUp, signOut, refreshRole]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
