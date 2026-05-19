import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { User } from '../types';
import { login as apiLogin } from '../services/api';

// HIPAA: auto-logoff after this many ms of inactivity (15 minutes)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const INACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'] as const;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem('rfid_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('rfid_token'));

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('rfid_user');
    sessionStorage.removeItem('rfid_token');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    setUser(result.user);
    setToken(result.token);
    sessionStorage.setItem('rfid_user', JSON.stringify(result.user));
    sessionStorage.setItem('rfid_token', result.token);
  }, []);

  // HIPAA inactivity timeout: reset timer on any user activity, auto-logout when it fires.
  useEffect(() => {
    if (!user) return;

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        window.location.replace('/login?reason=timeout');
      }, INACTIVITY_TIMEOUT_MS);
    }

    INACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      INACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
