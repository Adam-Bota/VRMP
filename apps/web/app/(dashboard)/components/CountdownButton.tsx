import { Button } from "@workspace/ui/components/button";

interface CountdownButtonProps {
  text: string;
  onClick: () => void;
  isActive: boolean;
  countdown: number;
}

export function CountdownButton({ text, onClick, isActive, countdown }: CountdownButtonProps) {
  return (
    <div className="relative">
      <Button
        onClick={onClick}
        className="relative overflow-hidden"
        variant={isActive ? "outline" : "default"}
      >
        {isActive ? (
          <>
            <span>{text} in {countdown}s (cancel)</span>
            <span
              className="absolute bottom-0 left-0 h-1 bg-primary"
              style={{
                width: `${((5 - countdown) / 5) * 100}%`,
                transition: "width 1s linear",
              }}
            />
          </>
        ) : (
          text
        )}
      </Button>
    </div>
  );
}
