import { Video } from "@/types/video";
import Client from "./client";

export default async function VideoPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ v: string }>;
  params: Promise<{
    id: string;
  }>;
}) {
  const { id: sessionId } = await params;
  const { v } = await searchParams;

  // Get video via server side firebase
  let video: Partial<Video> | null;

  return <Client sessionId={sessionId} videoId={v} />;
}
