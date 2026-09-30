import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from '../api/client';
import type { User } from '../api/types';

// Token lives in memory, mirrored to sessionStorage so a refresh keeps you
// signed in for this tab only. For production, prefer an httpOnly cookie set
// by the API: it can't be read by injected scripts at all.
const STORAGE_KEY = 'task-board.session';

interface Session {
  token: string;
  user: User;
}

interface AuthValue {
  user: User | null;
  api: ApiClient;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children, baseUrl, fetchImpl }: { children: ReactNode; baseUrl: string; fetchImpl?: typeof fetch }) {
  const [session, setSession] = useState<Session | null>(loadSession);
  const tokenRef = useRef<string | null>(session?.token ?? null);

  const save = useCallback((next: Session | null) => {
    tokenRef.current = next?.token ?? null;
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(STORAGE_KEY);
    setSession(next);
  }, []);

  const api = useMemo(
    () => createApiClient({ baseUrl, fetchImpl, getToken: () => tokenRef.current, onUnauthorized: () => save(null) }),
    [baseUrl, fetchImpl, save],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      api,
      login: async (email, password) => save(await api.login(email, password)),
      register: async (name, email, password) => save(await api.register(name, email, password)),
      logout: () => save(null),
    }),
    [api, save, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
