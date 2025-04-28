"use client";

import React, { useEffect, useState } from "react";
import VideoCard from "./video-card";
import { fetchRelatedVideos, YouTubeVideo } from "@/lib/youtube";
import { useAuth } from "./auth-provider";

interface VideoRecommendationsProps {
  videoId: string;
  sessionId: string;
}

export function VideoRecommendations({
  videoId,
  sessionId,
}: VideoRecommendationsProps) {
  const [recommendedVideos, setRecommendedVideos] = useState<YouTubeVideo[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const { user, authStateReady } = useAuth();

  useEffect(() => {
    async function loadRecommendations() {
      setIsLoading(true);
      try {
        const videos = await fetchRelatedVideos(videoId);
        setRecommendedVideos(videos);
      } catch (error) {
        console.error("Failed to fetch video recommendations:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (videoId) {
      loadRecommendations();
    }
  }, [videoId]);

  if (isLoading || !authStateReady) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-video bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mt-3 w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mt-2 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendedVideos.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Recommended Videos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendedVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            sessionId={sessionId}
            userId={user?.uid!}
          />
        ))}
      </div>
    </div>
  );
}
