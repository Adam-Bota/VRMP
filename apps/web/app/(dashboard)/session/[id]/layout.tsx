"use client";

import { subscribeToSession } from "@/services/realtime/sessions";
import { SessionRealtime } from "@/types/session";
import { SessionProvider } from "@/components/session/session-context";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { LoadingScreen } from "../../components/LoadingScreen";

type LayoutProps = { children: ReactNode };

export default function SessionIdLayout({ children }: LayoutProps) {
  const params = useParams();
  const [session, setSession] = useState<SessionRealtime | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [redirected, setRedirected] = useState(false);

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
      setRedirected(false); // Reset redirected when session changes
    };
  }, [params.id]);

  useEffect(() => {
    if (
      session?.videoState?.id &&
      !pathname.includes("yt") &&
      !redirected
    ) {
      setRedirected(true);
      router.push(`/session/${params.id}/yt?v=${session.videoState.id}`);
    }
  }, [session?.videoState?.id, pathname, params.id, router, redirected]);

  if (!session) {
    // Optionally, you can handle loading state or show a message
    return <LoadingScreen />;
  }

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
