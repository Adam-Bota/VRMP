import { useState, useEffect } from "react";
import { Slider } from "@workspace/ui/components/slider";
import { useYouTubePlayer } from "@/providers/youtube-player-provider";

interface VideoSeekingPreviewProps {
  initialTime?: number;
  maxTime?: number;
  label: string;
  onTimeChange: (time: number) => void;
}

export default function VideoSeekingPreview({
  initialTime = 0,
  maxTime = 100,
  label,
  onTimeChange,
}: VideoSeekingPreviewProps) {
  const { formatTime, player } = useYouTubePlayer();
  const [previewTime, setPreviewTime] = useState(initialTime);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update component when external initialTime changes
  useEffect(() => {
    if (!isDragging) {
      setPreviewTime(initialTime);
    }
  }, [initialTime, isDragging]);
  
  // Update preview time while dragging without affecting video
  const handleDragValueChange = (value: number[]) => {
    const newTime = value[0] || 0;
    setPreviewTime(newTime);
  };
  
  // Apply seeking when user releases slider (on drop)
  const handleDragEnd = (value: number[]) => {
    const newTime = value[0] || 0;
    setIsDragging(false);
    
    // Calculate time delta
    const timeDelta = newTime - initialTime;
    
    // Only seek if there's an actual change in position
    if (timeDelta !== 0) {
      onTimeChange(newTime);
      
      // If we have direct access to player, we can also seek immediately
      if (player) {
        player.seekTo(newTime, true);
      }
    }
  };
  
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">{label}</label>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {formatTime(previewTime)}
        </span>
      </div>
      
      {/* Time Slider */}
      <div className="space-y-2">
        <Slider
          value={[previewTime]}
          max={maxTime}
          step={1}
          onValueChange={handleDragValueChange}
          onValueCommit={handleDragEnd}
          onPointerDown={() => setIsDragging(true)}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatTime(0)}</span>
          <span>{formatTime(maxTime)}</span>
        </div>
      </div>
    </div>
  );
}
