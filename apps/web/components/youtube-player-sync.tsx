"use client";

import { useEffect, useRef, useState } from "react";
import { useYouTubePlayer } from "@/providers/youtube-player-provider";
import {
  subscribeToVideoEvents,
  updateParticipantTime,
  getVideoState,
} from "@/services/realtime/sessions";
import { VideoEvent } from "@/types/session";
import debounce from "lodash/debounce";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
// import { setUserCurrentVideo, clearUserCurrentVideo } from "@/services/users";

interface YouTubePlayerSyncProps {
  sessionId: string;
  userId: string;
  isSessionModerator?: boolean;
}

// Helper function to safely get timestamp in milliseconds
function getTimestampMillis(timestamp: any): number {
  // Handle Firebase Realtime DB timestamp format (which is different from Firestore)
  if (timestamp && typeof timestamp === "object") {
    // If it's a Firestore Timestamp object
    if (timestamp.toMillis && typeof timestamp.toMillis === "function") {
      return timestamp.toMillis();
    }
    if (
      timestamp.seconds !== undefined &&
      timestamp.nanoseconds !== undefined
    ) {
      return timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
    }
    // If it's a standard date object
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
  }
  // Fallback to current time if invalid
  return Date.now();
}

// Calculate time compensation based on event timestamp and current time
function calculateTimeCompensation(eventTimestamp: any): number {
  try {
    const eventTimeMs = getTimestampMillis(eventTimestamp);
    const currentTimeMs = Date.now();
    const deltaSeconds = (currentTimeMs - eventTimeMs) / 1000;

    // Only compensate if delta is positive (event happened in the past)
    // and reasonable (less than 30 seconds)
    if (deltaSeconds > 0 && deltaSeconds < 30) {
      console.log(`Time compensation: +${deltaSeconds.toFixed(2)}s`);
      return deltaSeconds;
    }
    return 0;
  } catch (error) {
    console.error("Error calculating time compensation:", error);
    return 0;
  }
}

// Helper function to ensure an event has valid timestamp
function normalizeEvent(event: any): VideoEvent {
  // Create a copy of the event to avoid modifying the original
  const normalized = { ...event };

  // Ensure timestamp is a proper object
  if (typeof normalized.timestamp !== "object" || !normalized.timestamp) {
    console.warn(
      "Timestamp is not an object, replacing with current time",
      normalized.timestamp
    );
    normalized.timestamp = Timestamp.now();
  }
  // Add toMillis method if it doesn't exist
  else if (!normalized.timestamp.toMillis) {
    const originalTimestamp = normalized.timestamp;
    normalized.timestamp = {
      ...originalTimestamp,
      toMillis: () => {
        if (originalTimestamp.seconds !== undefined) {
          return (
            originalTimestamp.seconds * 1000 +
            (originalTimestamp.nanoseconds || 0) / 1000000
          );
        }
        return Date.now();
      },
    };
  }

  return normalized as VideoEvent;
}

// Add a new helper for throttling events
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      lastArgs = null;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// Video control functions that work with the updated architecture
async function playVideo(
  sessionId: string,
  userId: string,
  currentTime: number
): Promise<void> {
  try {
    const { addVideoEvent } = await import("@/services/realtime/sessions");
    await addVideoEvent(sessionId, userId, "play", currentTime);
  } catch (error) {
    console.error("Error sending play event:", error);
    throw error;
  }
}

async function pauseVideo(
  sessionId: string,
  userId: string,
  currentTime: number
): Promise<void> {
  try {
    const { addVideoEvent } = await import("@/services/realtime/sessions");
    await addVideoEvent(sessionId, userId, "pause", currentTime);
  } catch (error) {
    console.error("Error sending pause event:", error);
    throw error;
  }
}

async function seekVideo(
  sessionId: string,
  userId: string,
  currentTime: number,
  seekTime: number,
): Promise<void> {
  try {
    const { addVideoEvent } = await import("@/services/realtime/sessions");
    await addVideoEvent(sessionId, userId, "seek", currentTime, seekTime);
  } catch (error) {
    console.error("Error sending seek event:", error);
    throw error;
  }
}

// Direct access to Realtime DB for setting video ID
async function setVideoId(sessionId: string, videoId: string): Promise<void> {
  try {
    // Direct realtime DB access (no firestore dependency)
    const { setVideoId: setRealtimeVideoId } = await import(
      "@/services/realtime/sessions"
    );
    await setRealtimeVideoId(sessionId, videoId);
  } catch (error) {
    console.error("Error setting video ID:", error);
    throw error;
  }
}

export function YouTubePlayerSync({
  sessionId,
  userId,
  isSessionModerator = false,
}: YouTubePlayerSyncProps) {
  const { player, isPlaying, currentTime, videoId, seekTo } =
    useYouTubePlayer();

  const [videoEvents, setVideoEvents] = useState<VideoEvent[]>([]);
  const lastEventRef = useRef<VideoEvent | null>(null);
  const lastUserActionRef = useRef<{ type: string; time: number } | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const remotePlayerStateRef = useRef<"playing" | "paused" | null>(null);
  const isHandlingRemoteEventRef = useRef(false);  const pendingLocalEventsRef = useRef<{ type: string; time: number }[]>([]);
  const currentVideoIdRef = useRef<string | null>(null);
  const hasInitialSyncRef = useRef<boolean>(false);
  const [participantTimes, setParticipantTimes] = useState<{
    [userId: string]: {
      currentTime: number;
      lastActive: Timestamp;
    };
  }>({});
  
  // Store current player state in refs to avoid dependencies in useEffect
  const playerRef = useRef(player);
  const isPlayingRef = useRef(isPlaying);
  const seekToRef = useRef(seekTo);
  
  // Update refs when values change
  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  
  useEffect(() => {
    seekToRef.current = seekTo;
  }, [seekTo]);
  // Create throttled versions of functions to avoid flooding the database
  const throttledPlayVideo = useRef(throttle(playVideo, 500)).current;
  const throttledPauseVideo = useRef(throttle(pauseVideo, 500)).current;
  // Don't throttle seek events for better accuracy
  const debouncedSeekVideo = useRef(debounce(seekVideo, 100)).current;

  const debouncedUpdateTime = useRef(
    debounce(updateParticipantTime, 2000)
  ).current;  // When component mounts or videoId/sessionId changes, set up DB listeners
  useEffect(() => {
    if (!sessionId) return;
    
    // Prevent multiple setups for the same session/video combo
    const setupKey = `${sessionId}-${videoId || 'no-video'}`;
    if (currentVideoIdRef.current === setupKey) {
      return;
    }

    console.log(
      `Setting up sync for session ${sessionId} with video ${videoId}`
    );

    // Set the video ID in the database if we have one
    if (videoId && sessionId) {
      setVideoId(sessionId, videoId).catch((err) => {
        setSyncErrors((prev) => [
          ...prev,
          `Failed to set video ID: ${err.message}`,
        ]);
      });
    }

    // Set initial video reference to prevent re-setup
    currentVideoIdRef.current = setupKey;

    // Subscribe to video events from the database
    const unsubscribe = subscribeToVideoEvents(sessionId, (events) => {
      try {
        // Process and normalize events to ensure they have valid timestamps
        const normalizedEvents = events.map(normalizeEvent);
        console.log(`Received ${normalizedEvents.length} video events`);
        setVideoEvents(normalizedEvents);

        // Also extract participant times from video state to use for initial sync
        fetchParticipantTimes(sessionId)
          .then((times) => {
            if (times) {
              setParticipantTimes(times);
            }
          })
          .catch((err) =>
            console.error("Error fetching participant times:", err)
          );
      } catch (error) {
        console.error("Error processing video events:", error);
        setSyncErrors((prev) => [...prev, `Error processing events: ${error}`]);
      }
    });

    return () => {
      unsubscribe();
      debouncedUpdateTime.cancel();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [sessionId, userId, videoId]); // Only essential dependencies

  // Separate effect for time sync interval that depends on player state
  useEffect(() => {
    if (!player || !sessionId || !userId) return;

    // Start interval for regular time updates
    syncIntervalRef.current = setInterval(() => {
      if (isPlaying && typeof player.getCurrentTime === "function") {
        try {
          const currentPlayerTime = player.getCurrentTime();
          debouncedUpdateTime(sessionId, userId, currentPlayerTime);
        } catch (error) {
          console.error("Error in time sync interval:", error);
        }
      }
    }, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [player, isPlaying, sessionId, userId]);// Sync health monitoring - simple cleanup every 30 seconds
  useEffect(() => {
    if (!player || !sessionId || !userId) return;

    const healthCheckInterval = setInterval(() => {
      try {
        // Reset stale action tracking every 30 seconds
        const lastAction = lastUserActionRef.current;
        const timeSinceLastAction = lastAction ? (Date.now() - lastAction.time) : Infinity;
        
        if (timeSinceLastAction > 30000) {
          console.log("Health check: Resetting stale action tracking");
          lastUserActionRef.current = null;
          isHandlingRemoteEventRef.current = false;
        }
      } catch (error) {
        console.warn("Health check failed:", error);
        isHandlingRemoteEventRef.current = false;
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [player, sessionId, userId]);

  // When the component mounts or videoId changes, update the user's current video in Firestore
  useEffect(() => {
    if (!videoId || !userId || !sessionId) return;

    // Clean up when component unmounts or videoId changes
    return () => {
      // // Only clear if we're unmounting (not if videoId is just changing)
      // if (typeof window !== 'undefined' && window.location.pathname !== `/${sessionId}/yt`) {
      //   clearUserCurrentVideo(userId)
      //     .catch(error => console.error("Error clearing user's current video:", error));
      // }
    };
  }, [sessionId, userId, videoId]);  // Process incoming events from other users
  useEffect(() => {
    const currentPlayer = playerRef.current;
    const currentIsPlaying = isPlayingRef.current;
    const currentSeekTo = seekToRef.current;
    
    if (!currentPlayer || !videoEvents.length || !sessionId) return;

    // Check if player methods are available before proceeding
    if (typeof currentPlayer.getCurrentTime !== "function") {
      console.warn("Player not ready for sync operations");
      return;
    }

    try {
      // Filter out events that originated from this user
      const externalEvents = videoEvents.filter(
        (event) => event.userId !== userId && event.originator !== userId
      );

      if (externalEvents.length === 0) {
        return;
      }

      // Sort events by timestamp (newest first)
      const sortedEvents = externalEvents.sort((a, b) => {
        try {
          const timeA = getTimestampMillis(a.timestamp);
          const timeB = getTimestampMillis(b.timestamp);
          return timeB - timeA; // Descending order (newest first)
        } catch (error) {
          console.error("Error sorting events:", error);
          return 0;
        }
      });

      const latestExternalEvent = sortedEvents[0];

      if (!latestExternalEvent) return;

      // Skip if we've already processed this exact event
      if (lastEventRef.current?.id === latestExternalEvent.id) {
        return;
      }

      // Store this event as processed
      lastEventRef.current = latestExternalEvent;

      const currentPlayerTime = currentPlayer.getCurrentTime();
      const eventCurrentTime =
        "currentTime" in latestExternalEvent
          ? latestExternalEvent.currentTime
          : 0;

      // Calculate time compensation based on when this event was created vs. current time
      const timeCompensation = calculateTimeCompensation(
        latestExternalEvent.timestamp
      );

      // Apply compensation to get the adjusted target time
      const compensatedTargetTime = eventCurrentTime + timeCompensation;
      const timeDifference = Math.abs(
        currentPlayerTime - compensatedTargetTime
      );

      console.log(
        `Sync: Received ${latestExternalEvent.type} event from ${latestExternalEvent.userId}`
      );
      if (timeCompensation > 0) {
        console.log(
          `Time compensation applied: ${eventCurrentTime} → ${compensatedTargetTime}`
        );
      }

      // Mark that we're handling a remote event to avoid feedback loops
      isHandlingRemoteEventRef.current = true;

      switch (latestExternalEvent.type) {
        case "play":
          // Update our tracked remote player state
          remotePlayerStateRef.current = "playing";

          // Only play if we're not already playing
          if (!currentIsPlaying && typeof currentPlayer.playVideo === "function") {
            console.log("Sync: Remote play triggered");

            // If time difference is significant after compensation, seek first then play
            if (timeDifference > 2) {
              console.log(
                `Sync: Seeking to compensated time ${compensatedTargetTime}`
              );
              currentSeekTo(compensatedTargetTime);

              // Small delay to ensure seek completes before playing
              setTimeout(() => {
                currentPlayer.playVideo();
              }, 200);
            } else {
              currentPlayer.playVideo();
            }
          } else if (currentIsPlaying && timeDifference > 2) {
            // Already playing but needs time adjustment
            console.log(
              `Sync: Already playing, seeking to compensated time ${compensatedTargetTime}`
            );
            currentSeekTo(compensatedTargetTime);
          }
          break;

        case "pause":
          // Update our tracked remote player state
          remotePlayerStateRef.current = "paused";

          // Only pause if we're not already paused
          if (currentIsPlaying && typeof currentPlayer.pauseVideo === "function") {
            console.log("Sync: Remote pause triggered");
            currentPlayer.pauseVideo();
          }
          break;
          
        case "seek":
          // Apply time compensation to the seek target
          const compensatedSeekTime =
            ("seekTime" in latestExternalEvent
              ? latestExternalEvent.seekTime
              : eventCurrentTime) + timeCompensation;

          console.log(
            `Sync: Remote seek to ${compensatedSeekTime} (with ${timeCompensation}s compensation)`
          );
          currentSeekTo(compensatedSeekTime);
          break;

        case "video_change":
          if ("videoId" in latestExternalEvent) {
            const newVideoId = latestExternalEvent.videoId;
            console.log(`Sync: Remote video change to ${newVideoId}`);

            // Skip if this is our current video already
            if (newVideoId === currentVideoIdRef.current) {
              console.log("Video already playing, skipping change");
              break;
            }

            // Update our reference to prevent feedback loops
            currentVideoIdRef.current = newVideoId;

            // If video is empty, we're clearing the video
            if (!newVideoId) {
              console.log("Clearing current video");
              break;
            }

            // Navigate to the video page with the new video ID
            if (typeof window !== "undefined") {
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set("v", newVideoId);
              window.location.href = currentUrl.toString();
            }
          }
          break;
      }

      // Reset handling flag after 500ms
      setTimeout(() => {
        isHandlingRemoteEventRef.current = false;
      }, 500);

      // Process any pending local events that were delayed
      if (pendingLocalEventsRef.current.length > 0) {
        const nextEvent = pendingLocalEventsRef.current.shift();
        if (nextEvent && typeof currentPlayer.getCurrentTime === "function") {
          const currentTime = currentPlayer.getCurrentTime();
          if (nextEvent.type === "play") {
            throttledPlayVideo(sessionId, userId, currentTime);
          } else if (nextEvent.type === "pause") {
            throttledPauseVideo(sessionId, userId, currentTime);
          }
        }

        // Clear pending events older than 3 seconds
        const now = Date.now();
        pendingLocalEventsRef.current = pendingLocalEventsRef.current.filter(
          (event) => now - event.time < 3000
        );
      }
    } catch (error) {
      console.error("Error processing sync events:", error);
      setSyncErrors((prev) => [...prev, `Error processing events: ${error}`]);
      // Reset flag on error after 500ms
      setTimeout(() => {
        isHandlingRemoteEventRef.current = false;
      }, 500);
    }  }, [videoEvents, sessionId, userId]); // Only essential dependencies  // Send local player state changes to db
  useEffect(() => {
    const currentPlayer = playerRef.current;
    if (!currentPlayer || !sessionId || !userId) return;

    const handlePlayStateChange = (isPlaying: boolean) => {
      try {
        // Check if player methods are available
        if (typeof currentPlayer.getCurrentTime !== "function") {
          console.warn("Player getCurrentTime method not available yet");
          return;
        }

        const currentPlayerTime = currentPlayer.getCurrentTime();

        // Don't send events if we're handling a remote event
        if (isHandlingRemoteEventRef.current) {
          return;
        }

        // Don't send redundant events if remote state matches
        if (
          (isPlaying && remotePlayerStateRef.current === "playing") ||
          (!isPlaying && remotePlayerStateRef.current === "paused")
        ) {
          console.log(
            `Skipping redundant ${isPlaying ? "play" : "pause"} event`
          );
          return;
        }

        // Track this local action
        const eventType = isPlaying ? "play" : "pause";
        lastUserActionRef.current = {
          type: eventType,
          time: Date.now(),
        };

        console.log(`Sending ${eventType} event at time ${currentPlayerTime}`);

        // Store this as a pending event or process immediately
        if (isHandlingRemoteEventRef.current) {
          pendingLocalEventsRef.current.push({
            type: eventType,
            time: Date.now(),
          });
        } else {
          if (isPlaying) {
            throttledPlayVideo(sessionId, userId, currentPlayerTime);
          } else {
            throttledPauseVideo(sessionId, userId, currentPlayerTime);
          }
        }

        // Update the local tracking of remote state to match our action
        remotePlayerStateRef.current = isPlaying ? "playing" : "paused";
      } catch (error) {
        console.error("Error handling play state change:", error);
        setSyncErrors((prev) => [...prev, `Error handling playback: ${error}`]);
      }
    };

    const handleSeekChange = (currentTime: number) => {
      try {
        // Don't send events if we're handling a remote event
        if (isHandlingRemoteEventRef.current) {
          return;
        }

        // Track this local action
        lastUserActionRef.current = {
          type: "seek",
          time: Date.now(),
        };

        console.log(`Sending seek event to time ${currentTime}`);

        // Send the seek event
        seekVideo(sessionId, userId, currentTime, currentTime)
          .catch(error => console.error("Failed to send seek event:", error));
      } catch (error) {
        console.error("Error handling seek change:", error);
        setSyncErrors((prev) => [...prev, `Error handling seek: ${error}`]);
      }
    };

    // Listen for events from the YouTube iframe
    if (typeof currentPlayer.getIframe !== "function") {
      console.warn("Player missing getIframe method");
      return;
    }

    const iframe = currentPlayer.getIframe();
    if (!iframe) {
      console.warn("Player iframe not available yet");
      return;
    }

    let lastTime = 0;
    let isPlayerReady = false;
    
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from YouTube player
      if (event.source !== iframe.contentWindow) return;

      try {
        const data = JSON.parse(event.data);
        
        if (data.event === "onStateChange") {
          const playerState = data.info;

          // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
          if (playerState === 1) {
            // Playing
            handlePlayStateChange(true);
            isPlayerReady = true;
          } else if (playerState === 2) {
            // Paused
            handlePlayStateChange(false);
            isPlayerReady = true;
          } else if (playerState === 5) {
            // Cued - player is ready
            isPlayerReady = true;
          }
        } else if (data.event === "onVideoProgress" && isPlayerReady) {
          // Handle seeking through video progress events
          const currentTime = data.info;
          const timeDifference = Math.abs(currentTime - lastTime);
          
          // If time jumped more than 2 seconds, it's a seek
          if (timeDifference > 2 && lastTime > 0) {
            handleSeekChange(currentTime);
          }
          
          lastTime = currentTime;
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
    };

    // Also use a simple interval as fallback for seek detection
    let seekCheckInterval: NodeJS.Timeout | null = null;
    
    // Wait a bit for the player to be ready before starting seek detection
    const startSeekDetection = () => {
      if (!currentPlayer || typeof currentPlayer.getCurrentTime !== "function") {
        return;
      }
      
      try {
        lastTime = currentPlayer.getCurrentTime();
        isPlayerReady = true;
        
        seekCheckInterval = setInterval(() => {
          if (!currentPlayer || typeof currentPlayer.getCurrentTime !== "function") return;
          
          try {
            const currentTime = currentPlayer.getCurrentTime();
            const timeDifference = Math.abs(currentTime - lastTime);
            
            // If time jumped more than 2 seconds, it's a seek
            if (timeDifference > 2 && lastTime > 0 && isPlayerReady) {
              handleSeekChange(currentTime);
            }
            
            lastTime = currentTime;
          } catch (error) {
            console.error("Error in seek detection fallback:", error);
          }
        }, 500);
      } catch (error) {
        console.error("Error setting up seek detection:", error);
      }
    };

    // Start seek detection after a short delay
    const seekDetectionTimeout = setTimeout(startSeekDetection, 1000);

    window.addEventListener("message", handleMessage);
    
    return () => {
      window.removeEventListener("message", handleMessage);
      if (seekCheckInterval) {
        clearInterval(seekCheckInterval);
      }
      if (seekDetectionTimeout) {
        clearTimeout(seekDetectionTimeout);
      }
    };
  }, [sessionId, userId]); // Removed player dependency// For new members joining, sync their player to the most accurate time
  useEffect(() => {
    const currentPlayer = playerRef.current;
    if (
      !currentPlayer ||
      !sessionId ||
      !userId ||
      !videoId ||
      hasInitialSyncRef.current
    )
      return;

    if (Object.keys(participantTimes).length === 0) {
      console.log("No participant times available yet for initial sync");
      return;
    }

    try {
      // Find the most recent participant time (excluding our own)
      const otherParticipantTimes = Object.entries(participantTimes)
        .filter(([participantId]) => participantId !== userId)
        .map(([participantId, data]) => ({
          userId: participantId,
          time: data,
          lastActive: new Date(data.lastActive.seconds * 1000),
        }))
        .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

      if (otherParticipantTimes.length === 0) {
        console.log("No other participants to sync with");
        hasInitialSyncRef.current = true;
        return;
      }

      // Use the most recently active participant's time
      const {
        time: syncTime,
        userId: syncUserId,
        lastActive,
      } = otherParticipantTimes[0]!;

      // Skip if we're the originator
      if (syncUserId === userId) {
        hasInitialSyncRef.current = true;
        return;
      }

      // Check if we have valid time data
      if (syncTime && typeof syncTime.currentTime === 'number' && syncTime.currentTime > 0) {
        // Calculate how much time has passed since their last update
        const timeSinceUpdate = (Date.now() - lastActive.getTime()) / 1000;

        // Add time compensation based on how long ago their time was reported
        const compensatedTime = syncTime.currentTime + timeSinceUpdate;

        console.log(
          `Initial sync: Jumping to time ${compensatedTime.toFixed(2)} (original: ${syncTime.currentTime.toFixed(2)}, delta: +${timeSinceUpdate.toFixed(2)}s) from user ${syncUserId}`
        );

        // Add a small additional buffer for network delay
        const bufferedTime = compensatedTime + 0.5;

        // Seek to that time
        if (typeof currentPlayer.seekTo === "function") {
          currentPlayer.seekTo(bufferedTime, true);

          // Update our local tracking after seeking
          if (typeof currentPlayer.getCurrentTime === "function") {
            debouncedUpdateTime(sessionId, userId, bufferedTime);
          }

          // Show a toast notification for the user
          toast.info(`Synced playback with other viewers`);

          // Mark that we've done the initial sync
          hasInitialSyncRef.current = true;
        }
      } else {
        console.log("No valid sync time found, starting from beginning");
        hasInitialSyncRef.current = true;
      }
    } catch (error) {
      console.error("Error during initial player sync:", error);
      hasInitialSyncRef.current = true; // Prevent trying again
    }
  }, [participantTimes, sessionId, userId, videoId]); // Removed player dependency

  // If there are sync errors, we could show them for debugging
  if (syncErrors.length > 0 && process.env.NODE_ENV === "development") {
    return (
      <div className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-32">
        <h4>Sync Errors:</h4>
        <ul>
          {syncErrors.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  // This is a UI-less component for production
  return null;
}

// Utility function to fetch participant times from the database
async function fetchParticipantTimes(sessionId: string): Promise<{
  [userId: string]: { currentTime: number; lastActive: Timestamp };
} | null> {
  if (!sessionId) return null;

  try {
    // Import only when needed to avoid issues with circular dependencies
    const { getVideoState } = await import("@/services/realtime/sessions");
    const videoState = await getVideoState(sessionId);

    if (videoState?.participantTimes) {
      return videoState.participantTimes;
    }
    return null;
  } catch (error) {
    console.error("Error fetching participant times:", error);
    return null;
  }
}
