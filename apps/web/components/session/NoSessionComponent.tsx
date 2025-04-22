"use client";

import React from "react";
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
import { Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

interface NoSessionComponentProps {
  joinSessionId: string;
  setJoinSessionId: React.Dispatch<React.SetStateAction<string>>;
  handleJoinSession: (e: React.FormEvent) => void;
  handleCreateSession: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export const NoSessionComponent: React.FC<NoSessionComponentProps> = ({
  joinSessionId,
  setJoinSessionId,
  handleJoinSession,
  handleCreateSession,
  loading,
  error,
}) => {
  return (
    <Card>
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
            value={joinSessionId}
            onChange={(e) => setJoinSessionId(e.target.value)}
          />
          <Button type="submit">Join Session</Button>
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
          disabled={loading}
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
};

export default NoSessionComponent;