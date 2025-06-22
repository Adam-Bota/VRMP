import { db } from "../firebase.client";
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { Video } from "@/types/video";

/**
 * Sets (creates or updates) a video document in Firestore.
 * @param video The video object to set in Firestore.
 */
export async function setVideo(video: Video): Promise<void> {
  const videoRef = doc(db, "videos", video.id);
  await setDoc(videoRef, video, {
    merge: true,
  });
}

/**
 * Adds the userId to the video's likes array and removes from dislikes.
 */
export async function viewedVideo(
  videoId: string,
  userId: string
): Promise<void> {
  const videoRef = doc(db, "videos", videoId);
  await setDoc(
    videoRef,
    {
      viewers: arrayUnion(userId),
    },
    {
      merge: true,
    }
  );
}

/**
 * Adds the userId to the video's likes array and removes from dislikes.
 */
export async function likeVideo(
  videoId: string,
  userId: string
): Promise<void> {
  const videoRef = doc(db, "videos", videoId);
  await setDoc(
    videoRef,
    {
      likes: arrayUnion(userId),
      dislikes: arrayRemove(userId),
    },
    { merge: true }
  );
}

/**
 * Removes the userId from the video's likes array.
 */
export async function unlikeVideo(
  videoId: string,
  userId: string
): Promise<void> {
  const videoRef = doc(db, "videos", videoId);
  await setDoc(
    videoRef,
    {
      likes: arrayRemove(userId),
    },
    {
      merge: true,
    }
  );
}

/**
 * Adds the userId to the video's dislikes array and removes from likes.
 */
export async function dislikeVideo(
  videoId: string,
  userId: string
): Promise<void> {
  const videoRef = doc(db, "videos", videoId);
  await setDoc(
    videoRef,
    {
      dislikes: arrayUnion(userId),
      likes: arrayRemove(userId),
    },
    {
      merge: true,
    }
  );
}

/**
 * Removes the userId from the video's dislikes array.
 */
export async function undislikeVideo(
  videoId: string,
  userId: string
): Promise<void> {
  const videoRef = doc(db, "videos", videoId);
  await setDoc(
    videoRef,
    {
      dislikes: arrayRemove(userId),
    },
    {
      merge: true,
    }
  );
}

export const subscribeToVideoDoc = (
  videoId: string,
  callback: (videoData: Video | null) => void,
  onError?: (error: Error) => void
) => {
  const unsubscribe = onSnapshot(
    doc(db, "videos", videoId),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          ...data,
          id: videoId,
        } as Video);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to video document:", error);
      if (onError) onError(error);
    }
  );
  return unsubscribe;
};
