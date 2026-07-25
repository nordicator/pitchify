"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function ShimmerButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-4xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-0 overflow-hidden rounded-4xl">
        <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </span>
      <span className="relative">{children}</span>
    </button>
  );
}
