"use client";

import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertCircle, Video } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Session } from "@/types/session";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

interface ActiveSessionComponentProps {
  currentSession: Session | null;
  handleLeaveSession: () => Promise<void>;
  goToCurrentSession: () => void;
}

export const ActiveSessionComponent: React.FC<ActiveSessionComponentProps> = ({
  currentSession,
  handleLeaveSession,
  goToCurrentSession,
}) => {
  const router = useRouter();
  const { doc } = useAuth();
  const currentVideo = doc?.activeSession?.currentVideo || null;

  useEffect(() => {
    if (currentSession?.id) {
      // If we have video information, navigate directly to the video
      if (currentVideo && currentVideo === currentSession.id) {
        router.push(`/session/${currentSession.id}/yt?v=${currentVideo}`);
        toast.info("Taking you to the current video in your session");
      } else {
        // Otherwise go to the session page
        goToCurrentSession();
      }
    }
  }, [currentSession, currentVideo]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Session</CardTitle>
        <CardDescription>
          <p className="text-muted-foreground">Taking you to your session.</p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You are already in a session</AlertTitle>
          <AlertDescription>
            You are currently in an active session. Redirecting you now.
          </AlertDescription>
        </Alert>
        
        {currentVideo && (
          <div className="bg-muted p-4 rounded-lg mb-4 flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Currently watching a video</p>
              <p className="text-sm text-muted-foreground">
                Taking you to the current video in session
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          className="mt-2"
          onClick={handleLeaveSession}
          size="lg"
          variant={"destructive"}
        >
          Leave Session
        </Button>
        <Button className="mt-2" onClick={goToCurrentSession} size="lg">
          {currentVideo ? "Go to Current Video" : "Go to Current Session"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ActiveSessionComponent;
