import { cn } from "@/lib/utils";

export function GridPattern({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-muted-foreground/[0.03] stroke-muted-foreground/[0.06]",
        className,
      )}
      aria-hidden
    >
      <defs>
        <pattern
          id="grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path d="M 40 0 L 0 0 0 40" fill="none" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}
