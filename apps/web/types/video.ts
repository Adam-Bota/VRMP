import { Timestamp } from "firebase/firestore";
import { Session } from "./session";

/**
 * Enhanced video data interface for Firestore
 */
export interface VideoDocument {
  id: string;
  title: string;
  sessions: {
    [sessionId: string]: VideoSession;
  };
}

/**
 * Video session type within the video document
 */
export interface VideoSession {
  title: string;
  startTime: number;
  endTime: number;
  createdBy: string;
  createdAt: Timestamp;
  status: "scheduled" | "live" | "ended";
  activeParticipants: string[]; // List of active participant IDs
  invitedParticipants: { [id: string]: boolean }; // List of invited participant IDs with boolean showing acceptance status
}

/**
 * Simplified video meta data for Realtime DB
 */
export interface VideoMeta {
  sessions: {
    [sessionId: string]: {
      title: string;
    };
  };
}
