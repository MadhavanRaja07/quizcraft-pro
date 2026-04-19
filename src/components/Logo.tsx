import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-glow">
        <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight gradient-text">QuizVerse</span>
      )}
    </div>
  );
}
