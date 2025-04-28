// import { useState, useEffect } from "react";
// import { Button } from "@workspace/ui/components/button";
// import { Share2 } from "lucide-react";
// import { useYouTubePlayer } from "@/providers/youtube-player-provider";
// import { subscribeToVideoDocument } from "@/services/videos";
// import { VideoDocument } from "@/types/video";
// import { getAuth } from "firebase/auth";
// import { app } from "@/firebase.client";
// import { toast } from "sonner";
// import SessionCreationForm from "./session/session-creation-form";
// import ActiveSessionsList from "./session/active-sessions-list";

// interface SessionPanelProps {
//   videoId: string;
// }

// export default function SessionPanel({ videoId }: SessionPanelProps) {
//   const { duration } = useYouTubePlayer();
//   const [videoData, setVideoData] = useState<VideoDocument | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   const auth = getAuth(app);
//   const currentUserId = auth.currentUser?.uid || "";

//   // Signout if user is not authenticated
//   useEffect(() => {
//     if (!auth) {
//       toast.error("Please sign in to create a session.");
//     }
//   }, [currentUserId]);

//   // Subscribe to video document in Firestore
//   useEffect(() => {
//     setIsLoading(true);

//     // Use Firestore subscription for video document
//     const unsubscribe = subscribeToVideoDocument(videoId, (data) => {
//       setVideoData(data);
//       setIsLoading(false);
//     });

//     // Cleanup subscription on unmount
//     return () => unsubscribe();
//   }, [videoId]);

//   // Handle share button click
//   const handleShare = () => {
//     // Copy the current URL to clipboard
//     navigator.clipboard.writeText(window.location.href);
//     toast.success("Video URL copied to clipboard!");
//   };

//   return (
//     <div className="w-full lg:w-1/4 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4">
//       <div className="space-y-4">
//         <h2 className="text-xl font-semibold">Watch Together</h2>
//         <p className="text-sm text-zinc-600 dark:text-zinc-400">
//           Create a session to watch this video with friends in sync.
//         </p>

//         {/* Session Creation Form */}
//         <SessionCreationForm 
//           videoId={videoId} 
//           duration={duration || 0} 
//           currentUserId={currentUserId} 
//         />

//         <Button
//           variant="outline"
//           className="w-full flex items-center justify-center gap-2"
//           onClick={handleShare}
//         >
//           <Share2 size={16} />
//           <span>Share Video</span>
//         </Button>

//         <div className="mt-6 border-t pt-4 border-zinc-200 dark:border-zinc-800">
//           <h3 className="font-medium mb-2">Active Sessions</h3>
          
//           {/* Active Sessions List */}
//           <ActiveSessionsList 
//             isLoading={isLoading}
//             videoData={videoData}
//             videoId={videoId}
//             currentUserId={currentUserId}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }
