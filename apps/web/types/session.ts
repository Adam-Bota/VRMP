import { Timestamp } from "firebase/firestore";

/**
 * Base session interface
 */
export interface Session {
  id: string;
  createdAt?: Timestamp;
  createdBy: string;
  participants: string[];
  moderator: string;
  currentVideoId?: string;
  currentVideo?: string;
  lastVideoUpdate?: Timestamp;
}

/**
 * Session information for metatdata doc
 */
export interface SessionMeta {
  createdBy: string;
}

/**
 * Base event interface
 */
export interface SessionEvent {
  id: string;
  timestamp: Timestamp;
  userId: string;
}

/**
 * Session creation event
 */
export interface SessionCreationEvent extends SessionEvent {
  type: "session_created";
  sessionId: string;
}

/**
 * Video control events
 */
export interface PlayEvent extends SessionEvent {
  type: "play";
  currentTime: number;
}

export interface PauseEvent extends SessionEvent {
  type: "pause";
  currentTime: number;
}

export interface SeekEvent extends SessionEvent {
  type: "seek";
  currentTime: number;
  seekTime: number;
}

export interface VideoChangeEvent extends SessionEvent {
  type: "video_change";
  videoId: string;
}

export type VideoEvent = PlayEvent | PauseEvent | SeekEvent | VideoChangeEvent;

// Session information for the realtime db
export interface SessionRealtime {
  screen: "yt" | "search" | "chat" | "lobby";
  videoState?: {
    id: string;
    events: VideoEvent[];
    participantTimes: {
      [userId: string]: {
        currentTime: number;
        lastActive: Timestamp;
      };
    };
  };
  chat?: {
    messages: {
      id: string;
      userId: string;
      text: string;
      timestamp: number;
    }[];
  };
  participants?: {
    [userId: string]: {
      active: boolean;
    };
  };
  sessionEvents?: SessionCreationEvent[];
}

/**
 * Session status type
 */
export type SessionStatus = "scheduled" | "live" | "ended";
