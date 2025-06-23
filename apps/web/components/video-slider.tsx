"use client";

import VideoCard from "@/components/video-card";
import {
  fetchTrendingVideos,
  recommendVideos,
  searchVideos,
} from "@/lib/youtube";
import React, { useEffect, useState } from "react";
import { useAuth } from "./auth-provider";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";

export default function VideoSlider({
  sessionId,
  videoId,
}: {
  videoId?: string;
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

        fetchedVideos = await recommendVideos(videoId);

        setVideos(fetchedVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [videoId]);

  if (loading) {
    return <div className="text-center py-10">Recommending videos...</div>;
  }

  return (
    <Carousel className="w-full px-12 relative">
      <CarouselContent>
        {videos.map((video) => (
          <CarouselItem key={video.id} className="md:basis-1/3 lg:basis-1/4">
            <div className="p-1 h-full">
              <VideoCard
                video={video}
                sessionId={sessionId}
                isSessionModerator={
                  userDoc?.activeSession?.moderator === user?.uid
                }
                userId={user?.uid!}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        className={
          "absolute left-2 top-1/2 -translate-y-1/2"
        }      />
      <CarouselNext
        className={
          "absolute right-2  top-1/2 -translate-y-1/2"
        }
      />
    </Carousel>
  );
}
