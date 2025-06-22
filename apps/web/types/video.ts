/**
 * Enhanced video data interface for Firestore
 */
export interface Video {
  id: string;
  title: string;
  likes: string[];
  dislikes: string[];
  viewers: string[];
}
