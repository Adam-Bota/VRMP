"use client";

import { Command, Copy, LogOut, Moon, Search, Sun } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import Link from "next/link";
import { siteConfig } from "@/siteConfig";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";

import { JaaSMeeting } from "@jitsi/react-sdk";
import { useAuth } from "./auth-provider";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { leaveSession } from "@/services/sessions";
import { Button } from "@workspace/ui/components/button";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { useConfirm } from "@/providers/confirm-provider";
import { clearUserCurrentVideo } from "@/services/users";
import { updateScreenState } from "@/services/realtime/sessions";

export function AppSidebar({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { doc, isLoading, authStateReady, user } = useAuth();
  const router = useRouter();
  const iframeRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const confirm = useConfirm();
  const pathname = usePathname();
  const isInVideo = pathname?.includes("/yt");

  const isModeratorUser = doc?.activeSession?.moderator === user?.uid;
  const sessionId = doc?.activeSession?.id || "";

  // useEffect(() => {
  //   if (isLoading || !authStateReady) return;
  //   if (!doc?.activeSession) {
  //     if (!doc?.activeSession) {
  //       toast.info("No active session found.");
  //       router.push("/");
  //     }
  //   }
  // }, [isLoading, authStateReady, doc, router]);

  // useEffect(
  //   () => console.log("Iframe ref:", iframeRef.current),
  //   [iframeRef.current]
  // );

  const handleCopyInvite = () => {
    if (!sessionId) return;
    
    navigator.clipboard.writeText(sessionId)
      .then(() => {
        toast.success("Session ID copied to clipboard");
      })
      .catch((error) => {
        console.error("Failed to copy: ", error);
        toast.error("Failed to copy session ID");
      });
  };

  const handleSearchClick = async () => {
    if (!isModeratorUser || !sessionId) return;
    
    const confirmed = await confirm({
      title: "Change Video",
      message: "This will terminate the current video for all participants. Continue?",
      confirmText: "Yes, Change Video",
      cancelText: "Cancel"
    });
    
    if (confirmed) {
      const loading = toast.loading("Redirecting to search...");
      
      try {
        // Update the screen state to search for all users in the session
        await updateScreenState(sessionId, "search");
        
        // Clear the current video for the moderator
        if (user?.uid) {
          await clearUserCurrentVideo(user.uid);
        }
        
        toast.success("Video terminated. Redirecting to search page...");
        router.push(`/session/${sessionId}`);
      } catch (error) {
        console.error("Error terminating video:", error);
        toast.error("Failed to terminate video");
      } finally {
        toast.dismiss(loading);
      }
    }
  };

  const handleLeaveSession = async () => {
    if (!sessionId || !user?.uid) return;
    
    const confirmed = await confirm({
      title: "Leave Session",
      message: "Are you sure you want to leave this session?",
      confirmText: "Yes, Leave",
      cancelText: "Cancel"
    });
    
    if (confirmed) {
      const leaving = toast.loading("Leaving session...");
      
      try {
        await leaveSession(sessionId, user.uid);
        toast.success("Left session");
        router.push("/");
      } catch (error) {
        console.error("Error leaving session", error);
        toast.error("Failed to leave session");
      } finally {
        toast.dismiss(leaving);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-svh w-full bg-sidebar text-sidebar-foreground border-l sticky top-0",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="p-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Command className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{siteConfig.title}</span>
            </div>
          </Link>

          <Button
            size={"icon"}
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>

        {/* Session action buttons */}
        {doc?.activeSession && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size={isInVideo ? "icon": "default"}
              // className="flex-1"
              onClick={handleCopyInvite}
            >
              <Copy className="size-4" />
              {isInVideo ? null : "Invite"}
            </Button>

            {isModeratorUser && isInVideo && (
              <Button
                variant="outline"
                size="icon"
                // className="flex-1"
                onClick={handleSearchClick}
              >
                <Search className="size-4" />
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              // className="flex-1"
              onClick={handleLeaveSession}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex flex-col gap-4 p-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="h-full flex">
            <JaaSMeeting
              appId={process.env.NEXT_PUBLIC_JITSI_APP_ID!}
              roomName={doc?.activeSession?.id || "test"}
              // jwt = { YOUR_VALID_JWT }
              configOverwrite={{
                backgroundColor: theme === "dark" ? "#0b0809" : "#ffffff",
                disableLocalVideoFlip: true,
                backgroundAlpha: 0.5,
                disablePoll: true,
                disableChat: true,
                disableInviteFunctions: true,
                disableReactions: true,
                enableLobbyChat: false,
                toolbarButtons: [
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
                  "videoquality",
                ],
              }}
              interfaceConfigOverwrite={{
                VIDEO_LAYOUT_FIT: "nocrop",
                MOBILE_APP_PROMO: false,
                TILE_VIEW_MAX_COLUMNS: 4,
                DEFAULT_BACKGROUND: "#fff",
              }}
              userInfo={{
                displayName: doc?.displayName!,
                email: doc?.email!,
              }}
              getIFrameRef={(ref) => (iframeRef.current = ref)}
              // spinner = { SpinnerView }
              // onApiReady = { (externalApi) => { ... } }
              onReadyToClose={async () => {
                const leaving = toast.loading("Leaving session...");

                try {
                  await leaveSession(doc?.activeSession?.id!, user?.uid!);

                  toast.success("Left session.");
                } catch (error) {
                  console.error("Error leaving session", error);
                  toast.error("Error leaving session");
                } finally {
                  toast.dismiss(leaving);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2">
        <NavUser />
      </div>
    </div>
  );
}
