"use client";

import React from "react";
import { Slider } from "@workspace/ui/components/slider";
import { Button } from "@workspace/ui/components/button";
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Settings,
  Maximize,
  Minimize,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Heart,
  HeartCrack,
  Laugh,
  Frown,
  Angry,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import {
  useYouTubePlayer,
  playbackSpeeds,
} from "../providers/youtube-player-provider";
import { Video } from "@/types/video";
import { useAuth } from "./auth-provider";
import {
  dislikeVideo,
  likeVideo,
  undislikeVideo,
  unlikeVideo,
} from "@/services/videos";
import { useState } from "react";
import { sendPopupEvent } from "./youtube-player-sync";

// Component props interface
interface YouTubePlayerProps {
  videoId: string;
  height?: number | string;
  width?: number | string;
}

// Main player component (no longer wraps with provider)
export default function YouTubePlayer({
  videoId,
  height = 400,
  width = "100%",
}: YouTubePlayerProps) {
  const { user } = useAuth();
  const userId = user?.uid || "";
  const userName = user?.displayName || user?.email || "Anonymous";
  const {
    video,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    showControls,
    isBuffering,
    showOverlay,
    seekPercentage,
    playbackSpeed,
    togglePlay,
    adjustVolume,
    toggleMute,
    skipForward,
    skipBackward,
    handleSeek,
    toggleFullscreen,
    formatTime,
    setPlaybackSpeed,
  } = useYouTubePlayer();

  // Add styles for fullscreen handling
  React.useEffect(() => {
    // Add a style element for the fullscreen CSS if it doesn't exist yet
    if (!document.getElementById("youtube-player-styles")) {
      const style = document.createElement("style");
      style.id = "youtube-player-styles";
      style.textContent = `
        .youtube-player-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          background: #000 !important;
        }
        .youtube-player-fullscreen iframe,
        .youtube-player-fullscreen #yt-player-${videoId} {
          width: 100% !important;
          height: 100% !important;
        }
        :fullscreen .youtube-player-iframe {
          width: 100% !important;
          height: 100% !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Clean up when component unmounts (optional)
      const styleElement = document.getElementById("youtube-player-styles");
      if (styleElement && videoId === "cleanup") {
        // Only remove on final cleanup
        styleElement.remove();
      }
    };
  }, [videoId]);

  // Like and dislike button handlers
  const handleLike = async () => {
    if (!user) return;
    if (video?.likes?.includes(userId)) {
      await unlikeVideo(videoId, userId);
    } else {
      await likeVideo(videoId, userId);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    // Update video dislikes in the database
    if (video?.dislikes?.includes(userId)) {
      await undislikeVideo(videoId, userId);
    } else {
      await dislikeVideo(videoId, userId);
    }
  };

  // Emoji reaction handler
  const handleEmoji = async (emoji: string) => {
    if (!userId || !videoId) return;
    // sessionId should be passed as a prop or from context
    const sessionId = window.location.pathname.split("/").includes("session")
      ? window.location.pathname.split("/")[2]
      : "";
    if (!sessionId) return;
    await sendPopupEvent(sessionId, userId, userName, emoji as any);
  };

  return (
    <div
      style={{ height: typeof height === "number" ? `${height}px` : height }}
    >
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden bg-black"
        style={{ height: "100%" }}
      >
        {/* YouTube Embed (hidden but functional) */}
        <div className="absolute inset-0">
          <div id={`yt-player-${videoId}`}></div>
        </div>{" "}
        {/* Loading indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="rounded-full border-4 border-white border-opacity-30 border-t-white h-12 w-12 animate-spin"></div>
          </div>
        )}
        {/* Paused Glass Overlay */}
        {!isPlaying && !isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center z-15 bg-[rgba(0,0,0,0.1)] backdrop-blur-md bg-opacity-20">
            <div
              className="flex items-center justify-center w-20 h-20 rounded-full bg-[rgba(255,255,255,0.5)] backdrop-blur-lg border border-white border-opacity-30"
              onClick={togglePlay}
            >
              <Play size={32} className="text-white ml-1" />
            </div>
          </div>
        )}
        {/* Controls Container */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 z-20 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider
              defaultValue={[0]}
              value={[seekPercentage]}
              max={100}
              step={0.1}
              onValueChange={handleSeek}
              orientation="horizontal"
              className="cursor-pointer"
            />
          </div>

          {/* Controls Row */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>

              {/* Skip Back */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipBackward}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipBack size={20} />
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={skipForward}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                <SkipForward size={20} />
              </Button>

              {/* Volume Control */}
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </Button>
                <div className="w-20 hidden sm:block">
                  <Slider
                    defaultValue={[100]}
                    value={[isMuted ? 0 : volume]}
                    max={100}
                    step={1}
                    onValueChange={(value: number[]) =>
                      adjustVolume(value[0] || 0)
                    }
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Like and Dislike */}
              <Button
                variant="ghost"
                // size="icon"
                className={cn(
                  video?.likes?.includes(userId)
                    ? "text-primary hover:bg-primary"
                    : "text-white hover:bg-white",
                  "hover:bg-opacity-20"
                )}
                onClick={handleLike}
              >
                <span className="sr-only">Like</span>
                <ThumbsUp size={20} />
                <span className="text-sm">{video?.likes?.length || 0}</span>
              </Button>

              <Button
                variant="ghost"
                // size="icon"
                className={cn(
                  video?.dislikes?.includes(userId)
                    ? "text-destructive hover:bg-destructive"
                    : "text-white hover:bg-white",
                  "hover:bg-opacity-20"
                )}
                onClick={handleDislike}
              >
                <span className="sr-only">Dislike</span>
                <ThumbsDown size={20} />
                <span className="text-sm">{video?.dislikes?.length || 0}</span>
              </Button>

              {/* Settings Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <Settings size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-zinc-900 text-white border-zinc-800 w-56"
                >
                  {/* Playback Speed */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer hover:bg-white hover:bg-opacity-20">
                      Playback Speed: {playbackSpeed}x
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-zinc-900 text-white border-zinc-800">
                      <DropdownMenuRadioGroup value={playbackSpeed.toString()}>
                        {playbackSpeeds.map((speed) => (
                          <DropdownMenuRadioItem
                            key={speed}
                            value={speed.toString()}
                            className="cursor-pointer hover:bg-white hover:bg-opacity-20"
                            onClick={() => setPlaybackSpeed(speed)}
                          >
                            {speed}x
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white hover:bg-opacity-20"
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </Button>

              {/* Emoji Reaction Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white hover:bg-opacity-20"
                  >
                    <Smile size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-zinc-900 text-white border-zinc-800 w-40"
                >
                  <DropdownMenuItem onClick={() => handleEmoji("like")}>
                    {" "}
                    <ThumbsUp className="text-blue-500" size={18} /> Like{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("dislike")}>
                    {" "}
                    <ThumbsDown className="text-gray-500" size={18} /> Dislike{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("heart")}>
                    {" "}
                    <Heart className="text-pink-500" size={18} /> Heart{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("heart-broken")}>
                    {" "}
                    <HeartCrack className="text-rose-500" size={18} /> Heart Broken{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("laugh")}>
                    {" "}
                    <Laugh className="text-yellow-400" size={18} /> Laugh{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("sad")}>
                    {" "}
                    <Frown className="text-blue-400" size={18} /> Sad{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEmoji("angry")}>
                    {" "}
                    <Angry className="text-red-600" size={18} /> Angry{" "}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
