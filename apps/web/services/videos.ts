import { db } from "@/firebase.client";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Timestamp,
  deleteField,
} from "firebase/firestore";
import { Session } from "@/types/session";
import { VideoDocument, VideoSession } from "@/types/video";

const METADATA_COLLECTION = "metadata";

/**
 * Fetch active sessions for a specific video from Firestore
 */
export async function getActiveSessions(videoId: string): Promise<Session[]> {
  try {
    const videoRef = doc(db, "videos", videoId);
    const videoSnap = await getDoc(videoRef);

    if (!videoSnap.exists() || !videoSnap.data().sessions) {
      return [];
    }

    const videoData = videoSnap.data() as VideoDocument;
    const sessionsData = videoData.sessions;

    // Convert the sessions object to an array
    const sessions: Session[] = Object.entries(sessionsData).map(
      ([id, data]) => ({
        id,
        title: data.title,
        videoId: videoId,
        startTime: data.startTime,
        endTime: data.endTime,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        participants: data.activeParticipants || [],
        moderator: data.createdBy,
        status: data.status,
      })
    );

    // Sort by most recent
    return sessions.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return [];
  }
}

/**
 * Create or update video document in Firestore
 */
export async function saveVideoDocument(
  videoId: string,
  data: Partial<VideoDocument>
): Promise<void> {
  try {
    console.log(`Attempting to save video document for ${videoId}`, data);
    const videoRef = doc(db, "videos", videoId);
    const videoSnap = await getDoc(videoRef);

    if (videoSnap.exists()) {
      // Update existing document - now using setDoc with merge instead of updateDoc
      await setDoc(videoRef, data, { merge: true });
      console.log(`Video document for ${videoId} updated successfully`);
    } else {
      // Create new document
      await setDoc(videoRef, {
        id: videoId,
        title: data.title || "",
        sessions: data.sessions || {},
      });
      console.log(`Video document for ${videoId} created successfully`);
    }

    // Update metadata collection
    const metadataRef = doc(db, METADATA_COLLECTION, "videos");
    await setDoc(
      metadataRef,
      {
        [videoId]: {
          title: data.title || "",
          sessions: data.sessions || {},
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error saving video document:`, error);
    throw error;
  }
}

/**
 * Add a session to video document in Firestore
 */
export async function addSessionToVideo(
  videoId: string,
  sessionId: string,
  sessionData: {
    title: string;
    startTime: number;
    endTime: number;
    createdBy: string;
  }
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Create a new session with the updated schema
    const newSession: VideoSession = {
      title: sessionData.title,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      createdBy: sessionData.createdBy,
      createdAt: Timestamp.now(),
      status: "scheduled",
      activeParticipants: [], // Empty array initially
      invitedParticipants: {
        [sessionData.createdBy]: true, // Creator is added to invites by default as accepted
      },
    };

    await setDoc(
      videoRef,
      {
        [`sessions`]: {
          [sessionId]: newSession,
        },
      },
      { merge: true }
    );

    console.log(`Session ${sessionId} added to video ${videoId}`);
  } catch (error) {
    console.error(`Error adding session to video:`, error);
    throw error;
  }
}

/**
 * Subscribe to video document changes in Firestore
 */
export function subscribeToVideoDocument(
  videoId: string,
  callback: (data: VideoDocument | null) => void
): () => void {
  const videoRef = doc(db, "videos", videoId);

  const unsubscribe = onSnapshot(
    videoRef,
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as VideoDocument);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to video document:`, error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Add a user to active participants of a session
 * Also updates the sessions collection
 */
export async function addActiveParticipant(
  videoId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);
    const videoSnap = await getDoc(videoRef);

    if (!videoSnap.exists()) {
      throw new Error(`Video ${videoId} not found`);
    }

    const videoData = videoSnap.data() as VideoDocument;
    const sessionData = videoData.sessions?.[sessionId];

    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Don't add if the user is already an active participant
    if (!sessionData.activeParticipants.includes(userId)) {
      // Update videos collection
      await setDoc(
        videoRef,
        {
          sessions: {
            [sessionId]: {
              activeParticipants: arrayUnion(userId),
            },
          },
        },
        { merge: true }
      );

      // Also update sessions collection to add this user as a participant
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        const participants = sessionData.participants || [];

        if (!participants.includes(userId)) {
          await setDoc(
            sessionRef,
            {
              participants: arrayUnion(userId),
            },
            { merge: true }
          );
        }
      }
    }

    console.log(
      `User ${userId} added as active participant to session ${sessionId}`
    );
  } catch (error) {
    console.error(`Error adding active participant:`, error);
    throw error;
  }
}

/**
 * Remove a user from active participants of a session
 */
export async function removeActiveParticipant(
  videoId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            activeParticipants: arrayRemove(userId),
          },
        },
      },
      { merge: true }
    );

    console.log(
      `User ${userId} removed from active participants in session ${sessionId}`
    );
  } catch (error) {
    console.error(`Error removing active participant:`, error);
    throw error;
  }
}

/**
 * Invite a user to a session
 * Also updates the sessions collection if needed
 */
export async function inviteUserToSession(
  videoId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Set the invited user with default acceptance status as false
    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            invitedParticipants: {
              [userId]: false,
            },
          },
        },
      },
      { merge: true }
    );

    // Also update the sessions collection if it exists
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      // Add to invited users in session metadata (using a new field if needed)
      await setDoc(
        sessionRef,
        {
          invitedUsers: arrayUnion(userId),
        },
        { merge: true }
      );
    }

    console.log(`User ${userId} invited to session ${sessionId}`);
  } catch (error) {
    console.error(`Error inviting user to session:`, error);
    throw error;
  }
}

/**
 * Update user acceptance status in a session
 * Syncs with the sessions collection
 */
export async function updateInviteAcceptance(
  videoId: string,
  sessionId: string,
  userId: string,
  accepted: boolean
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Update in videos collection
    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            invitedParticipants: {
              [userId]: accepted,
            },
          },
        },
      },
      { merge: true }
    );

    // If accepted, also add to participants in the sessions collection
    if (accepted) {
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        const participants = sessionData.participants || [];

        if (!participants.includes(userId)) {
          // Add to participants array
          await setDoc(
            sessionRef,
            {
              participants: arrayUnion(userId),
            },
            { merge: true }
          );
        }
      }
    }

    console.log(
      `User ${userId} ${accepted ? "accepted" : "declined"} invitation to session ${sessionId}`
    );
  } catch (error) {
    console.error(`Error updating invite acceptance:`, error);
    throw error;
  }
}

/**
 * Remove a user invitation from a session
 */
export async function removeUserInviteFromSession(
  videoId: string,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Remove the user from invitedParticipants map
    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            invitedParticipants: {
              [userId]: deleteField(),
            },
          },
        },
      },
      { merge: true }
    );

    console.log(`User ${userId} removed from session ${sessionId} invites`);
  } catch (error) {
    console.error(`Error removing user invite:`, error);
    throw error;
  }
}

/**
 * Start a session (set as live)
 * Updates in both collections
 */
export async function startSession(
  videoId: string,
  sessionId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Update in videos collection
    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            status: "live",
          },
        },
      },
      { merge: true }
    );

    // Also update the sessions collection
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      await setDoc(
        sessionRef,
        {
          status: "live",
        },
        { merge: true }
      );
    }

    console.log(`Session ${sessionId} started`);
  } catch (error) {
    console.error(`Error starting session:`, error);
    throw error;
  }
}

/**
 * End a session
 * Updates in both collections
 */
export async function endSession(
  videoId: string,
  sessionId: string
): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);

    // Update in videos collection
    await setDoc(
      videoRef,
      {
        sessions: {
          [sessionId]: {
            status: "ended",
            activeParticipants: [],
          },
        },
      },
      { merge: true }
    );

    // Also update the sessions collection
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      await setDoc(
        sessionRef,
        {
          status: "ended",
          activeParticipants: [],
        },
        { merge: true }
      );
    }

    console.log(`Session ${sessionId} ended`);
  } catch (error) {
    console.error(`Error ending session:`, error);
    throw error;
  }
}

/**
 * Delete a video document in Firestore
 */
export async function deleteVideo(videoId: string): Promise<void> {
  try {
    const videoRef = doc(db, "videos", videoId);
    const videoSnap = await getDoc(videoRef);

    if (videoSnap.exists()) {
      // Remove video from metadata
      const metadataRef = doc(db, METADATA_COLLECTION, "videos");
      await setDoc(
        metadataRef,
        {
          [videoId]: deleteField(),
        },
        { merge: true }
      );

      // Mark video as deleted
      await setDoc(videoRef, { deleted: true }, { merge: true });
    }
  } catch (error) {
    console.error(`Error deleting video:`, error);
    throw error;
  }
}
