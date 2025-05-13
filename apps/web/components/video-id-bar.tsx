"use client";

import { useState, type FormEvent, type KeyboardEvent, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { parse } from 'url';
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import { getSessionById } from "@/services/sessions";

export default function VideoIdBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState<string>("");
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
    if (videoId) {
      console.log(pathname)
      router.push(`${pathname}/yt?v=${encodeURIComponent(videoId)}`);
    } else {
      toast.error("Invalid YouTube link. Please provide a valid link.");
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
    <div className="flex items-center gap-4 container mx-auto max-w-4xl px-2">
      <form onSubmit={handleSubmit} className="flex flex-col w-full items-center gap-4">
        <Input
          type="text"
         
          placeholder={isModeratorUser 
            ? "Paste a YouTube link" 
            : "Only the session moderator can play video"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 text-3xl"
          disabled={!isModeratorUser || isLoading}
        />
        <Button 
          type="submit" 
          variant="default"
          disabled={!isModeratorUser || isLoading}
          className="w-32"
        >
          Go
        </Button>
      </form>
    </div>
  );
}
