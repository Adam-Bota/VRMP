"use client";

import { subscribeToSession } from "@/services/realtime/sessions";
import { SessionRealtime } from "@/types/session";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LoadingScreen } from "../../components/LoadingScreen";

type LayoutProps = { children: ReactNode };

export default function SessionIdLayout({ children }: LayoutProps) {
  const params = useParams();
  const [session, setSession] = useState<SessionRealtime | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!params.id) return;
    const unsubscribe = subscribeToSession(
      params.id as string,
      (sessionData) => {
        setSession(sessionData);
      }
    );
    return () => {
      unsubscribe();
      setSession(null);
    };
  }, [params.id]);

  if (session?.videoState?.id && !pathname.includes("yt")) {
    // Redirect to the video page if a video is set
    router.push(`/session/${params.id}/yt?v=${session.videoState.id}`);
    return null; // Prevent rendering children while redirecting
  }

  if (!session) {
    // Optionally, you can handle loading state or show a message
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
