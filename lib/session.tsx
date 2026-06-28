"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type SessionRole = "company" | "candidate" | "internal";
export interface StafflySession { name: string; role: SessionRole }

interface SessionContextValue {
  session: StafflySession | null;
  ready: boolean;
  login: (session: StafflySession) => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const SESSION_KEY = "staffly_session";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StafflySession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StafflySession;
        if (parsed.name && ["company", "candidate", "internal"].includes(parsed.role)) setSession(parsed);
      }
    } finally {
      setReady(true);
    }
  }, []);

  const login = useCallback((next: StafflySession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, ready, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
