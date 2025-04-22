// YouTube API utility functions
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  publishedAt: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
  };
  viewCount?: string;
}

export async function fetchTrendingVideos(
  maxResults = 12
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/videos?part=snippet,statistics&chart=mostPopular&maxResults=${maxResults}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch trending videos");
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails,
      viewCount: item.statistics?.viewCount,
    }));
  } catch (error) {
    console.error("Error fetching trending videos:", error);
    return [];
  }
}

export async function searchVideos(
  query: string,
  maxResults = 12
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to search videos");
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails,
    }));
  } catch (error) {
    console.error("Error searching videos:", error);
    return [];
  }
}

export async function fetchVideoDetails(
  videoId: string
): Promise<YouTubeVideo | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch video details");
    }

    const data = await response.json();

    if (data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      thumbnails: item.snippet.thumbnails,
      viewCount: item.statistics?.viewCount,
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    return null;
  }
}

export function formatViewCount(viewCount?: string): string {
  if (!viewCount) return "0 views";

  const count = Number.parseInt(viewCount, 10);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  } else {
    return `${count} views`;
  }
}

export function formatPublishedDate(publishedAt: string): string {
  const published = new Date(publishedAt);
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - published.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  } else if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  } else if (diffInSeconds < 31536000) {
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  } else {
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  }
}

// Caption track interface
export interface CaptionTrack {
  languageCode: string;
  languageName: string;
  displayName: string;
  vssId: string;
  isTranslatable: boolean;
}

/**
 * Helper function to format video data from API responses
 */
export function formatVideoData(item: any): YouTubeVideo {
  return {
    id: item.id?.videoId || item.id,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails,
    viewCount: item.statistics?.viewCount,
  };
}

/**
 * Fetch available caption tracks for a YouTube video using the player instance
 * @param player The YouTube player instance
 * @returns Array of caption tracks
 */
export function getCaptionTracks(player: any): CaptionTrack[] {
  try {
    if (!player) return [];

    // Make sure captions module is loaded
    if (typeof player.loadModule === "function") {
      player.loadModule("captions");
    }

    // Get available tracks from the player
    return player.getOption("captions", "tracklist") || [];
  } catch (error) {
    console.error("Error fetching caption tracks:", error);
    return [];
  }
}

/**
 * Set a specific caption track for the YouTube player with improved reliability
 * @param player The YouTube player instance
 * @param trackId The ID of the track to set
 * @param enable Whether to enable or disable captions
 */
export function setCaptionTrack(
  player: any,
  trackId: string | null,
  enable: boolean = true
): void {
  try {
    if (!player) return;

    if (enable && trackId) {
      // First make sure the captions module is loaded
      if (typeof player.loadModule === "function") {
        player.loadModule("captions");
      }

      // Set the track and force a reload
      player.setOption("captions", "track", { languageCode: trackId });
      player.setOption("captions", "reload", true);

      // Set some display settings to ensure visibility
      player.setOption("captions", "displaySettings", {
        background: "#000000cc",
        textOpacity: 1,
        textSize: 1,
        windowOpacity: 0,
      });
    } else {
      // Disable captions
      player.setOption("captions", "track", {});
    }
  } catch (error) {
    console.error("Error setting caption track:", error);
  }
}

/**
 * Initialize captions for a YouTube player based on saved preferences
 * @param player The YouTube player instance
 * @returns Object containing tracks and current track info
 */
export async function initializeCaptions(player: any): Promise<{
  tracks: CaptionTrack[];
  currentTrack: string | null;
  enabled: boolean;
}> {
  try {
    // Force load the captions module
    if (typeof player.loadModule === "function") {
      player.loadModule("captions");
    }

    // Need to wait a bit for the module to load
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Get available caption tracks
          const tracks = player.getOption("captions", "tracklist") || [];
          console.log("Available caption tracks:", tracks);
          const captionsEnabled =
            localStorage.getItem("captionsEnabled") === "true";
          let currentTrack = null;

          // If there are tracks and captions should be enabled, enable the first one
          if (tracks.length > 0) {
            const savedTrack = localStorage.getItem("captionsTrack");
            currentTrack =
              savedTrack &&
              tracks.find((t: CaptionTrack) => t.vssId === savedTrack)
                ? savedTrack
                : tracks[0].vssId;

            if (captionsEnabled) {
              // Make sure captions are visible
              player.setOption("captions", "track", {
                languageCode: currentTrack,
              });
              player.setOption("captions", "reload", true);
              player.setOption("captions", "displaySettings", {
                background: "#000000cc",
                textOpacity: 1,
                textSize: 1,
                windowOpacity: 0,
              });
            }
          }
        } catch (e) {
          console.error("Error initializing captions:", e);
          resolve({ tracks: [], currentTrack: null, enabled: false });
        }
      }, 2000); // Increased timeout to ensure module is fully loaded
    });
  } catch (error) {
    console.error("Error in initializeCaptions:", error);
    return { tracks: [], currentTrack: null, enabled: false };
  }
}

/**
 * Ensure proper sizing of YouTube player iframe for fullscreen
 * @param player The YouTube player instance
 */
export function ensurePlayerSize(player: any): void {
  try {
    if (!player || !player.getIframe) return;

    const iframe = player.getIframe();
    if (iframe) {
      // Set to 100% to ensure it fills container
      iframe.style.width = "100%";
      iframe.style.height = "100%";

      // Add CSS class for proper fullscreen handling
      iframe.classList.add("youtube-player-iframe");

      // Ensure proper z-index to appear above controls when in fullscreen
      iframe.style.zIndex = "1";
    }
  } catch (error) {
    console.error("Error setting player size:", error);
  }
}

/**
 * Fetches videos related to a specific video
 */
export async function fetchRelatedVideos(
  videoId: string,
  maxResults: number = 12
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search?part=snippet&relatedVideoId=${videoId}&type=video&maxResults=${maxResults}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch related videos: ${response.status}`);
    }

    const data = await response.json();
    return data.items.map(formatVideoData);
  } catch (error) {
    console.error("Error fetching related videos:", error);
    return [];
  }
}
