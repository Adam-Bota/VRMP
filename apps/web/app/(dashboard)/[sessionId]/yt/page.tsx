"use client";

import { useEffect } from "react";
import { YouTubePlayerProvider } from "@/providers/youtube-player-provider";
import YouTubePlayer from "@/components/youtube-player";
import { fetchVideoDetails } from "@/lib/youtube";
import { VideoRecommendations } from "@/components/video-recommendations";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { initializeRealtimeSession, updateScreenState } from "@/services/realtime/sessions";

export default function VideoPage({
  params,
  searchParams,
}: {
  params: { sessionId: string };
  searchParams: { v: string };
}) {
  const { v: videoId } = searchParams;
  const { sessionId } = params;
  const { user, isLoading } = useAuth();

  // Initialize the realtime session when the component loads
  useEffect(() => {
    async function setupRealtimeSession() {
      if (!user || !sessionId) return;
      
      try {
        // Initialize the realtime session and set the user as active
        await initializeRealtimeSession(sessionId, user.uid);
        
        // Update the screen state to "yt" (YouTube)
        await updateScreenState(sessionId, "yt");
        
        console.log("Realtime session initialized:", sessionId);
      } catch (error) {
        console.error("Error initializing realtime session:", error);
        toast.error("Failed to initialize video synchronization");
      }
    }

    if (!isLoading && user) {
      setupRealtimeSession();
    }
  }, [sessionId, user, isLoading, videoId]);

  // Cleanup when user leaves the page
  useEffect(() => {
    return () => {
      // This effect runs on unmount
      if (user && sessionId) {
        // Set the screen to lobby when leaving the video page
        updateScreenState(sessionId, "lobby").catch(console.error);
      }
    };
  }, [sessionId, user]);

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col">
        <div>
          <YouTubePlayerProvider videoId={videoId} height={600} sessionId={sessionId}>
            <div className="mb-4">
              <YouTubePlayer videoId={videoId} sessionId={sessionId} />
            </div>
            <div className="mb-8">
              <VideoMetadata videoId={videoId} />
            </div>
          </YouTubePlayerProvider>
        </div>
        
        {/* Video Recommendations */}
        <VideoRecommendations videoId={videoId} sessionId={sessionId} />
      </div>
    </div>
  );
}

// Separate component to fetch and display video metadata
async function VideoMetadata({ videoId }: { videoId: string }) {
  const videoData = await fetchVideoDetails(videoId);
  
  return (
    <>
      <h1 className="text-2xl font-bold mb-2">{videoData?.title}</h1>
      <p className="text-muted-foreground mb-4">
        {videoData?.channelTitle}
      </p>
      <p className="text-sm">
        {videoData?.description?.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            <br />
          </span>
        ))}
      </p>
    </>
  );
}