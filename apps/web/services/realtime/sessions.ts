import { database } from "@/firebase.client";
import { ref, set, get, update, onValue, off, push, serverTimestamp, remove } from "firebase/database";
import { SessionRealtime, VideoEvent, SessionCreationEvent, VideoChangeEvent } from "@/types/session";
import { Timestamp } from "firebase/firestore";
import { getSessionById } from "@/services/sessions";
// import { setUserCurrentVideo } from "@/services/users";

/**
 * Initialize a session in the realtime database
 * This should be called after the Firestore session document is created
 */
export async function initializeRealtimeSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    
    // Only initialize if not already set up
    if (!snapshot.exists()) {
      const initialState: SessionRealtime = {
        screen: "lobby",
        participants: {
          [userId]: {
            active: true
          }
        },
        sessionEvents: []
      };
      
      await set(sessionRef, initialState);
      
      // Add session creation event
      await addSessionCreationEvent(sessionId, userId);
      
      console.log(`Realtime session ${sessionId} initialized`);
    } else {
      // If session exists, just update current user's participant status
      await update(ref(database, `sessions/${sessionId}/participants/${userId}`), {
        active: true
      });
      console.log(`User ${userId} marked as active in existing realtime session ${sessionId}`);
    }
  } catch (error) {
    console.error("Error initializing realtime session:", error);
    throw error; // Rethrow so calling function can handle it
  }
}

/**
 * Add a session creation event
 */
export async function addSessionCreationEvent(sessionId: string, userId: string): Promise<void> {
  try {
    const eventsRef = ref(database, `sessions/${sessionId}/sessionEvents`);
    const newEventRef = push(eventsRef);
    
    const event: SessionCreationEvent = {
      id: newEventRef.key || '',
      type: "session_created",
      sessionId: sessionId,
      timestamp: Timestamp.now(),
      userId: userId
    };
    
    await set(newEventRef, event);
  } catch (error) {
    console.error("Error adding session creation event:", error);
  }
}

/**
 * Add a video event (play, pause, seek)
 */
export async function addVideoEvent(
  sessionId: string,
  userId: string,
  eventType: 'play' | 'pause' | 'seek',
  currentTime: number,
  seekTime?: number
): Promise<void> {
  try {
    // Ensure video state exists
    const videoStateRef = ref(database, `sessions/${sessionId}/videoState`);
    const snapshot = await get(videoStateRef);
    
    if (!snapshot.exists()) {
      // Initialize video state if it doesn't exist
      await update(videoStateRef, {
        id: '',  // This will be set when a video is selected
        events: [],
        participantTimes: {}
      });
    }
    
    // Add the new event
    const eventsRef = ref(database, `sessions/${sessionId}/videoState/events`);
    const newEventRef = push(eventsRef);
    
    let event: VideoEvent;
    
    if (eventType === 'seek' && seekTime !== undefined) {
      event = {
        id: newEventRef.key || '',
        type: eventType,
        timestamp: Timestamp.now(),
        userId,
        currentTime,
        seekTime
      };
    } else {
      event = {
        id: newEventRef.key || '',
        type: eventType as 'play' | 'pause',
        timestamp: Timestamp.now(),
        userId,
        currentTime
      };
    }
    
    await set(newEventRef, event);
    
    // Update participant time
    await updateParticipantTime(sessionId, userId, currentTime);
    
    // Also update the screen state if it's not already set to "yt"
    const sessionRef = ref(database, `sessions/${sessionId}`);
    const sessionSnapshot = await get(sessionRef);
    
    if (sessionSnapshot.exists()) {
      const session = sessionSnapshot.val() as SessionRealtime;
      if (session.screen !== "yt") {
        await update(sessionRef, { screen: "yt" });
      }
    }
  } catch (error) {
    console.error(`Error adding ${eventType} event:`, error);
  }
}

/**
 * Update participant's current time
 */
export async function updateParticipantTime(
  sessionId: string,
  userId: string,
  currentTime: number
): Promise<void> {
  try {
    const participantTimeRef = ref(database, `sessions/${sessionId}/videoState/participantTimes/${userId}`);
    await update(participantTimeRef, {
      currentTime,
      lastActive: Timestamp.now()
    });
  } catch (error) {
    console.error("Error updating participant time:", error);
  }
}

/**
 * Set the video ID for the session
 */
export async function setVideoId(
  sessionId: string,
  videoId: string
): Promise<void> {
  try {
    await update(ref(database, `sessions/${sessionId}/videoState`), {
      id: videoId
    });
  } catch (error) {
    console.error("Error setting video ID:", error);
  }
}

/**
 * Set the video ID for the session and emit a video change event
 * This function should be called after verifying moderator status and updating Firestore
 */
export async function changeVideo(
  sessionId: string,
  userId: string,
  videoId: string
): Promise<void> {
  try {
    // Update the video ID in the realtime database
    await update(ref(database, `sessions/${sessionId}/videoState`), {
      id: videoId
    });
    
    // Add a video change event
    const eventsRef = ref(database, `sessions/${sessionId}/videoState/events`);
    const newEventRef = push(eventsRef);
    
    const event: VideoChangeEvent = {
      id: newEventRef.key || '',
      type: "video_change",
      timestamp: Timestamp.now(),
      userId,
      videoId
    };
    
    await set(newEventRef, event);
    
    // Update screen state to ensure we're in video view
    await update(ref(database, `sessions/${sessionId}`), { 
      screen: "yt" 
    });
    
    console.log(`Changed video to ${videoId} in realtime database for session ${sessionId}`);
  } catch (error) {
    console.error("Error changing video in realtime database:", error);
    throw error; // Re-throw to allow caller to handle the error
  }
}

/**
 * Play video
 */
export async function playVideo(
  sessionId: string,
  userId: string,
  currentTime: number
): Promise<void> {
  await addVideoEvent(sessionId, userId, 'play', currentTime);
}

/**
 * Pause video
 */
export async function pauseVideo(
  sessionId: string,
  userId: string,
  currentTime: number
): Promise<void> {
  await addVideoEvent(sessionId, userId, 'pause', currentTime);
}

/**
 * Seek video
 */
export async function seekVideo(
  sessionId: string,
  userId: string,
  currentTime: number,
  seekTime: number
): Promise<void> {
  await addVideoEvent(sessionId, userId, 'seek', currentTime, seekTime);
}

/**
 * Update screen state
 */
export async function updateScreenState(
  sessionId: string,
  screen: SessionRealtime['screen']
): Promise<void> {
  try {
    await update(ref(database, `sessions/${sessionId}`), {
      screen
    });
  } catch (error) {
    console.error("Error updating screen state:", error);
  }
}

/**
 * Update user activity in participants
 */
export async function updateUserActivity(
  sessionId: string,
  userId: string,
  isActive: boolean = true
): Promise<void> {
  try {
    await update(ref(database, `sessions/${sessionId}/participants/${userId}`), {
      active: isActive
    });
  } catch (error) {
    console.error("Error updating user activity:", error);
  }
}

/**
 * Subscribe to session changes
 */
export function subscribeToSession(
  sessionId: string,
  callback: (data: SessionRealtime | null) => void
): () => void {
  const sessionRef = ref(database, `sessions/${sessionId}`);
  
  onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as SessionRealtime);
    } else {
      callback(null);
    }
  });
  
  return () => off(sessionRef);
}

/**
 * Subscribe to video state changes only
 */
export function subscribeToVideoState(
  sessionId: string,
  callback: (data: SessionRealtime['videoState'] | null) => void
): () => void {
  const videoStateRef = ref(database, `sessions/${sessionId}/videoState`);
  
  onValue(videoStateRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as SessionRealtime['videoState']);
    } else {
      callback(null);
    }
  });
  
  return () => off(videoStateRef);
}

/**
 * Subscribe to video events only
 */
export function subscribeToVideoEvents(
  sessionId: string,
  callback: (events: VideoEvent[]) => void
): () => void {
  const eventsRef = ref(database, `sessions/${sessionId}/videoState/events`);
  
  onValue(eventsRef, (snapshot) => {
    if (snapshot.exists()) {
      try {
        const eventsObj = snapshot.val();
        
        // Convert raw events from database to proper VideoEvent objects
        const events = Object.values(eventsObj).map((event: any) => {
          // Ensure timestamp is properly formatted for Firestore compatibility
          if (event.timestamp && typeof event.timestamp === 'object') {
            // If timestamp is already in Firestore format, use it
            if (event.timestamp.seconds !== undefined) {
              try {
                // Try to convert to Firestore Timestamp
                event.timestamp = new Timestamp(
                  event.timestamp.seconds,
                  event.timestamp.nanoseconds || 0
                );
              } catch (e) {
                console.error("Failed to convert timestamp:", e);
              }
            }
          } else if (typeof event.timestamp === 'number') {
            // If timestamp is a number, convert to Firestore Timestamp
            const seconds = Math.floor(event.timestamp / 1000);
            const nanoseconds = (event.timestamp % 1000) * 1000000;
            try {
              event.timestamp = new Timestamp(seconds, nanoseconds);
            } catch (e) {
              console.error("Failed to convert numeric timestamp:", e);
            }
          }
          
          return event;
        }) as VideoEvent[];
        
        callback(events);
      } catch (error) {
        console.error("Error processing video events from database:", error);
        callback([]);
      }
    } else {
      callback([]);
    }
  });
  
  return () => off(eventsRef);
}

/**
 * Subscribe to screen state changes only
 */
export function subscribeToScreenState(
  sessionId: string,
  callback: (screen: SessionRealtime['screen']) => void
): () => void {
  const screenRef = ref(database, `sessions/${sessionId}/screen`);
  
  onValue(screenRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as SessionRealtime['screen']);
    } else {
      callback('lobby'); // Default screen
    }
  });
  
  return () => off(screenRef);
}

/**
 * Cleanup user data when leaving a session
 */
export async function leaveRealtimeSession(
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    // Mark user as inactive in realtime participants
    await update(ref(database, `sessions/${sessionId}/participants/${userId}`), {
      active: false
    });
    
    // Remove from participant times if they exist
    try {
      const participantTimeRef = ref(database, `sessions/${sessionId}/videoState/participantTimes/${userId}`);
      const snapshot = await get(participantTimeRef);
      if (snapshot.exists()) {
        await remove(participantTimeRef);
      }
    } catch (error) {
      console.error("Error removing participant time:", error);
    }
    
    console.log(`User ${userId} left realtime session ${sessionId}`);
  } catch (error) {
    console.error("Error leaving realtime session:", error);
  }
}

/**
 * Clear the current video from the session in the Realtime DB
 * This function should be called after verification and Firestore updates
 */
export async function clearVideo(
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    // Update screen state to search
    await update(ref(database, `sessions/${sessionId}`), { 
      screen: "search" 
    });
    
    // Clear the video state
    await update(ref(database, `sessions/${sessionId}/videoState`), {
      id: ""
    });
    
    // Add a video change event
    const eventsRef = ref(database, `sessions/${sessionId}/videoState/events`);
    const newEventRef = push(eventsRef);
    
    const event: VideoChangeEvent = {
      id: newEventRef.key || '',
      type: "video_change",
      timestamp: Timestamp.now(),
      userId,
      videoId: ""
    };
    
    await set(newEventRef, event);
    
    console.log(`Cleared video in realtime database for session ${sessionId}`);
  } catch (error) {
    console.error("Error clearing video in realtime database:", error);
    throw error;
  }
}

/**
 * Check if a user is the moderator of a session
 */
export async function isSessionModerator(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const session = await getSessionById(sessionId);
    return session?.moderator === userId;
  } catch (error) {
    console.error("Error checking if user is session moderator:", error);
    return false;
  }
}

/**
 * Clean up old events from the session to reduce database size
 * Remove events older than the specified time (in seconds)
 */
export async function cleanupOldEvents(
  sessionId: string,
  olderThanSeconds: number = 5
): Promise<void> {
  try {
    const eventsRef = ref(database, `sessions/${sessionId}/videoState/events`);
    const snapshot = await get(eventsRef);
    
    if (!snapshot.exists()) return;
    
    const events = snapshot.val();
    const currentTime = Timestamp.now().seconds;
    const deletePromises: Promise<void>[] = [];
    
    Object.entries(events).forEach(([key, eventData]: [string, any]) => {
      const eventTime = eventData.timestamp?.seconds;
      
      if (eventTime && (currentTime - eventTime) > olderThanSeconds) {
        const eventRef = ref(database, `sessions/${sessionId}/videoState/events/${key}`);
        deletePromises.push(remove(eventRef));
      }
    });
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old events from session ${sessionId}`);
    }
  } catch (error) {
    console.error("Error cleaning up old events:", error);
  }
}

/**
 * Remove current session from realtime DB when it is removed
 */
export async function removeRealtimeSession(
  sessionId: string
): Promise<void> {
  try {
    const sessionRef = ref(database, `sessions/${sessionId}`);
    await remove(sessionRef);
    console.log(`Removed realtime session ${sessionId}`);
  } catch (error) {
    console.error("Error removing realtime session:", error);
    throw error;
  }
}

/**
 * Get the video state for a session
 */
export async function getVideoState(
  sessionId: string
): Promise<SessionRealtime['videoState'] | null> {
  try {
    const videoStateRef = ref(database, `sessions/${sessionId}/videoState`);
    const snapshot = await get(videoStateRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as SessionRealtime['videoState'];
    }
    return null;
  } catch (error) {
    console.error("Error getting video state:", error);
    return null;
  }
}

/**
 * Automatically mark participant inactive if disconnected for too long
 */
export async function markInactiveParticipants(
  sessionId: string, 
  timeoutSeconds: number = 30
): Promise<void> {
  try {
    const participantsRef = ref(database, `sessions/${sessionId}/participants`);
    const videoStateRef = ref(database, `sessions/${sessionId}/videoState/participantTimes`);
    
    // Get current participants and their times
    const [participantsSnapshot, timesSnapshot] = await Promise.all([
      get(participantsRef),
      get(videoStateRef)
    ]);
    
    if (!participantsSnapshot.exists()) return;
    
    const participants = participantsSnapshot.val();
    const participantTimes = timesSnapshot.exists() ? timesSnapshot.val() : {};
    const currentTime = Timestamp.now();
    const updates: {[path: string]: any} = {};
    
    // Check each active participant
    Object.entries(participants).forEach(([userId, data]: [string, any]) => {
      if (data.active === true) {
        const lastActiveTime = participantTimes[userId]?.lastActive;
        
        if (lastActiveTime) {
          // Convert Firebase timestamp to seconds
          const lastActiveSeconds = lastActiveTime.seconds !== undefined 
            ? lastActiveTime.seconds
            : (lastActiveTime.toDate ? lastActiveTime.toDate().getTime() / 1000 : 0);
          
          // If last active time is older than timeout, mark as inactive
          if (currentTime.seconds - lastActiveSeconds > timeoutSeconds) {
            updates[`sessions/${sessionId}/participants/${userId}/active`] = false;
            console.log(`Marked participant ${userId} as inactive due to timeout`);
          }
        }
      }
    });
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await update(ref(database), updates);
    }
  } catch (error) {
    console.error("Error marking inactive participants:", error);
  }
}