"use client"

import { useAuth } from "@/components/auth-provider";
import VideoSlider from "@/components/video-slider";

export default function Client({ id }: { id: string }) {
  const { doc } = useAuth();

  return doc?.videos?.length ? (
    <VideoSlider sessionId={id} videoId={doc?.videos[0]!} />
  ) : (
    ""
  );
}
