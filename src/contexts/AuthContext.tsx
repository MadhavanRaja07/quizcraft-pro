import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { AuthSession, Role, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  logout: () => void;
  refresh: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(api.getSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const s = await api.login(email, password);
    setSession(s);
    return s.user;
  }, []);

  const signup = useCallback(async (input: { name: string; email: string; password: string; role: Role }) => {
    const s = await api.signup(input);
    setSession(s);
    return s.user;
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setSession(null);
  }, []);

  const refresh = useCallback((user: User) => {
    setSession((s) => (s ? { ...s, user } : s));
  }, []);

  const value = useMemo(
    () => ({ user: session?.user ?? null, loading, login, signup, logout, refresh }),
    [session, loading, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
