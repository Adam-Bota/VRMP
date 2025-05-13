"use client";

import React, { useEffect, useState } from "react";
import YouTubePlayer from "@/components/youtube-player";
import { YouTubePlayerProvider } from "@/providers/youtube-player-provider";
import { VideoRecommendations } from "@/components/video-recommendations";
import { YouTubePlayerSync } from "@/components/youtube-player-sync";
import { useAuth } from "@/components/auth-provider";

export default function Client({
  videoId,
  sessionId,
}: {
  videoId: string;
  sessionId: string;
}) {
  const { user } = useAuth();

  // Only attempt to render sync component when we have userId
  if (!user) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4 h-full">
      {/* Using YouTubePlayerProvider at the page level */}
      <YouTubePlayerProvider videoId={videoId} height="100%" width="100%">
        {/* Split Layout - 30/70 split */}
        <div className="h-full flex flex-col gap-4 w-full">
          <div className="h-full w-full [&> div]:w-full [&>div]:h-full">
            <YouTubePlayer videoId={videoId} height={"100%"} />
            {/* Pass proper userId instead of videoId */}
            <YouTubePlayerSync sessionId={sessionId} userId={user.uid} />
          </div>
        </div>
      </YouTubePlayerProvider>
      {/* <div className="w-full h-1"></div> */}
    </div>
  );
}
