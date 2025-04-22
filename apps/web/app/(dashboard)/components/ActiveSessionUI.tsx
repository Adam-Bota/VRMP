import { AlertCircle, Loader2, Video } from "lucide-react";
import { Session } from "@/types/session";
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
import { Button } from "@workspace/ui/components/button";
import { CountdownButton } from "./CountdownButton";
import { useEffect } from "react";

interface ActiveSessionUIProps {
  currentSession: Session;
  currentVideo: string | undefined;
  loading: boolean;
  isJoining: boolean;
  countdown: number;
  navigationType: "video" | "session" | null;
  handleLeaveSession: () => Promise<void>;
  goToCurrentSession: () => void;
  cancelRedirect: () => void;
  navigationCanceled: boolean;
  directGoToSession: () => void;
}

export function ActiveSessionUI({
  currentSession,
  currentVideo,
  loading,
  isJoining,
  countdown,
  navigationType,
  handleLeaveSession,
  goToCurrentSession,
  cancelRedirect,
  navigationCanceled,
  directGoToSession,
}: ActiveSessionUIProps) {
  useEffect(() => {
      console.log("Navigating to current video");
      const timer = setTimeout(() => {
        goToCurrentSession();
      }, countdown * 1000);
      return () => clearTimeout(timer);
    
  }, [countdown, goToCurrentSession]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Session</CardTitle>
        <CardDescription>
          <p className="text-muted-foreground">
            {!navigationCanceled
              ? "You are currently in a session. You can leave it or stop the automatic redirect."
              : "You are currently in a session. You can leave it or go to your session."}
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You are already in a session</AlertTitle>
          <AlertDescription>
            You are currently in an active session. You need to leave your
            current session before creating a new one.
          </AlertDescription>
        </Alert>

        {currentVideo && (
          <div className="bg-muted p-4 rounded-lg mb-4 flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div>
              <p className="font-medium">Currently watching a video</p>
              <p className="text-sm text-muted-foreground">
                {!navigationCanceled
                  ? "You'll be automatically redirected to the current video"
                  : "Return to the current video to continue watching with others"}
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
          disabled={loading || isJoining}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Leave Session"
          )}
        </Button>

        {isJoining ? (
          <CountdownButton
            text={
              navigationType === "video" ? "Going to Video" : "Going to Session"
            }
            onClick={cancelRedirect}
            isActive={true}
            countdown={countdown}
          />
        ) : navigationCanceled ? (
          <Button onClick={directGoToSession} size="lg">
            {currentVideo ? "Go to Current Video" : "Go to Session"}
          </Button>
        ) : (
          <CountdownButton
            text={
              navigationType === "video" ? "Going to Video" : "Going to Session"
            }
            onClick={cancelRedirect}
            isActive={true}
            countdown={countdown}
          />
        )}
      </CardFooter>
    </Card>
  );
}
