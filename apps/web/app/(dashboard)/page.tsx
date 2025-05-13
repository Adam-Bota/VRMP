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
import { toast } from "sonner";

import { LoadingScreen } from "./components/LoadingScreen";
import { NoSessionUI } from "./components/NoSessionUI";

export default function CreateSessionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

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
      toast.success("Session joined! Redirecting");

      router.push(`/session/${joinSessionId}`);
    } catch (err: any) {
      console.error("Error joining session:", err);
      setError(err.message || "Failed to join session");
      toast.error(err.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <NoSessionUI
        joinSessionId={joinSessionId}
        setJoinSessionId={setJoinSessionId}
        error={error}
        loading={loading}
        isJoining={isJoining}
        handleJoinSession={handleJoinSession as any}
        handleCreateSession={handleCreateSession}
      />
    </div>
  );
}
