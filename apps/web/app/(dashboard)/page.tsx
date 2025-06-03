"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSession,
  getSessionById,
  joinSession,
} from "@/services/sessions";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";

import { LoadingScreen } from "./components/LoadingScreen";
import { NoSessionUI } from "./components/NoSessionUI";
import { Button } from "@workspace/ui/components/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { Clapperboard, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import Link from "next/link";
import { siteConfig } from "@/siteConfig";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase.client";

export default function CreateSessionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSessionId, setJoinSessionId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to create a session");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const sessionId = await createSession({
        createdBy: user.uid,
        moderator: user.uid,
        participants: [user.uid],
      });

      // Redirect to the new session
      router.push(`/session/${sessionId}`);
    } catch (err: any) {
      console.error("Error creating session:", err);
      setError(err.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to join a session");
      toast.error("Please log in to join a session");
      return;
    }

    if (joinSessionId.trim() === "") {
      setError("Please enter a valid session ID");
      toast.error("Session ID cannot be empty");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIsJoining(true);
      const loader = toast.loading("Verifying session...");

      const session = await getSessionById(joinSessionId);
      if (!session) {
        setError("Session not found");
        toast.error("Session not found");
        setIsJoining(false);
        return;
      }

      await joinSession(joinSessionId, user.uid);
      toast.dismiss(loader);
      toast.success("Session joined! Redirecting");

      router.push(`/session/${joinSessionId}`);
    } catch (err: any) {
      console.error("Error joining session:", err);
      setError(err.message || "Failed to join session");
      toast.error(err.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative">
      <img src="./secondary.png" alt="Description" className="absolute inset-0 object-cover w-full h-full" />
      <SidebarProvider>
        <SidebarInset className="flex flex-col w-full bg-transparet">
          <header className="flex h-16 shrink-0 items-center gap-2 justify-between bg-white/80 dark:bg-black/50 backdrop-blur-lg border border-white/20 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="">
              <Link
                href="/"
                className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clapperboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {siteConfig.title}
                  </span>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2 px-4">
              <Button
                size={"icon"}
                variant="ghost"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>

              <Button variant="link" onClick={() => signOut(auth)}>
                Sign Out
              </Button>

              {/* <SidebarTrigger className="-ml-1" /> */}
              {/* <Separator orientation="vertical" className="mr-2 h-4" /> */}
            </div>
          </header>
          <div className="h-full w-full">
            {
              <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
                <NoSessionUI
                  joinSessionId={joinSessionId}
                  setJoinSessionId={setJoinSessionId}
                  error={error}
                  loading={loading}
                  isJoining={isJoining}
                  handleJoinSession={handleJoinSession as any}
                  handleCreateSession={handleCreateSession}
                />
              </div>
            }
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
