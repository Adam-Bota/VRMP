import VideoCard from "@/components/video-card";
import { fetchTrendingVideos, searchVideos } from "@/lib/youtube";
import React from "react";

async function VideoGrid({
  searchParams,
  sessionId,
}: {
  searchParams: { q?: string };
  sessionId: string;
}): Promise<React.ReactNode> {
  let videos;

  if (searchParams.q) videos = await searchVideos(searchParams.q);
  else videos = await fetchTrendingVideos(24);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} sessionId={sessionId} />
      ))}
    </div>
  );
}

type SearchPageProps = {
  searchParams: {
    q?: string;
  };
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ searchParams, params }: SearchPageProps) {
  const { q } = (await searchParams) || {
    q: "",
  };
  const { id } = (await params) || {
    id: "",
  };

  return <VideoGrid searchParams={{ q }} sessionId={id} />;
}
