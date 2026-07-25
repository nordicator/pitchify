"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function AnimatedBorder({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-px",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--primary)_360deg)]" />
      <div className="relative rounded-[11px] bg-card">
        {children}
      </div>
    </div>
  );
}
