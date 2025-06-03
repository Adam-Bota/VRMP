import { Loader2 } from "lucide-react";
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
import { Input } from "@workspace/ui/components/input";
import { CountdownButton } from "./CountdownButton";

interface NoSessionUIProps {
  joinSessionId: string;
  setJoinSessionId: (id: string) => void;
  error: string | null;
  loading: boolean;
  isJoining: boolean;
  handleJoinSession: (e: React.FormEvent) => Promise<void>;
  handleCreateSession: (e: React.FormEvent) => Promise<void>;
}

export function NoSessionUI({
  joinSessionId,
  setJoinSessionId,
  error,
  loading,
  isJoining,
  handleJoinSession,
  handleCreateSession,
}: NoSessionUIProps) {
  return (
    <Card className="bg-white/80 dark:bg-black/50 backdrop-blur-lg">
      <CardHeader>
        <CardTitle>Create or Join a Session</CardTitle>
        <CardDescription>
          <p className="text-muted-foreground">
            Create a new session or join an existing one using the session ID.
          </p>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoinSession} className="flex gap-2 mb-4">
          <Input
            placeholder="Enter session ID"
            className="border"
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
            disabled={isJoining}
          />
          {!isJoining ? (
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Join Session"
              )}
            </Button>
          ) : (
            // <CountdownButton
            //   text="Joining"
            //   onClick={goToSession}
            //   isActive={true}
            //   countdown={countdown}
            // />
            <Button variant="outline" type="submit" disabled={loading}>
              Join Session
            </Button>
          )}
        </form>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          onClick={handleCreateSession}
          disabled={loading || isJoining}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Session"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
