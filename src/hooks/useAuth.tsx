import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const fetchUserRole = async (userId: string): Promise<AppRole> => {
    try {
      const { data, error } = await supabase.rpc("get_user_role", { _user_id: userId });
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return (data as AppRole) || null;
    } catch (err) {
      console.error("Exception fetching user role:", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // Get existing session first
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        // Fetch role BEFORE setting loading to false
        const userRole = await fetchUserRole(existingSession.user.id);
        if (mounted) {
          setRole(userRole);
          setLoading(false);
          setInitialLoadComplete(true);
        }
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // For sign in events, update state and fetch role
        if (event === "SIGNED_IN" && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Fetch role for the new session
          const userRole = await fetchUserRole(newSession.user.id);
          if (mounted) {
            setRole(userRole);
            setLoading(false);
          }
        } 
        // For sign out, clear all state
        else if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
        }
        // For token refresh, just update session but keep role
        else if (event === "TOKEN_REFRESHED" && newSession) {
          setSession(newSession);
          setUser(newSession.user);
        }
        // For initial session (on page load), this is handled by initializeAuth
        else if (event === "INITIAL_SESSION") {
          // Already handled by initializeAuth above
          if (!initialLoadComplete && !newSession) {
            setLoading(false);
            setInitialLoadComplete(true);
          }
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
    // On success, the onAuthStateChange handler will update state
    return { error };
  };

  // Role is now assigned server-side via database trigger (default: staff)
  // Admin promotion requires an existing admin to use promote_user_to_admin()
  const signUp = async (email: string, password: string, fullName: string, _role?: AppRole) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });

    // Role is automatically assigned as 'staff' by handle_new_user trigger
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const refreshRole = async () => {
    if (!user) return;
    const nextRole = await fetchUserRole(user.id);
    setRole(nextRole);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut, refreshRole }}>
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
