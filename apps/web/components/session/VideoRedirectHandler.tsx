"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { database } from "@/firebase.client";
import { ref, get } from "firebase/database";
import { initializeRealtimeSession } from "@/services/realtime/sessions";
import { toast } from "sonner";

export function VideoRedirectHandler({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only run once when component mounts and user is loaded
    if (isLoading || !user || hasChecked) return;

    async function checkAndRedirectToVideo() {
      try {
        // First, initialize the user in the realtime session
        await initializeRealtimeSession(sessionId, user!.uid);

        // Instead of subscribing, just fetch the video state once
        const videoStateRef = ref(database, `sessions/${sessionId}/videoState`);
        const snapshot = await get(videoStateRef);
        
        // Mark that we've performed the check
        setHasChecked(true);
        
        // If there's video data and it contains an ID
        if (snapshot.exists()) {
          const videoState = snapshot.val();
          if (videoState && videoState.id) {
            const videoId = videoState.id;
            
            // If we have a valid video ID, redirect to the video page
            if (videoId) {
              console.log(`Active video found in session: ${videoId}, redirecting...`);
              toast.info("Joining the current video in this session...");
              
              // Navigate to the video page
              router.push(`/session/${sessionId}/yt?v=${videoId}`);
            }
          }
        }
      } catch (error) {
        console.error("Error checking for active video:", error);
        setHasChecked(true);
      }
    }

    checkAndRedirectToVideo();
  }, [user, isLoading, sessionId, router, hasChecked]);

  // This is a utility component with no UI
  return null;
}