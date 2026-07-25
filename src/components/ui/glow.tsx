import { cn } from "@/lib/utils";

export function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute -z-10 size-[500px] rounded-full bg-primary/20 blur-[120px]",
        className,
      )}
    />
  );
}
