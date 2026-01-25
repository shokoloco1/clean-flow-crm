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

// Cache role to avoid refetching
let cachedRole: AppRole = null;
let cachedUserId: string | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string): Promise<AppRole> => {
    // Return cached role if same user
    if (cachedUserId === userId && cachedRole !== null) {
      return cachedRole;
    }
    
    try {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      // Cache the result
      cachedRole = (data as AppRole) || null;
      cachedUserId = userId;
      return cachedRole;
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
          const userRole = await fetchUserRole(existingSession.user.id);
          if (mounted) {
            setRole(userRole);
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const userRole = await fetchUserRole(newSession.user.id);
          if (mounted) {
            setRole(userRole);
            setLoading(false);
          }
        } else if (event === "SIGNED_OUT") {
          // Clear cache on sign out
          cachedRole = null;
          cachedUserId = null;
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
    cachedRole = null;
    cachedUserId = null;
    await supabase.auth.signOut();
    setRole(null);
  }, []);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    // Clear cache to force refresh
    cachedRole = null;
    cachedUserId = null;
    const nextRole = await fetchUserRole(user.id);
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
