import { Session } from "./session";

export interface User {
  id: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  role?: string;
  activeSession: Session | null;
}