"use client";

import {
  Clapperboard,
  Copy,
  History,
  Home,
  LogOut,
  Search,
  ThumbsUp,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import { leaveSession } from "@/services/sessions";
import { Button } from "@workspace/ui/components/button";
import { useTheme } from "next-themes";
import { useRef } from "react";
import { useConfirm } from "@/providers/confirm-provider";
import { clearUserCurrentVideo } from "@/services/users";
import { clearVideo, updateScreenState } from "@/services/realtime/sessions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { JaasMeetingWrapper } from "@/components/jaas-meeting-wrapper";
import { NavMain } from "./nav-main";
import { siteConfig } from "@/siteConfig";
import Link from "next/link";

// Define a type for chat messages
type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
};

// Dummy chat data
const dummyChatMessages: ChatMessage[] = [
  {
    id: "1",
    sender: "Mian Adam",
    message: "Hey everyone! How's the movie?",
    timestamp: "10:30 AM",
  },
  {
    id: "3",
    sender: "You",
    message: "Awesome, glad to hear!",
    timestamp: "10:32 AM",
  },
];

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

    navigator.clipboard
      .writeText(sessionId)
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
      message:
        "This will terminate the current video for all participants. Continue?",
      confirmText: "Yes, Change Video",
      cancelText: "Cancel",
    });

    if (confirmed) {
      const loading = toast.loading("Redirecting to search...");

      try {
        if (user?.uid) {
          await clearVideo(sessionId, user?.uid || "");
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
      cancelText: "Cancel",
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
    <Sidebar {...props} side="left" collapsible="icon">
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link
                href="/"
                className="bg-primary text-primary-foreground flex items-center gap-2 w-full p-2 rounded-md hover:bg-primary/90"
              >
                <Clapperboard className="h-5 w-5" />
                <span className="truncate font-semibold">
                  {siteConfig.title}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            {
              icon: <Home className="size-4" />,

              url: "/",
              title: "Home",
            },
            {
              icon: <History className="size-4" />,
              // url: "/history",
              title: "History",
              items: doc?.videos?.map((video) => ({
                title: video,
                url: `/yt/${video}`,
              })),
            },
            // {
            //   icon: <ThumbsUp className="size-4" />,
            //   url: "/likedVideos",
            //   title: "Liked Videos",
            //   items: doc?.videos?.map((video) => ({
            //     title: video,
            //     url: `/yt/${video}`,
            //   })),
            // },
          ]}
        />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        {isLoading ? (
          <Skeleton className="h-6 w-full" />
        ) : (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="sm"
                  className="data-[slot=sidebar-menu-button]:!p-1.5 truncate"
                  onClick={handleCopyInvite}
                >
                  <Copy className="mr-2 size-4" />
                  Copy Invite Link
                </SidebarMenuButton>
              </SidebarMenuItem>

              {isInVideo && doc?.activeSession?.moderator === user?.uid && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    size="sm"
                    className="data-[slot=sidebar-menu-button]:!p-1.5 truncate"
                    onClick={handleSearchClick}
                  >
                    <Search className="mr-2 size-4" />
                    Change Video
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="outline"
                  size="sm"
                  className="w-full justify-start truncate"
                  onClick={handleLeaveSession}
                >
                  <LogOut className="mr-2 size-4" />
                  Leave Session
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

{
  /* Chat Messages Display
        {doc?.activeSession && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Chat</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {dummyChatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-2 rounded-lg text-sm",
                    msg.sender === "You"
                      ? "bg-primary text-primary-foreground self-end ml-auto max-w-[80%]"
                      : "bg-muted max-w-[80%]"
                  )}
                >
                  <div className="font-semibold">{msg.sender}</div>
                  <div>{msg.message}</div>
                  <div className="text-xs text-muted-foreground/80 text-right">
                    {msg.timestamp}
                  </div>
                </div>
              ))}
            </div>
            {/* Simple chat input (non-functional for now) *
            <div className="mt-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full p-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground"
                disabled // For display purposes
              />
            </div>
          </div>
        )} */
}
