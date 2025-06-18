import SearchBar from "@/components/search-bar";
import VideoGrid from "@/components/video-grid";
import VideoIdBar from "@/components/video-id-bar";
import { getSessionById, joinSession } from "@/services/sessions";
import { redirect } from "next/navigation";
import React from "react";
import { cookies } from "next/headers";
import { getAuth } from "firebase/auth";
import { auth } from "@/firebase.client";

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

  // // Get session details first
  // const session = await getSessionById(id);
  // if (!session) {
  //   redirect("/dashboard");
  // }

  // // Check if the user is logged in
  // const user = auth.currentUser;
  // if (!user) {
  //   const returnUrl = `/session/${id}`;
  //   redirect(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  // }

  // // Join session if not already a participant
  // if (!session.participants.includes(user.uid)) {
  //   try {
  //     await joinSession(id, user.uid);
      
  //   } catch (error) {
  //     console.error("Error joining session:", error);
  //     redirect("/dashboard");
  //   }
  // }

  // // Check if session has a video and redirect if it does
  // if (session.currentVideo) {
  //   redirect(`/session/${id}/yt?v=${session.currentVideo}`);
  // }

  return (
    <>
      <div className="w-full h-screen flex items-center justify-center">
        <VideoIdBar />
      </div>
    </>
  );
}
