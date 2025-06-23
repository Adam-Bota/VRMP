// import { VideoDocument } from "@/types/video";
// import SessionItem from "./session-item";

// interface ActiveSessionsListProps {
//   isLoading: boolean;
//   videoData: VideoDocument | null;
//   videoId: string;
//   currentUserId: string;
// }

// export default function ActiveSessionsList({
//   isLoading,
//   videoData,
//   videoId,
//   currentUserId,
// }: ActiveSessionsListProps) {
//   if (isLoading) {
//     return (
//       <div className="text-center py-2">
//         <span className="text-sm">Loading sessions...</span>
//       </div>
//     );
//   }

//   if (!videoData?.sessions || Object.keys(videoData.sessions).length === 0) {
//     return (
//       <div className="text-sm text-zinc-500 dark:text-zinc-500 text-center">
//         No active sessions for this video
//       </div>
//     );
//   }

//   // Sort sessions: live first, then scheduled, then ended
//   const sortedSessions = Object.entries(videoData.sessions).sort(([, a], [, b]) => {
//     // First sort by status: live > scheduled > ended
//     const statusOrder = { live: 0, scheduled: 1, ended: 2 };
//     const aStatusValue = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
//     const bStatusValue = statusOrder[b.status as keyof typeof statusOrder] ?? 3;

//     if (aStatusValue !== bStatusValue) {
//       return aStatusValue - bStatusValue;
//     }

//     // Then sort by creation time
//     const aTime = a.createdAt?.toMillis?.() || 0;
//     const bTime = b.createdAt?.toMillis?.() || 0;
//     return bTime - aTime;
//   });

//   return (
//     <div className="space-y-2">
//       {sortedSessions.map(([sessionId, session]) => (
//         <SessionItem
//           key={sessionId}
//           sessionId={sessionId}
//           session={session}
//           videoId={videoId}
//           currentUserId={currentUserId}
//         />
//       ))}
//     </div>
//   );
// }
