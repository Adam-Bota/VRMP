// import { database } from "@/firebase.client";
// import { ref, set, get, update, onValue } from "firebase/database";
// import { Session, SessionMeta } from "@/types/session";
// import { VideoMeta } from "@/types/video";

// /**
//  * Update video meta data when a session is created - simplified version
//  */
// export async function updateVideoMetaOnSessionCreate(session: Session): Promise<void> {
//   if (!session.id || !session.videoId) return;

//   try {
//     // Get current meta data
//     const videoMetaRef = ref(database, `videosMeta/${session.videoId}`);
//     const snapshot = await get(videoMetaRef);
//     const currentMeta = snapshot.exists() ? snapshot.val() : { sessions: {}, sessionCount: 0 };

//     // Update with new session - simplified to only include title
//     const updatedMeta: VideoMeta = {
//       sessions: {
//         ...currentMeta.sessions,
//         [session.id]: {
//           title: session.title
//         }
//       },
//       sessionCount: currentMeta.sessionCount + 1
//     };

//     // Save to database
//     await set(videoMetaRef, updatedMeta);
//     console.log("Video meta updated successfully");

//   } catch (error) {
//     console.error("Error updating video meta:", error);
//   }
// }

// /**
//  * Update session meta data
//  */
// export async function updateSessionMeta(session: Session): Promise<void> {
//   if (!session.id) return;

//   try {
//     const sessionMetaRef = ref(database, `sessionsMeta/${session.id}`);
//     const sessionMeta: SessionMeta = {
//       videoId: session.videoId,
//       title: session.title
//     };

//     await set(sessionMetaRef, sessionMeta);
//     console.log("Session meta updated successfully");
//   } catch (error) {
//     console.error("Error updating session meta:", error);
//   }
// }

// /**
//  * Remove session from video meta when deleted
//  */
// export async function removeSessionFromVideoMeta(sessionId: string, videoId: string): Promise<void> {
//   try {
//     // Get current video meta
//     const videoMetaRef = ref(database, `videosMeta/${videoId}`);
//     const snapshot = await get(videoMetaRef);
    
//     if (!snapshot.exists()) return;
    
//     const currentMeta = snapshot.val();
    
//     // Remove session and decrement count
//     if (currentMeta.sessions && currentMeta.sessions[sessionId]) {
//       delete currentMeta.sessions[sessionId];
//       currentMeta.sessionCount = Math.max(0, currentMeta.sessionCount - 1);
      
//       // Update in database
//       await set(videoMetaRef, currentMeta);
//       console.log("Session removed from video meta");
//     }
//   } catch (error) {
//     console.error("Error removing session from video meta:", error);
//   }
// }

// /**
//  * Update active participants count for a session
//  */
// export async function updateSessionParticipants(
//   videoId: string, 
//   sessionId: string, 
//   delta: number
// ): Promise<void> {
//   try {
//     const videoMetaRef = ref(database, `videosMeta/${videoId}/sessions/${sessionId}`);
//     const snapshot = await get(videoMetaRef);
    
//     if (!snapshot.exists()) return;
    
//     const sessionData = snapshot.val();
//     const currentCount = sessionData.activeParticipants || 0;
//     const newCount = Math.max(0, currentCount + delta);
    
//     await update(videoMetaRef, { activeParticipants: newCount });
//     console.log(`Updated participant count to ${newCount}`);
//   } catch (error) {
//     console.error("Error updating session participants:", error);
//   }
// }

// /**
//  * Update session invited users count
//  */
// export async function updateSessionInvitedCount(
//   videoId: string,
//   sessionId: string,
//   count: number
// ): Promise<void> {
//   try {
//     const videoMetaRef = ref(database, `videosMeta/${videoId}/sessions/${sessionId}`);
//     await update(videoMetaRef, { invitedUserCount: count });
//     console.log(`Updated invited user count to ${count}`);
//   } catch (error) {
//     console.error("Error updating invited user count:", error);
//   }
// }

// /**
//  * Update session status in video meta
//  */
// export async function updateSessionStatusInMeta(
//   videoId: string,
//   sessionId: string,
//   status: 'live' | 'ended' | 'scheduled'
// ): Promise<void> {
//   try {
//     const videoMetaRef = ref(database, `videosMeta/${videoId}/sessions/${sessionId}`);
//     await update(videoMetaRef, { status });
//     console.log(`Updated session status to ${status}`);
//   } catch (error) {
//     console.error("Error updating session status:", error);
//   }
// }

// /**
//  * Get all video meta data with realtime updates
//  */
// export function getVideosMeta(callback: (data: Record<string, VideoMeta>) => void): () => void {
//   const videosMetaRef = ref(database, 'videosMeta');
//   const unsubscribe = onValue(videosMetaRef, (snapshot) => {
//     const data = snapshot.exists() ? snapshot.val() : {};
//     callback(data);
//   });
  
//   return unsubscribe;
// }

// /**
//  * Get all session meta data with realtime updates
//  */
// export function getSessionsMeta(callback: (data: Record<string, SessionMeta>) => void): () => void {
//   const sessionsMetaRef = ref(database, 'sessionsMeta');
//   const unsubscribe = onValue(sessionsMetaRef, (snapshot) => {
//     const data = snapshot.exists() ? snapshot.val() : {};
//     callback(data);
//   });
  
//   return unsubscribe;
// }

// /**
//  * Get sessions for a specific video with realtime updates
//  * Only fetches session IDs and titles for the given videoId
//  */
// export function getSessionsForVideo(
//   videoId: string,
//   callback: (sessions: { 
//     [sessionId: string]: { 
//       title: string;
//     } 
//   }) => void
// ): () => void {
//   // Get the video metadata reference
//   const videoMetaRef = ref(database, `videosMeta/${videoId}`);

//   // Subscribe to changes
//   const unsubscribe = onValue(videoMetaRef, async (snapshot) => {
//     try {
//       if (!snapshot.exists()) {
//         callback({});
//         return;
//       }

//       const videoMeta = snapshot.val() as VideoMeta;

//       if (!videoMeta.sessions || Object.keys(videoMeta.sessions).length === 0) {
//         callback({});
//         return;
//       }

//       callback(videoMeta.sessions);
//     } catch (error) {
//       console.error("Error fetching sessions for video:", error);
//       callback({});
//     }
//   });

//   return unsubscribe;
// }
