"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CaptionTrack,
  setCaptionTrack as setYouTubeCaptionTrack,
  initializeCaptions,
  ensurePlayerSize,
} from "../lib/youtube";
import { Video } from "@/types/video";
import { subscribeToVideoDoc } from "@/services/videos";

// Define YouTube API interfaces
interface YT {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    ENDED: number;
    UNSTARTED: number;
    CUED: number;
  };
}

interface YTPlayerOptions {
  height: number | string;
  width: number | string;
  videoId: string;
  playerVars: {
    controls: number;
    disablekb: number;
    modestbranding: number;
    rel: number;
    showinfo: number;
    fs: number;
    iv_load_policy: number;
    [key: string]: any;
  };
  events: {
    onReady: (event: YTPlayerEvent) => void;
    onStateChange: (event: YTPlayerEvent) => void;
    onPlaybackQualityChange: (event: YTPlayerEvent) => void;
    [key: string]: (event: YTPlayerEvent) => void;
  };
}

interface YTPlayerEvent {
  target: YTPlayerInstance;
  data: any;
}

interface YTPlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getAvailableQualityLevels: () => string[];
  getPlaybackQuality: () => string;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackQuality: (quality: string) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  [key: string]: any;
}

// Extend Window interface to include YouTube API
declare global {
  interface Window {
    YT: YT;
    onYouTubeIframeAPIReady: (() => void) | null;
  }
}

// Provider props interface
interface YouTubePlayerProviderProps {
  children: React.ReactNode;
  videoId: string;
  height?: number | string;
  width?: number | string;
}

// Playback speed options
export const playbackSpeeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Context interface - removed transcript-related properties
interface YouTubePlayerContextType {
  video: Partial<Video> | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  player: YTPlayerInstance | null;
  videoId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  isBuffering: boolean;
  showOverlay: boolean;
  seekPercentage: number;
  captions: {
    enabled: boolean;
    tracks: CaptionTrack[];
    currentTrack: string | null;
  };
  playbackSpeed: number;
  togglePlay: () => void;
  adjustVolume: (newVolume: number) => void;
  toggleMute: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  handleSeek: (value: number[]) => void;
  toggleFullscreen: () => void;
  formatTime: (seconds: number) => string;
  toggleCaptions: () => void;
  setCaptionTrack: (trackId: string | null) => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (time: number) => void;
}

// Create context
const YouTubePlayerContext = createContext<YouTubePlayerContextType | null>(
  null
);

export function YouTubePlayerProvider({
  children,
  videoId,
  height = 400,
  width = "100%",
}: YouTubePlayerProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<YTPlayerInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(
    typeof window !== "undefined" && localStorage.getItem("youtubePlayerVolume")
      ? parseInt(localStorage.getItem("youtubePlayerVolume") || "100")
      : 100
  );
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [captions, setCaptions] = useState<{
    enabled: boolean;
    tracks: CaptionTrack[];
    currentTrack: string | null;
  }>({
    enabled: false,
    tracks: [],
    currentTrack: null,
  });
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [video, setVideo] = useState<Partial<Video> | null>(null);

  // Hide controls timeout
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load captions for the video
  const loadCaptions = async (ytPlayer: YTPlayerInstance) => {
    try {
      // Use the utility function to initialize captions
      const captionData = await initializeCaptions(ytPlayer);
      setCaptions(captionData);
    } catch (e) {
      console.error("Error loading captions module:", e);
    }
  };

  // Initialize YouTube player
  useEffect(() => {
    let ytPlayer: YTPlayerInstance | null = null;
    let timeInterval: NodeJS.Timeout | null = null;

    // Only initialize if the API is available
    if (typeof window !== "undefined" && window.YT) {
      initPlayer();
    } else {
      // Load the YouTube API if not already loaded
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    }

    function initPlayer() {
      ytPlayer = new window.YT.Player(`yt-player-${videoId}`, {
        height,
        width,
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0, // Disable fullscreen button
          iv_load_policy: 3, // Hide annotations
          cc_load_policy: 1, // Don't force CC on
          cc_lang_pref: "en", // Default language preference
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onPlaybackQualityChange: function (event: YTPlayerEvent) {
            // Empty handler to prevent errors
          },
        },
      });

      setPlayer(ytPlayer);
    }

    function onPlayerReady(event: YTPlayerEvent) {
      setDuration(event.target.getDuration());

      // Ensure proper iframe sizing for fullscreen
      ensurePlayerSize(event.target);

      // Set saved volume
      const savedVolume = localStorage.getItem("youtubePlayerVolume");
      if (savedVolume !== null) {
        const volumeValue = parseInt(savedVolume);
        event.target.setVolume(volumeValue);
        setVolume(volumeValue);

        // Check if it should be muted
        if (
          volumeValue === 0 ||
          localStorage.getItem("youtubePlayerMuted") === "true"
        ) {
          event.target.mute();
          setIsMuted(true);
        }
      }

      // Set saved playback speed
      const savedSpeed = localStorage.getItem("youtubePlayerSpeed");
      if (savedSpeed !== null) {
        const speedValue = parseFloat(savedSpeed);
        event.target.setPlaybackRate(speedValue);
        setPlaybackSpeed(speedValue);
      }

      // Load captions
      loadCaptions(event.target);

      // Start interval to update time
      timeInterval = setInterval(() => {
        if (ytPlayer && ytPlayer.getCurrentTime) {
          setCurrentTime(ytPlayer.getCurrentTime());
        }
      }, 500);
    }

    function onPlayerStateChange(event: YTPlayerEvent) {
      setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
      setIsBuffering(event.data === window.YT.PlayerState.BUFFERING);

      if (event.data === window.YT.PlayerState.PLAYING) {
        setShowOverlay(false);
      } else if (
        event.data === window.YT.PlayerState.ENDED ||
        event.data === window.YT.PlayerState.PAUSED
      ) {
        setShowOverlay(true);
      }
    }

    // Clean up
    return () => {
      if (ytPlayer) {
        ytPlayer.destroy();
      }
      if (window.onYouTubeIframeAPIReady === initPlayer) {
        window.onYouTubeIframeAPIReady = null;
      }
      if (timeInterval) {
        clearInterval(timeInterval);
      }
    };
  }, [videoId, height, width]);

  useEffect(() => {
    const unsubscribe = subscribeToVideoDoc(videoId, (videoData) => {
      setVideo(videoData);
    });

    return () => unsubscribe();
  }, []);

  // Control UI visibility
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseenter", handleMouseMove);
      container.addEventListener("mouseleave", () => {
        if (isPlaying) {
          setShowControls(false);
        }
      });
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseenter", handleMouseMove);
        container.removeEventListener("mouseleave", () => {});
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!player) return;

      // Skip keyboard shortcuts if a form element is focused
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName.toLowerCase();

      // Check if any interactive element has focus
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        tagName === "button" ||
        activeElement?.hasAttribute("contenteditable") ||
        activeElement?.getAttribute("role") === "slider" ||
        activeElement?.classList.contains("slider") ||
        // Check for common UI component classes
        activeElement?.closest('[role="dialog"]') ||
        activeElement?.closest('[role="menu"]') ||
        activeElement?.closest('[role="listbox"]')
      ) {
        return; // Skip shortcuts when form elements are focused
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skipForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBackward();
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(Math.min(volume + 5, 100));
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(Math.max(volume - 5, 0));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [player, volume, isMuted, isPlaying]);

  // Player controls
  const togglePlay = (): void => {
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const adjustVolume = (newVolume: number): void => {
    if (!player) return;

    player.setVolume(newVolume);
    setVolume(newVolume);

    // Save to localStorage
    localStorage.setItem("youtubePlayerVolume", newVolume.toString());

    if (newVolume === 0) {
      setIsMuted(true);
      localStorage.setItem("youtubePlayerMuted", "true");
    } else if (isMuted) {
      setIsMuted(false);
      localStorage.setItem("youtubePlayerMuted", "false");
    }
  };

  const toggleMute = (): void => {
    if (!player) return;

    if (isMuted) {
      player.unMute();
      setIsMuted(false);
      localStorage.setItem("youtubePlayerMuted", "false");
    } else {
      player.mute();
      setIsMuted(true);
      localStorage.setItem("youtubePlayerMuted", "true");
    }
  };

  const skipForward = (): void => {
    if (!player) return;

    const newTime = Math.min(player.getCurrentTime() + 10, duration);
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const skipBackward = (): void => {
    if (!player) return;

    const newTime = Math.max(player.getCurrentTime() - 10, 0);
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleSeek = (value: number[]): void => {
    if (!player || !value[0]) return;

    const newTime = (value[0] / 100) * duration;
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const toggleFullscreen = (): void => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        containerRef.current
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
            // Ensure player size is updated
            if (player && player.getIframe) {
              const iframe = player.getIframe();
              if (iframe) {
                iframe.style.width = "100%";
                iframe.style.height = "100%";
              }
            }
          })
          .catch((err) => {
            console.error(
              `Error attempting to enable fullscreen: ${err.message}`
            );
          });
      } else {
        // Exit fullscreen
        document
          .exitFullscreen()
          .then(() => {
            setIsFullscreen(false);
          })
          .catch((err) => {
            console.error(
              `Error attempting to exit fullscreen: ${err.message}`
            );
          });
      }
    } catch (error) {
      console.error("Fullscreen error:", error);

      // Fallback for browsers without fullscreen API
      setIsFullscreen(!isFullscreen);
      if (containerRef.current) {
        containerRef.current.classList.toggle("youtube-player-fullscreen");
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    } else {
      return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    }
  };

  // Captions controls
  const toggleCaptions = (): void => {
    if (!player) return;

    try {
      const newState = !captions.enabled;

      if (newState && captions.tracks.length > 0) {
        // Enable captions with current track or first available
        const trackToUse = captions.currentTrack || captions.tracks[0]!.vssId;
        setYouTubeCaptionTrack(player, trackToUse, true);
        setCaptions((prev) => ({
          ...prev,
          enabled: true,
          currentTrack: trackToUse,
        }));
      } else {
        // Disable captions
        setYouTubeCaptionTrack(player, null, false);
        setCaptions((prev) => ({ ...prev, enabled: false }));
      }

      // Save preference
      localStorage.setItem("captionsEnabled", newState.toString());
    } catch (e) {
      console.error("Error toggling captions:", e);
    }
  };

  const setCaptionTrack = (trackId: string | null): void => {
    if (!player || !trackId) return;

    try {
      setYouTubeCaptionTrack(player, trackId, true);
      setCaptions((prev) => ({
        ...prev,
        enabled: true,
        currentTrack: trackId,
      }));

      // Save preference
      localStorage.setItem("captionsTrack", trackId);
      localStorage.setItem("captionsEnabled", "true");
    } catch (e) {
      console.error("Error setting caption track:", e);
    }
  };

  // Playback speed control
  const updatePlaybackSpeed = (speed: number): void => {
    if (!player) return;

    player.setPlaybackRate(speed);
    setPlaybackSpeed(speed);

    // Save preference
    localStorage.setItem("youtubePlayerSpeed", speed.toString());
  };

  // Add a direct seekTo method
  const seekTo = (time: number): void => {
    if (!player) return;
    player.seekTo(time, true);
    setCurrentTime(time);
  };

  // Calculate seek bar percentage
  const seekPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const value = {
    video,
    containerRef,
    player,
    videoId,
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
    captions,
    playbackSpeed,
    togglePlay,
    adjustVolume,
    toggleMute,
    skipForward,
    skipBackward,
    handleSeek,
    toggleFullscreen,
    formatTime,
    toggleCaptions,
    setCaptionTrack,
    setPlaybackSpeed: updatePlaybackSpeed,
    seekTo,
  };

  return (
    <YouTubePlayerContext.Provider value={value}>
      {children}
    </YouTubePlayerContext.Provider>
  );
}

// Custom hook to use the YouTube player context
export function useYouTubePlayer() {
  const context = useContext(YouTubePlayerContext);
  if (!context) {
    throw new Error(
      "useYouTubePlayer must be used within a YouTubePlayerProvider"
    );
  }
  return context;
}
