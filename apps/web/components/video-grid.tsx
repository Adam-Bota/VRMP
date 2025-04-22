"use client";

import VideoCard from "@/components/video-card";
import { fetchTrendingVideos, searchVideos } from "@/lib/youtube";
import React, { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

export default function VideoGrid({
  searchParams,
  sessionId,
}: {
  searchParams: { q?: string };
  sessionId: string;
}) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { doc: userDoc, user } = useAuth();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        let fetchedVideos;

        if (searchParams.q) {
          fetchedVideos = await searchVideos(searchParams.q);
        } else {
          fetchedVideos = await fetchTrendingVideos(24);
        }

        setVideos(fetchedVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [searchParams.q]);

  if (loading) {
    return <div className="text-center py-10">Loading videos...</div>;
  }
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          sessionId={sessionId}
          isSessionModerator={userDoc?.activeSession?.moderator === user?.uid}
          userId={user?.uid!}
        />
      ))}
    </div>
  );
}
