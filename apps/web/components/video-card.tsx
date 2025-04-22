"use client";

import Link from "next/link";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  type YouTubeVideo,
  formatViewCount,
  formatPublishedDate,
} from "@/lib/youtube";
import { useConfirm } from "@/providers/confirm-provider";
import { useState, useCallback } from "react";
import { changeSessionVideo } from "@/services/sessions";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";

interface VideoCardProps {
  video: YouTubeVideo;
  sessionId: string;
  isSessionModerator?: boolean;
  userId: string;
}

export default function VideoCard({ 
  video, 
  sessionId, 
  isSessionModerator = false,
  userId
}: VideoCardProps) {
  const confirm = useConfirm();
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  // Handle video selection with proper permission checks
  const handleVideoSelect = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If user is not a moderator, show a message and cancel the navigation
    if (!isSessionModerator) {
      await confirm({
        title: "Permission Required",
        message: "Only the session moderator can change videos for everyone.",
        confirmText: "OK",
        cancelText: "Cancel"
      });
      return;
    }

    try {
      setIsChanging(true);
      
      // Ask for confirmation before changing the video
      const confirmed = await confirm({
        title: "Change Video",
        message: `Change the video for everyone to "${video.title}"?`,
        confirmText: "Change Video",
        cancelText: "Cancel"
      });
      
      if (confirmed) {
        // Change the video for the session
        await changeSessionVideo(sessionId, userId, video.id);
        
        // Navigate to the video page
        router.push(`${sessionId}/yt?v=${video.id}`);
      }
    } catch (error) {
      console.error("Error changing video:", error);
      await confirm({
        title: "Error",
        message: `Failed to change video: ${error}`,
        confirmText: "OK"
      });
    } finally {
      setIsChanging(false);
    }
  }, [video, sessionId, isSessionModerator, userId, confirm, router]);

  return (
    <Card
      className={`overflow-hidden border-0 shadow-none transition-all hover:bg-accent/50 ${!isSessionModerator ? "cursor-default" : "cursor-pointer"}`}
      onClick={handleVideoSelect}
      title={!isSessionModerator ? "Only the session moderator can change videos for everyone." : undefined}
    >
      <div className="aspect-video relative overflow-hidden rounded-lg">
        <img
          src={video.thumbnails.medium.url || "/placeholder.svg"}
          alt={video.title}
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {isChanging && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white">Changing video...</span>
          </div>
        )}
      </div>
      <CardContent className="p-2 pt-3">
        <h3 className="font-semibold line-clamp-2 text-sm">{video.title}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {video.channelTitle}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {video.viewCount && <span>{formatViewCount(video.viewCount)}</span>}
          <span>•</span>
          <span>{formatPublishedDate(video.publishedAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
