import { auth, db } from "@/firebase.client";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  DocumentData,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  deleteField,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { Session, SessionMeta } from "@/types/session";

const COLLECTION_NAME = "sessions";
const METADATA_COLLECTION = "metadata";

/**
 * Create a new watch session
 */
export async function createSession(
  sessionData: Omit<Session, "id" | "createdAt">
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to create a session");
  }

  // Simplified validation based on updated Session type
  if (!sessionData.createdBy) {
    throw new Error("Missing required session data fields");
  }

  try {
    const sessionsRef = collection(db, COLLECTION_NAME);

    const docRef = await addDoc(sessionsRef, {
      ...sessionData,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      participants: user.uid ? [user.uid] : [],
    });

    const sessionId = docRef.id;

    // Update metadata collection
    const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
    const sessionMeta: SessionMeta = {
      createdBy: user.uid
    };
    
    await setDoc(
      metadataRef,
      {
        [sessionId]: sessionMeta,
      },
      { merge: true }
    );

    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }
}

/**
 * Get sessions by a filter criteria
 */
export async function getSessions(
  filterField: string,
  filterValue: any
): Promise<Session[]> {
  try {
    const sessionsRef = collection(db, COLLECTION_NAME);
    const q = query(sessionsRef, where(filterField, "==", filterValue));

    const querySnapshot = await getDocs(q);
    const sessions: Session[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      sessions.push({
        id: doc.id,
        createdAt: data.createdAt,
        createdBy: data.createdBy,
        participants: data.participants || [],
        moderator: data.moderator,
      });
    });

    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw new Error("Failed to fetch sessions");
  }
}

/**
 * Get a session by ID
 */
export async function getSessionById(
  sessionId: string
): Promise<Session | null> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const data = sessionSnap.data();
    return {
      id: sessionSnap.id,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      participants: data.participants || [],
      moderator: data.moderator,
    };
  } catch (error) {
    console.error("Error fetching session:", error);
    throw new Error("Failed to fetch session");
  }
}

/**
 * Update session details
 */
export async function updateSessionDetails(
  sessionId: string,
  updateData: Partial<Session>
): Promise<void> {
  try {
    // Update in sessions collection
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    await setDoc(sessionRef, updateData, { merge: true });
    
    // Update metadata if title changed
    if (updateData.participants) {
      const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
      await setDoc(
        metadataRef,
        {
          [sessionId]: {
            participants: updateData.participants,
          },
        },
        { merge: true }
      );
    }
    
    /* 
    // Update the same fields in videos collection - COMMENTED OUT AS REQUESTED
    const videoRef = doc(db, "videos", videoId);
    
    // Create an object with only the fields that should be synchronized
    const syncFields: any = {};
    if (updateData.title !== undefined) syncFields.title = updateData.title;
    if (updateData.startTime !== undefined) syncFields.startTime = updateData.startTime;
    if (updateData.endTime !== undefined) syncFields.endTime = updateData.endTime;
    
    // Only update if there are fields to sync
    if (Object.keys(syncFields).length > 0) {
      await setDoc(videoRef, { 
        sessions: {
          [sessionId]: syncFields
        }
      }, { merge: true });
    }
    */
    
    console.log(`Session ${sessionId} updated`);
  } catch (error) {
    console.error("Error updating session details:", error);
    throw new Error("Failed to update session details");
  }
}

/**
 * Join an existing session
 * Adds the user to the participants array
 */
export async function joinSession(
  sessionId: string,
  userId: string
): Promise<void> {
  if (!sessionId || !userId) {
    throw new Error("Session ID and user ID are required");
  }

  try {
    // Check if session exists
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    // Check if user is already a participant
    const sessionData = sessionSnap.data();
    const participants = sessionData.participants || [];

    if (participants.includes(userId)) {
      console.log("User is already a participant in this session");
      return;
    }

    // Add user to participants array in sessions collection
    await setDoc(sessionRef, {
      participants: arrayUnion(userId)
    }, { merge: true });
    
    /*
    // Also update the video document if this session exists there - COMMENTED OUT AS REQUESTED
    if (videoId) {
      const videoRef = doc(db, "videos", videoId);
      const videoSnap = await getDoc(videoRef);
      
      if (videoSnap.exists()) {
        const videoData = videoSnap.data();
        if (videoData.sessions && videoData.sessions[sessionId]) {
          // Add to invited participants with accepted status
          await setDoc(videoRef, {
            sessions: {
              [sessionId]: {
                invitedParticipants: {
                  [userId]: true
                }
              }
            }
          }, { merge: true });
        }
      }
    }
    */

    // Update user's custom claims with current session
    await updateUserCurrentSession(userId, sessionId);

    console.log("User successfully joined session");
  } catch (error) {
    console.error("Error joining session:", error);
    throw new Error("Failed to join session");
  }
}

/**
 * Leave a session
 * Removes the user from the participants array
 */
export async function leaveSession(
  sessionId: string,
  userId: string
): Promise<void> {
  if (!sessionId || !userId) {
    throw new Error("Session ID and user ID are required");
  }

  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    const sessionData = sessionSnap.data();
    const participants = sessionData.participants || [];

    // Remove user from participants array
    const updatedParticipants = participants.filter(
      (id: string) => id !== userId
    );

    // Update sessions collection
    await setDoc(sessionRef, {
      participants: updatedParticipants
    }, { merge: true });
    
    /*
    // Also update the video document - COMMENTED OUT AS REQUESTED
    if (videoId) {
      const videoRef = doc(db, "videos", videoId);
      const videoSnap = await getDoc(videoRef);
      
      if (videoSnap.exists()) {
        const videoData = videoSnap.data();
        if (videoData.sessions && videoData.sessions[sessionId]) {
          // Remove from active participants
          await setDoc(videoRef, {
            sessions: {
              [sessionId]: {
                activeParticipants: arrayRemove(userId),
                invitedParticipants: {
                  [userId]: deleteField()
                }
              }
            }
          }, { merge: true });
        }
      }
    }
    */

    // Clear user's current session
    await updateUserCurrentSession(userId, null);

    console.log("User successfully left session");
  } catch (error) {
    console.error("Error leaving session:", error);
    throw new Error("Failed to leave session");
  }
}

/**
 * Delete a session (only the creator can do this)
 * Security rules will enforce that only the creator can delete
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  try {
    // Get the session before deleting
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }
    
    const sessionData = sessionSnap.data();
    const participants = sessionData.participants || [];
    
    // Remove session from metadata
    const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
    await setDoc(
      metadataRef,
      {
        [sessionId]: deleteField(),
      },
      { merge: true }
    );

    // Mark session as deleted in the sessions collection
    await setDoc(sessionRef, { deleted: true, deletedAt: serverTimestamp() }, { merge: true });
    
    /*
    // If this session is also stored in the videos collection, remove it there too - COMMENTED OUT AS REQUESTED
    if (videoId) {
      const videoRef = doc(db, "videos", videoId);
      const videoSnap = await getDoc(videoRef);
      
      if (videoSnap.exists()) {
        // Check if this video has this session
        const videoData = videoSnap.data();
        if (videoData.sessions && videoData.sessions[sessionId]) {
          // Remove the session using deleteField()
          await setDoc(videoRef, {
            sessions: {
              [sessionId]: deleteField()
            }
          }, { merge: true });
          
          console.log(`Session ${sessionId} removed from video ${videoId}`);
        }
      }
    }
    */
    
    // Clear current session for all participants
    for (const userId of participants) {
      await updateUserCurrentSession(userId, null);
    }
    
    console.log("Session successfully deleted");
  } catch (error) {
    console.error("Error deleting session:", error);
    throw new Error("Failed to delete session");
  }
}

/**
 * Subscribe to sessions metadata updates
 * @param callback - Function to handle metadata updates
 * @returns Unsubscribe function
 */
export function subscribeToSessionsMeta(callback: (metadata: Record<string, any>) => void): () => void {
  const metadataRef = doc(db, METADATA_COLLECTION, "sessions");

  const unsubscribe = onSnapshot(metadataRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({});
    }
  });

  return unsubscribe;
}

/**
 * Update user's current session in custom claims
 * This is used to track which session a user is currently in
 */
export async function updateUserCurrentSession(userId: string, sessionId: string | null): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", userId);
    
    if (sessionId) {
      // Set current session
      await setDoc(userRef, {
        currentSession: sessionId
      }, { merge: true });
    } else {
      // Clear current session
      await setDoc(userRef, {
        currentSession: deleteField()
      }, { merge: true });
    }
    
    console.log(`User ${userId} current session updated to ${sessionId || 'none'}`);
  } catch (error) {
    console.error("Error updating user current session:", error);
    throw new Error("Failed to update user current session");
  }
}

/**
 * Check if user is already in a session
 */
export async function checkUserInSession(userId: string): Promise<string | null> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.currentSession || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error checking if user is in session:", error);
    throw new Error("Failed to check user session status");
  }
}
