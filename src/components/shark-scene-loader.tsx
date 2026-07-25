"use client";

import dynamic from "next/dynamic";

const SharkScene = dynamic(() => import("./shark-scene"), { ssr: false });

export default function SharkSceneLoader() {
  return (
    <div className="relative">
      <SharkScene />
      <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
        hover to interact
      </p>
    </div>
  );
}
