import SearchBar from "@/components/search-bar";
import VideoGrid from "@/components/video-grid";
import VideoIdBar from "@/components/video-id-bar";
import React from "react";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
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
      <div className="w-full h-screen flex items-center justify-center">
        <VideoIdBar />
      </div>
    </>
  );
}
