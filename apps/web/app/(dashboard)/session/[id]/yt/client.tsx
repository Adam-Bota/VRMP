"use client";

import React, { useEffect, useState } from "react";
import YouTubePlayer from "@/components/youtube-player";
import { YouTubePlayerProvider } from "@/providers/youtube-player-provider";
import { VideoRecommendations } from "@/components/video-recommendations";
import { YouTubePlayerSync } from "@/components/youtube-player-sync";
import { useAuth } from "@/components/auth-provider";
import { setUserVideo } from "@/services/users";
import { viewedVideo } from "@/services/videos";
import { Video } from "@/types/video";

export default function Client({
  videoId,
  sessionId,
}: {
  videoId: string;
  sessionId: string;
}) {
  const { user, doc, isLoading } = useAuth();

  // Only attempt to render sync component when we have userId
  if (!user) {
    return null;
  }

  // Check if videoId is in user doc
  useEffect(() => {
    if (isLoading || !doc) return;
    (async () => {
      if (!doc.videos?.includes(videoId)) {
        const maxRetries = 1;
        let attempt = 0;
        while (attempt <= maxRetries) {
          try {
            await setUserVideo(user.uid, videoId);
            await viewedVideo(videoId, user.uid);
            break;
          } catch (err) {
            attempt++;
            if (attempt > maxRetries) {
              console.error("Failed to record viewed video after retry:", err);
            }
          }
        }
      }
    })();
    console.log("User video updated:", videoId);
  }, [videoId, isLoading, doc]);

  return (
    <div className="w-full flex flex-col gap-4 h-full">
      {/* Using YouTubePlayerProvider at the page level */}
      <YouTubePlayerProvider videoId={videoId} height="100%" width="100%">
        {/* Split Layout - 30/70 split */}
        <div className="h-full flex flex-col gap-4 w-full">
          <div className="h-full w-full [&> div]:w-full [&>div]:h-full">
            <YouTubePlayer
              videoId={videoId}
              sessionId={sessionId}
              height={"100%"}
            />
            {/* Pass proper userId instead of videoId */}
            <YouTubePlayerSync sessionId={sessionId} userId={user.uid} />
          </div>
        </div>
      </YouTubePlayerProvider>
      {/* <div className="w-full h-1"></div> */}
    </div>
  );
}
