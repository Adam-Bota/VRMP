import { db } from "@/firebase.client";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  deleteField,
  onSnapshot,
} from "firebase/firestore";
import { User as FirebaseAuthUser } from "firebase/auth";
import { Session } from "@/types/session";
import { User } from "@/types/users";
const COLLECTION_NAME = "users";

/**
 * Creates a user document in Firestore if it doesn't already exist,
 * or updates the last login time if it does.
 */
export async function createUserIfNotExists(
  authUser: FirebaseAuthUser
): Promise<string> {
  if (!authUser.uid) throw new Error("User ID is required");

  try {
    const userRef = doc(db, COLLECTION_NAME, authUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // User doesn't exist, create new user document
      const userData = {
        email: authUser.email || "",
        displayName: authUser.displayName,
        photoURL: authUser.photoURL,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        role: "user",
      };

      await setDoc(userRef, userData);
      console.log("New user created in Firestore");
    } else {
      // User exists, update last login time
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
      console.log("User login time updated");
    }

    return authUser.uid;
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw new Error("Failed to create/update user");
  }
}

/**
 * Get user data by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    return {
      id: userSnap.id,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      createdAt: userData.createdAt?.toDate() || null,
      lastLoginAt: userData.lastLoginAt?.toDate() || null,
      activeSession: userData.activeSession || null,
    } as User;
  } catch (error) {
    console.error("Error getting user:", error);
    throw new Error("Failed to get user data");
  }
}

/**
 * Get current user ID from auth state
 * (Placeholder - you might have this in a context or hook)
 */
export async function getCurrentUserId(): Promise<string | null> {
  // This would typically come from your auth context
  // For now, returning null as a placeholder
  return null;
}

export async function checkUserInSession(
  userId: string
): Promise<Session | null> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  console.log(`Checking if user ${userId} is in session...`);

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.activeSession || null;
    }

    return null;
  } catch (error) {
    console.error("Error checking if user is in session:", error);
    throw new Error("Failed to check user session status");
  }
}

/**
 * Sets the session for a user.
 */
export async function setUserSession(
  userId: string,
  session: Session | null
): Promise<void> {
  if (!userId || !session) {
    throw new Error("User ID and Session are required");
  }

  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        activeSession: session,
      },
      { merge: true }
    );

    console.log(`Session ${session.id} set for user ${userId}`);
  } catch (error) {
    console.error("Error setting user session:", error);
    throw new Error("Failed to set user session");
  }
}

/**
 * Clears the session for a user.
 */
export async function clearUserSession(userId: string): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", userId);
    await setDoc(
      userRef,
      {
        activeSession: deleteField(),
      },
      { merge: true }
    );

    console.log(`Session cleared for user ${userId}`);
  } catch (error) {
    console.error("Error clearing user session:", error);
    throw new Error("Failed to clear user session");
  }
}

export const subscribeToUserDoc = (
  userId: string,
  callback: (userData: User | null) => void,
  onError?: (error: Error) => void
) => {
  const unsubscribe = onSnapshot(
    doc(db, COLLECTION_NAME, userId),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback({
          ...data,
          id: userId,
        } as User);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Error subscribing to user document:", error);
      if (onError) onError(error);
    }
  );
  return unsubscribe;
};

// Clear user video
export async function clearUserCurrentVideo(userId: string): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", userId);

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User does not exist");
    }

    const userData = userSnap.data();

    if (!userData.activeSession) {
      throw new Error("User does not have an active session");
    }
    if (!userData.activeSession.currentVideo) {
      throw new Error("User does not have a current video");
    }

    await updateDoc(userRef, {
      activeSession: {
        ...userData.activeSession,
        currentVideo: null,
      },
    });
  } catch (error) {
    console.error("Error clearing user current video:", error);
    throw new Error("Failed to clear user current video");
  }
}

export async function setUserCurrentVideo(userId: string, videoId: string): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      activeSession: {
        currentVideo: videoId,
      },
    });
  } catch (error) {
    console.error("Error setting user current video:", error);
    throw new Error("Failed to set user current video");
  }
}