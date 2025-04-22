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
    <div className="">
      {/* Using YouTubePlayerProvider at the page level */}
      <YouTubePlayerProvider videoId={videoId} height={500} width="100%">
        {/* Split Layout - 30/70 split */}
        <div className="flex flex-col gap-4">
          <div className="w-full">
            <YouTubePlayer videoId={videoId} height={500} />
            {/* Pass proper userId instead of videoId */}
            <YouTubePlayerSync sessionId={sessionId} userId={user.uid} />
          </div>
          <div className="w-full">
            <VideoRecommendations videoId={videoId} sessionId={sessionId} />
          </div>
        </div>
      </YouTubePlayerProvider>
    </div>
  );
}
