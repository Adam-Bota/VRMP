"use client";

import { JaaSMeeting } from "@jitsi/react-sdk";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { toast } from "sonner";
import { leaveSession } from "@/services/sessions";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useRouter } from "next/navigation";
import { User } from "@/types/users"; // Assuming these types exist
import { useAuth } from "./auth-provider";

export function JaasMeetingWrapper() {
  const { theme } = useTheme();
  const iframeRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const {
    doc,
    isLoading: authLoading,
    authStateReady,
    user: authUser,
  } = useAuth();

  const sessionId = doc?.activeSession?.id;
  const userId = authUser?.uid;

  if (authLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 h-full">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!sessionId || !process.env.NEXT_PUBLIC_JITSI_APP_ID) {
    // Optionally, render a message or null if session/app ID isn't available
    return null;
  }

  return (
    // <div className="h-full flex">
    <JaaSMeeting
      appId={process.env.NEXT_PUBLIC_JITSI_APP_ID}
      roomName={sessionId}
      configOverwrite={{
        prejoinConfig: {
          enabled: false,
          hideExtraJoinButtons: ["no-audio", "by-phone"],
        },
        backgroundColor: theme === "dark" ? "#0b0809" : "#ffffff",
        disableLocalVideoFlip: true,
        backgroundAlpha: 0.5,
        disablePoll: true,
        disableChat: false,
        disableInviteFunctions: true,
        disableReactions: true,
        enableLobbyChat: false,
        toolbarButtons: [
          "chat",
          "camera",
          "closedcaptions",
          "fullscreen",
          "hangup",
          "help",
          "highlight",
          "microphone",
          "noisesuppression",
          "participants-pane",
          "profile",
          "select-background",
          "settings",
          "shareaudio",
          "sharedvideo",
          "shortcuts",
          "tileview",
          "toggle-camera",
          "videoquality",
          "whiteboard",
        ],
      }}
      interfaceConfigOverwrite={{
        // VIDEO_LAYOUT_FIT: "nocrop",
        // MOBILE_APP_PROMO: false,

        TILE_VIEW_MAX_COLUMNS: 1,
        DEFAULT_BACKGROUND: theme === "dark" ? "#0b0809" : "#ffffff",
      }}
      userInfo={{
        displayName: doc?.displayName || "Guest",
        email: doc?.email || "",
      }}
      getIFrameRef={(ref) => (iframeRef.current = ref)}
      onReadyToClose={async () => {
        if (!sessionId || !userId) return;
        const leaving = toast.loading("Leaving session...");

        try {
          await leaveSession(sessionId, userId);
          toast.success("Left session.");
          router.push("/"); // Redirect to home after leaving
        } catch (error) {
          console.error("Error leaving session", error);
          toast.error("Error leaving session");
        } finally {
          toast.dismiss(leaving);
        }
      }}
    />
    // </div>
  );
}
