import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api } from '../lib/api';
import type { User, AuthState } from '../types';

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  registerSessionEndSave: (save: () => Promise<void>) => () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'survey_token';
const USER_KEY = 'survey_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const sessionEndSave = useRef<(() => Promise<void>) | null>(null);
  const endingSession = useRef(false);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.auth.login(username, password);
    if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const registerSessionEndSave = useCallback((save: () => Promise<void>) => {
    sessionEndSave.current = save;
    return () => {
      if (sessionEndSave.current === save) sessionEndSave.current = null;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      if (endingSession.current) return;
      endingSession.current = true;
      localStorage.removeItem(TOKEN_KEY);
      try {
        await sessionEndSave.current?.();
        logout();
      } catch {
        // The survey displays the storage error and remains open for recovery.
      } finally {
        endingSession.current = false;
      }
    };
    window.addEventListener('survey:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('survey:unauthorized', handleUnauthorized);
  }, [logout]);

  const hasPermission = useCallback(
    (perm: string) => user?.permissions?.includes(perm) ?? false,
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token && !!user, login, logout, hasPermission, registerSessionEndSave }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
