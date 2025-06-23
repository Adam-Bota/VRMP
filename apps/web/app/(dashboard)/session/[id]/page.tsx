import VideoSlider from "@/components/video-slider";
import VideoIdBar from "@/components/video-id-bar";
import React from "react";
import Client from "./client";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ searchParams, params }: SearchPageProps) {
  const { id } = (await params) || {
    id: "",
  };

  return (
    <>
      <div className="w-full h-screen flex items-center justify-center flex-col gap-6">
        <VideoIdBar />

        <Client id={id} />
      </div>
    </>
  );
}
