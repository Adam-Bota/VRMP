import React, { createContext, useContext } from "react";
import { SessionRealtime } from "@/types/session";

interface SessionContextValue {
  session: SessionRealtime | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ session, children }: { session: SessionRealtime | null; children: React.ReactNode }) => (
  <SessionContext.Provider value={{ session }}>{children}</SessionContext.Provider>
);

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context.session;
}
