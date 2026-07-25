"use client";

import dynamic from "next/dynamic";

const JudgesScene = dynamic(
  () => import("./judges-scene").then((mod) => ({ default: mod.JudgesScene })),
  { ssr: false },
);

export function JudgesSceneLoader() {
  return <JudgesScene />;
}
