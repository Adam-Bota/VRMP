import { Button } from "@workspace/ui/components/button";
import { UsersRound, Radio, Clock } from "lucide-react";
import { VideoSession } from "@/types/video";
import { inviteUserToSession, removeUserInviteFromSession } from "@/services/videos";
import { toast } from "sonner";

interface SessionItemProps {
  sessionId: string;
  session: VideoSession;
  videoId: string;
  currentUserId: string;
}

export default function SessionItem({
  sessionId,
  session,
  videoId,
  currentUserId,
}: SessionItemProps) {
  // Check if the current user is invited to this session
  const isInvited = Object.keys(session.invitedParticipants || {}).includes(currentUserId);

  // Handle joining or leaving the session
  const handleToggleInvite = async () => {
    try {
      if (isInvited) {
        // User is already invited - remove them
        toast.info("Removing you from session...");
        await removeUserInviteFromSession(videoId, sessionId, currentUserId);
        toast.success("You've been removed from the session");
      } else {
        // User is not invited - add them
        toast.info("Adding you to session...");
        await inviteUserToSession(videoId, sessionId, currentUserId);
        toast.success("You've been added to the session");
      }
    } catch (error) {
      console.error("Failed to update session invitation:", error);
      toast.error("Failed to update session invitation. Please try again.");
    }
  };

  return (
    <div className="bg-zinc-200 dark:bg-zinc-800 p-3 rounded-md">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 flex items-center gap-2">
          {/* Status indicator */}
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}
            />
            <span className="text-xs ml-1">
              {getStatusText(session.status)}
            </span>
          </div>

          <p className="text-sm font-medium">{session.title}</p>
        </div>

        <Button
          size="sm"
          variant={isInvited ? "destructive" : "secondary"}
          onClick={handleToggleInvite}
        >
          {isInvited ? "Leave" : "Join"}
        </Button>
      </div>

      <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-400 space-x-3">
        {session.status === "live" && (
          <span className="flex items-center">
            <UsersRound size={12} className="mr-1" />
            {session.activeParticipants.length || 0} watching
          </span>
        )}

        <span className="flex items-center">
          <Radio size={12} className="mr-1" />
          {Object.keys(session.invitedParticipants)?.length || 0} invited
        </span>

        {session.createdAt && (
          <span className="flex items-center">
            <Clock size={12} className="mr-1" />
            {timeAgoFromTimestamp(session.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}

// Helper function to get status color
function getStatusColor(status?: string): string {
  switch (status) {
    case "live":
      return "bg-green-500";
    case "ended":
      return "bg-red-500";
    case "scheduled":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

// Helper function to get status text
function getStatusText(status?: string): string {
  switch (status) {
    case "live":
      return "Live";
    case "ended":
      return "Ended";
    case "scheduled":
      return "Scheduled";
    default:
      return "Unknown";
  }
}

// Helper function to format time ago from Firestore timestamp
function timeAgoFromTimestamp(timestamp: any): string {
  if (!timestamp) return "";

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}
