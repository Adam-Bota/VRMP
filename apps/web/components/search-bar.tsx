"use client";

import { useState, type FormEvent, type KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { parse } from 'url';
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import { getSessionById } from "@/services/sessions";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { user, doc } = useAuth();
  const [isModeratorUser, setIsModeratorUser] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkModeratorStatus = async () => {
      if (!user || !doc?.activeSession?.id) {
        setIsModeratorUser(false);
        setIsLoading(false);
        return;
      }

      try {
        const sessionId = doc.activeSession.id;
        const session = await getSessionById(sessionId);
        
        if (session) {
          const isModerator = session.moderator === user.uid;
          setIsModeratorUser(isModerator);
        } else {
          setIsModeratorUser(false);
        }
      } catch (error) {
        console.error("Error checking moderator status:", error);
        setIsModeratorUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkModeratorStatus();
  }, [user, doc]);

  const extractYouTubeVideoId = (url: string): string | null => {
    const parsedUrl = parse(url, true);
    if (parsedUrl.hostname === "www.youtube.com" || parsedUrl.hostname === "youtube.com") {
      return parsedUrl.query.v as string || null;
    } else if (parsedUrl.hostname === "youtu.be") {
      return parsedUrl.pathname?.split("/")[1] || null;
    }
    return null;
  };

  const handleSearch = () => {
    // Prevent non-moderators from searching
    if (!isModeratorUser) {
      toast.error("Only the session moderator can search for videos");
      return;
    }

    const videoId = extractYouTubeVideoId(query.trim());
    toast.info("Searching...");
    if (videoId) {
      router.push(`yt?v=${encodeURIComponent(videoId)}`);
    } else if (query.trim()) {
      router.push(`?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex items-center w-full gap-4">
      <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
        <Input
          type="text"
          placeholder={isModeratorUser 
            ? "Search or paste a YouTube link" 
            : "Only the session moderator can search for videos"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={!isModeratorUser || isLoading}
        />
        <Button 
          type="submit" 
          variant="default"
          disabled={!isModeratorUser || isLoading}
        >
          Search
        </Button>
      </form>
    </div>
  );
}
