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
  Timestamp,
} from "firebase/firestore";
import { Session, SessionMeta } from "@/types/session";
import { setUserSession, clearUserSession } from "@/services/users";
import { leaveRealtimeSession } from "./realtime/sessions";

const COLLECTION_NAME = "sessions";
const METADATA_COLLECTION = "metadata";

export async function createSession(
  sessionData: Omit<Session, "id" | "createdAt">
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to create a session");
  }

  if (!sessionData.createdBy) {
    throw new Error("Missing required session data fields");
  }

  try {
    // First update Firestore
    const sessionsRef = collection(db, COLLECTION_NAME);

    const session: Omit<Session, "id"> = {
      ...sessionData,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      participants: user.uid ? [user.uid] : [],
      moderator: user.uid,
    };

    const docRef = await addDoc(sessionsRef, session);
    const sessionId = docRef.id;

    // Update metadata collection
    const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
    const sessionMeta: SessionMeta = {
      createdBy: user.uid,
    };

    await setDoc(
      metadataRef,
      {
        [sessionId]: sessionMeta,
      },
      { merge: true }
    );

    // Update the user's session information
    await setUserSession(user.uid, {
      ...session,
      id: sessionId,
    });

    // Initialize the realtime session
    try {
      const { initializeRealtimeSession } = await import("./realtime/sessions");
      await initializeRealtimeSession(sessionId, user.uid);
    } catch (error) {
      console.error("Error initializing realtime session:", error);
      // Continue even if realtime initialization fails
    }

    return sessionId;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }
}

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
        currentVideo: data.currentVideo,
        lastVideoUpdate: data.lastVideoUpdate,
      });
    });

    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw new Error("Failed to fetch sessions");
  }
}

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
      currentVideo: data.currentVideo,
      lastVideoUpdate: data.lastVideoUpdate,
    };
  } catch (error) {
    console.error("Error fetching session:", error);
    throw new Error("Failed to fetch session");
  }
}

export async function updateSessionDetails(
  sessionId: string,
  updateData: Partial<Session>
): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    await setDoc(sessionRef, updateData, { merge: true });

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

    console.log(`Session ${sessionId} updated`);
  } catch (error) {
    console.error("Error updating session details:", error);
    throw new Error("Failed to update session details");
  }
}

export async function joinSession(
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

    const sessionData = sessionSnap.data() as Session;
    const participants = sessionData.participants || [];

    console.log(participants, userId);

    if (participants.includes(userId)) {
      console.log("User is already a participant in this session");
      // Even if they're already a participant, ensure their data is properly set up
    } else {
      // First update Firestore
      await setDoc(
        sessionRef,
        {
          participants: arrayUnion(userId),
        },
        { merge: true }
      );
    }

    // Then update user object with session info
    await setUserSession(userId, { ...sessionData, id: sessionId });

    // Finally initialize the realtime session data
    try {
      const { initializeRealtimeSession } = await import("./realtime/sessions");
      await initializeRealtimeSession(sessionId, userId);
    } catch (error) {
      console.error("Error initializing realtime session data:", error);
      // Continue even if realtime initialization fails
      // The user can still access the session through Firestore
    }

    console.log("User successfully joined session");
  } catch (error) {
    console.error("Error joining session:", error);
    throw new Error("Failed to join session");
  }
}

export async function leaveSession(
  sessionId: string,
  userId: string
): Promise<void> {
  if (!sessionId || !userId) {
    throw new Error("Session ID and user ID are required");
  }

  try {
    // Get session data and validate
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    const sessionData = sessionSnap.data() as Session;
    const participants = sessionData.participants || [];

    // Check if user is actually in the session
    if (!participants.includes(userId)) {
      console.log(`User ${userId} is not in session ${sessionId}`);
      return; // Nothing to do if user is not in the session
    }

    // Remove user from session participants
    const updatedParticipants = participants.filter(
      (id: string) => id !== userId
    );

    // Handle moderator transfer if needed
    let newModerator = sessionData.moderator;
    if (userId === sessionData.moderator && updatedParticipants.length > 0) {
      newModerator = updatedParticipants[0] as string;
    }

    // Clear user's active session
    await clearUserSession(userId);
    
    // Check if any participants are left
    if (updatedParticipants.length === 0) {
      console.log("No participants left. Deleting session...");
      
      // Clean up the session from both databases
      try {
        const { removeRealtimeSession } = await import("./realtime/sessions");
        await removeRealtimeSession(sessionId);
      } catch (error) {
        console.error("Error removing realtime session:", error);
        // Continue with deletion even if realtime cleanup fails
      }
      
      // Remove from metadata collection
      const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
      await setDoc(
        metadataRef,
        {
          [sessionId]: deleteField(),
        },
        { merge: true }
      );
      
      // Mark session as deleted in Firestore
      await setDoc(
        sessionRef,
        { deleted: true, deletedAt: serverTimestamp() },
        { merge: true }
      );
      
      console.log(`Session ${sessionId} deleted as no participants remain`);
      return;
    }
    
    // Update session with new participants list and moderator
    const updatedSession: Session = {
      ...sessionData,
      id: sessionId,
      participants: updatedParticipants,
      moderator: newModerator,
    };
    
    // Update Firestore with new participants and moderator
    await setDoc(
      sessionRef,
      {
        participants: updatedParticipants,
        moderator: newModerator,
      },
      { merge: true }
    );
    
    // Update realtime database to reflect changes
    try {
      // First handle the leaving user's data
      await leaveRealtimeSession(sessionId, userId);
      
      // Then update session participants for remaining users
      setDoc(
        doc(db, COLLECTION_NAME, sessionId),
        {
          participants: updatedParticipants,
          moderator: newModerator,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating realtime session data:", error);
      // Continue with the operation even if realtime update fails
    }
    
    // Update the session information for all remaining participants
    if (updatedParticipants.length > 0) {
      const updatePromises = updatedParticipants.map((participantId: string) => 
        setUserSession(participantId, updatedSession)
      );
      await Promise.all(updatePromises);
      console.log(`Updated session info for ${updatedParticipants.length} remaining participants`);
    }

    console.log(`User ${userId} successfully left session ${sessionId}`);
  } catch (error) {
    console.error("Error leaving session:", error);
    throw new Error(`Failed to leave session: ${(error as any).message}`);
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  try {
    // First get session data to find all participants
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    const sessionData = sessionSnap.data();
    const participants = sessionData.participants || [];

    // First update Firestore
    // Remove from metadata collection
    const metadataRef = doc(db, METADATA_COLLECTION, "sessions");
    await setDoc(
      metadataRef,
      {
        [sessionId]: deleteField(),
      },
      { merge: true }
    );

    // Mark as deleted in the sessions collection
    await setDoc(
      sessionRef,
      { deleted: true, deletedAt: serverTimestamp() },
      { merge: true }
    );

    // Clear user sessions for all participants
    const clearPromises = participants.map((userId: string) =>
      clearUserSession(userId)
    );
    await Promise.all(clearPromises);

    // Finally, remove from realtime database
    try {
      const { removeRealtimeSession } = await import("./realtime/sessions");
      await removeRealtimeSession(sessionId);
    } catch (error) {
      console.error("Error removing realtime session:", error);
      // Continue with deletion even if realtime cleanup fails
    }

    console.log(`Session ${sessionId} successfully deleted`);
  } catch (error) {
    console.error("Error deleting session:", error);
    throw new Error(`Failed to delete session: ${(error as any).message}`);
  }
}

export function subscribeToSessionsMeta(
  callback: (metadata: Record<string, any>) => void
): () => void {
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
 * Update the current video in the session document
 */
export async function updateSessionVideo(
  sessionId: string,
  videoId: string
): Promise<void> {
  if (!sessionId || videoId === undefined) {
    throw new Error("Session ID and video ID are required");
  }

  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      throw new Error("Session not found");
    }

    await setDoc(
      sessionRef,
      {
        currentVideo: videoId,
        lastVideoUpdate: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`Updated session ${sessionId} with video ${videoId}`);
  } catch (error) {
    console.error("Error updating session video:", error);
    throw new Error("Failed to update session video");
  }
}

/**
 * Change video for a session - main entry point that coordinates both databases
 * Only the moderator can change videos
 */
export async function changeSessionVideo(
  sessionId: string,
  userId: string,
  videoId: string
): Promise<void> {
  if (!sessionId || !userId || videoId === undefined) {
    throw new Error("Session ID, user ID, and video ID are required");
  }

  try {
    // First check if user is the session moderator
    const session = await getSessionById(sessionId);
    
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.moderator !== userId) {
      throw new Error("Only the session moderator can change videos");
    }

    // First update Firestore
    await updateSessionVideo(sessionId, videoId);

    // Then update all participant user sessions with updated session info
    try {
      if (session.participants && session.participants.length > 0) {
        // Update session object with new video ID
        const updatedSession = {
          ...session,
          currentVideo: videoId,
          lastVideoUpdate: Timestamp.now(),
        };

        console.log(
          `Updated session ${sessionId} with new video ${videoId} ${session.participants}`
        );

        const updatePromises = session.participants.map((participantId) =>
          setUserSession(participantId, updatedSession)
        );

        await Promise.all(updatePromises);
        console.log(
          `Updated ${session.participants.length} participants with new video ${videoId}`
        );
      }
    } catch (error) {
      console.error("Error updating participant user objects:", error);
      // Continue even if this fails, as the realtime DB is the source of truth for video state
    }

    // Finally update realtime database
    try {
      const { changeVideo } = await import("./realtime/sessions");
      await changeVideo(sessionId, userId, videoId);
    } catch (error) {
      console.error("Error updating realtime database:", error);
      // Re-throw only this error as realtime DB is essential for video synchronization
      throw new Error(
        `Failed to update video in realtime DB: ${(error as any).message}`
      );
    }

    console.log(
      `Video changed to ${videoId} for session ${sessionId} by moderator ${userId}`
    );
  } catch (error) {
    console.error("Error changing session video:", error);
    throw new Error(`Failed to change video: ${(error as any).message}`);
  }
}

/**
 * Clear video for a session - main entry point that coordinates both databases
 * Only the moderator can clear videos
 */
export async function clearSessionVideo(
  sessionId: string,
  userId: string
): Promise<void> {
  if (!sessionId || !userId) {
    throw new Error("Session ID and user ID are required");
  }

  try {
    // First check if user is the session moderator
    const session = await getSessionById(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.moderator !== userId) {
      throw new Error("Only the session moderator can clear videos");
    }

    // First update Firestore
    await setDoc(
      doc(db, COLLECTION_NAME, sessionId),
      {
        currentVideo: deleteField(),
        lastVideoUpdate: serverTimestamp(),
      },
      { merge: true }
    );

    // Then update all participant user sessions to clear the video
    try {
      if (session.participants && session.participants.length > 0) {
        const updatedSession = {
          ...session,
        };
        delete updatedSession.currentVideo;

        const updatePromises = session.participants.map((participantId) =>
          setUserSession(participantId, updatedSession)
        );

        await Promise.all(updatePromises);
        console.log(
          `Cleared current video for ${session.participants.length} participants`
        );
      }
    } catch (error) {
      console.error("Error clearing participant user videos:", error);
      // Continue even if this fails, as the realtime DB is the source of truth
    }

    // Finally update realtime database
    try {
      const { clearVideo } = await import("./realtime/sessions");
      await clearVideo(sessionId, userId);
    } catch (error) {
      console.error("Error clearing video in realtime database:", error);
      // Re-throw only this error as realtime DB is essential for synchronization
      throw new Error(
        `Failed to clear video in realtime DB: ${(error as any).message}`
      );
    }

    console.log(
      `Video cleared from session ${sessionId} by moderator ${userId}`
    );
  } catch (error) {
    console.error("Error clearing session video:", error);
    throw new Error(`Failed to clear video: ${(error as any).message}`);
  }
}
