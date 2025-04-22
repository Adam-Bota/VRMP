import SearchBar from "@/components/search-bar";
import VideoGrid from "@/components/video-grid";
import React from "react";


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

  return (
    <>
      <SearchBar />
      <VideoGrid searchParams={{ q }} sessionId={id} />
    </>
  );
}
