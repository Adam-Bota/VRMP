"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createSession,
  getSessionById,
  joinSession,
  leaveSession,
} from "@/services/sessions";
import { useAuth } from "@/components/auth-provider";
import { Session } from "@/types/session";
import { toast } from "sonner";

// Import extracted components
import { LoadingScreen } from "./components/LoadingScreen";
import { ActiveSessionUI } from "./components/ActiveSessionUI";
import { NoSessionUI } from "./components/NoSessionUI";

export default function CreateSessionPage() {
  const { user, authStateReady, doc, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInSession, setIsInSession] = useState<boolean | null>(null);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [countdownActive, setCountdownActive] = useState(false);
  const [navigationType, setNavigationType] = useState<
    "video" | "session" | null
  >(null);
  const [navigationCanceled, setNavigationCanceled] = useState(false);

  // Memoize current session and video data to prevent unnecessary re-renders
  const currentSession = doc?.activeSession as Session | null;
  const currentVideo = doc?.activeSession?.currentVideo || null;
  // Memoize the session state to prevent re-renders
  const hasActiveSession = useMemo(
    () => Boolean(user && currentSession),
    [user, currentSession]
  );

  // Modify the useEffect to respect the navigationCanceled state
  useEffect(() => {
    if (
      hasActiveSession &&
      !isJoining &&
      authStateReady &&
      !isLoading &&
      !navigationCanceled
    ) {
      // Automatically start the countdown when session is detected, but only if not previously canceled
      goToCurrentSession();
    }
  }, [hasActiveSession, authStateReady, isLoading, navigationCanceled]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to create a session");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sessionId = await createSession({
        createdBy: user.uid,
        moderator: user.uid,
        participants: [user.uid],
      });

      // Redirect to the new session
      router.push(`/session/${sessionId}`);
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const goToCurrentSession = () => {
    if (!currentSession?.id) {
      setError("No active session found");
      toast.error("No active session found");
      return;
    }

    // Set up the navigation countdown
    setIsJoining(true);
    setCountdownActive(true);
    setCountdown(4);

    // Store the destination for use when countdown completes
    // setSessionToNavigate(currentSession.id);

    // If we have a current video, set up for video navigation
    if (currentVideo) {
      setNavigationType("video");
    } else {
      // Otherwise, set up for session navigation
      setNavigationType("session");
    }

    let countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          if (countdownActive) {
            // Only navigate if countdown is still active
            if (navigationType === "video") {
              router.push(`/session/${currentSession.id}/yt?v=${currentVideo}`);
            } else {
              router.push(`/session/${currentSession.id}`);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up
    return () => {
      clearInterval(countdownInterval);
    };
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to join a session");
      toast.error("Please log in to join a session");
      return;
    }

    if (joinSessionId.trim() === "") {
      setError("Please enter a valid session ID");
      toast.error("Session ID cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsJoining(true);
      const loader = toast.loading("Verifying session...");

      const session = await getSessionById(joinSessionId);
      if (!session) {
        setError("Session not found");
        toast.error("Session not found");
        setIsJoining(false);
        return;
      }

      await joinSession(joinSessionId, user.uid);
      toast.dismiss(loader);
      toast.success("Session joined! Redirecting in 5 seconds...");

      // Start countdown
      setCountdownActive(true);
      setCountdown(5);

      let countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            if (countdownActive) {
              // Only redirect if countdown is still active
              router.push(`/session/${joinSessionId}`);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Clean up
      return () => {
        clearInterval(countdownInterval);
      };
    } catch (err: any) {
      console.error("Error joining session:", err);
      setError(err.message || "Failed to join session");
      toast.error(err.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  const cancelRedirect = () => {
    setCountdownActive(false);
    setIsJoining(false);
    // setSessionToNavigate(null);
    setNavigationType(null);
    setNavigationCanceled(true);
    toast.info("Navigation canceled. You can rejoin when ready.");
  };

  const directGoToSession = () => {
    if (!currentSession?.id) {
      setError("No active session found");
      toast.error("No active session found");
      return;
    }

    // Navigate immediately without countdown
    if (currentVideo) {
      router.push(`/session/${currentSession.id}/yt?v=${currentVideo}`);
    } else {
      router.push(`/session/${currentSession.id}`);
    }
  };

  const handleLeaveSession = async () => {
    if (!user || !currentSession?.id) {
      setError("You are not in a session or user is not authenticated");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await leaveSession(user.uid, currentSession.id);
      setIsInSession(false);
    } catch (err: any) {
      console.error("Error leaving session:", err);
      setError(err.message || "Failed to leave session");
    } finally {
      setLoading(false);
    }
  };

  if (!authStateReady || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      {hasActiveSession ? (
        <ActiveSessionUI
          currentSession={currentSession!}
          currentVideo={currentVideo || undefined}
          loading={loading}
          isJoining={isJoining}
          countdown={countdown}
          navigationType={navigationType}
          handleLeaveSession={handleLeaveSession}
          goToCurrentSession={goToCurrentSession}
          cancelRedirect={cancelRedirect}
          navigationCanceled={navigationCanceled}
          directGoToSession={directGoToSession}
        />
      ) : (
        <NoSessionUI
          joinSessionId={joinSessionId}
          setJoinSessionId={setJoinSessionId}
          error={error}
          loading={loading}
          isJoining={isJoining}
          countdown={countdown}
          handleJoinSession={handleJoinSession as any}
          handleCreateSession={handleCreateSession}
          goToSession={directGoToSession}
        />
      )}
    </div>
  );
}
