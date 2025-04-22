import { useState } from "react";
import { Slider } from "@workspace/ui/components/slider";
import { useYouTubePlayer } from "@/providers/youtube-player-provider";

interface VideoSeekingPreviewProps {
  initialTime?: number;
  maxTime?: number;
  label: string;
  onTimeChange: (time: number) => void;
}

export default function VideoSeekingPreview({
  initialTime: time = 0,
  maxTime = 100,
  label,
  onTimeChange,
}: VideoSeekingPreviewProps) {
  const { formatTime } = useYouTubePlayer();
  
  // Update when the time changes
  const handleTimeChange = (value: number[]) => {
    const newTime = value[0] || 0;
    onTimeChange(newTime);
  };
  
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">{label}</label>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {formatTime(time)}
        </span>
      </div>
      
      {/* Time Slider */}
      <div className="space-y-2">
        <Slider
          value={[time]}
          max={maxTime}
          step={1}
          onValueChange={handleTimeChange}
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
