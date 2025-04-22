import { Loader2 } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <Loader2 className="h-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Checking session status...</p>
    </div>
  );
}
