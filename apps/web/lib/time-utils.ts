/**
 * Formats seconds into MM:SS format
 */
export function secondsToMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats time display intelligently, showing "From start" or "Till end"
 * when appropriate, otherwise shows the time in MM:SS format
 */
export function formatTimeDisplay(seconds: number, duration: number): string {
  if (seconds <= 0) {
    return "From start";
  }
  
  if (duration && Math.abs(seconds - duration) < 1) {
    return "Till end";
  }
  
  return secondsToMinutes(seconds);
}
