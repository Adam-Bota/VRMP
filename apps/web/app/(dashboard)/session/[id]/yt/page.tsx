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

  return <Client sessionId={sessionId} videoId={v} />;
}
