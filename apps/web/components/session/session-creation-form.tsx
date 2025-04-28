// import { useState, useEffect } from "react";
// import { Button } from "@workspace/ui/components/button";
// import { Plus } from "lucide-react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@workspace/ui/components/form";
// import { Input } from "@workspace/ui/components/input";
// import VideoSeekingPreview from "../video-seeking-preview";
// import { useYouTubePlayer } from "@/providers/youtube-player-provider";
// import { useConfirm } from "@/providers/confirm-provider";
// import { createSession } from "@/services/sessions";
// import { addSessionToVideo } from "@/services/videos";
// import { toast } from "sonner";
// import { formatTimeDisplay } from "@/lib/time-utils";

// // Form validation schema
// const formSchema = z.object({
//   title: z
//     .string()
//     .min(3, { message: "Title must be at least 3 characters" })
//     .max(50, { message: "Title must be less than 50 characters" }),
//   startTime: z.number().min(0),
//   endTime: z.number().min(0),
// });

// interface SessionCreationFormProps {
//   videoId: string;
//   duration: number;
//   currentUserId: string;
// }

// export default function SessionCreationForm({ 
//   videoId, 
//   duration, 
//   currentUserId 
// }: SessionCreationFormProps) {
//   const { seekTo } = useYouTubePlayer();
//   const confirm = useConfirm();

//   // Initialize form with react-hook-form
//   const form = useForm<z.infer<typeof formSchema>>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       title: "",
//       startTime: 0,
//       endTime: duration || 100,
//     },
//   });

//   // Update form values when duration changes
//   useEffect(() => {
//     if (duration) {
//       form.setValue("endTime", duration);
//     }
//   }, [duration, form]);

//   // Seeking handlers
//   const handleStartTimeChange = (time: number) => {
//     form.setValue("startTime", time);
//     seekTo(time);

//     // If end time is less than start time, update it
//     const currentEndTime = form.getValues("endTime");
//     if (currentEndTime < time) {
//       form.setValue("endTime", time);
//     }
//   };

//   const handleEndTimeChange = (time: number) => {
//     form.setValue("endTime", time);
//     seekTo(time);
//   };

//   // Handle session creation form submission
//   const handleCreateSession = async (data: z.infer<typeof formSchema>) => {
//     if (!currentUserId) {
//       toast.error("You must be signed in to create a session");
//       return;
//     }

//     const confirmed = await confirm({
//       title: "Create Watch Session",
//       message: `Create a session titled "${data.title}" from ${formatTimeDisplay(data.startTime, duration)} to ${formatTimeDisplay(data.endTime, duration)}?`,
//       confirmText: "Create Session",
//     });

//     if (confirmed) {
//       const loadingToast = toast.loading("Creating session...");
//       try {
//         // Call Firebase service to create the session
//         const sessionId = await createSession({
//           // title: data.title,
//           // videoId,
//           // startTime: data.startTime,
//           // endTime: data.endTime,
//           createdBy: currentUserId,
//         });

//         // Add the session to the video document in Firestore
//         await addSessionToVideo(videoId, sessionId, {
//           title: data.title,
//           startTime: data.startTime,
//           endTime: data.endTime,
//           createdBy: currentUserId,
//         });

//         toast.success(`Session "${data.title}" created successfully!`);
        
//         // Reset the form
//         form.reset({
//           title: "",
//           startTime: 0,
//           endTime: duration || 100,
//         });
//       } catch (error) {
//         console.error("Error creating session:", error);
//         toast.error("Failed to create session. Please try again.");
//       } finally {
//         toast.dismiss(loadingToast);
//       }
//     }
//   };

//   const startTimeDisplay = formatTimeDisplay(form.getValues("startTime"), duration);
//   const endTimeDisplay = formatTimeDisplay(form.getValues("endTime"), duration);

//   return (
//     <div className="space-y-3">
//       {/* Seeking Controls */}
//       <VideoSeekingPreview
//         initialTime={form.getValues("startTime")}
//         maxTime={duration || 100}
//         label="Start Time"
//         onTimeChange={handleStartTimeChange}
//       />

//       <VideoSeekingPreview
//         initialTime={form.getValues("endTime")}
//         maxTime={duration || 100}
//         label="End Time"
//         onTimeChange={handleEndTimeChange}
//       />

//       {/* Session Creation Form */}
//       <Form {...form}>
//         <form
//           onSubmit={form.handleSubmit(handleCreateSession)}
//           className="space-y-4"
//         >
//           <FormField
//             control={form.control}
//             name="title"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Session Title</FormLabel>
//                 <FormControl>
//                   <Input
//                     placeholder="Movie Night with Friends"
//                     {...field}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Information about start/end times */}
//           <div className="text-sm text-zinc-500 dark:text-zinc-400">
//             <p>Start: {startTimeDisplay}</p>
//             <p>End: {endTimeDisplay}</p>
//           </div>

//           {/* Submit Action */}
//           <Button
//             type="submit"
//             className="w-full flex items-center justify-center gap-2"
//           >
//             <Plus size={16} />
//             <span>Create Watch Session</span>
//           </Button>
//         </form>
//       </Form>
//     </div>
//   );
// }
