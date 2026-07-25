"use client";

import { useRef, useState, useEffect, useCallback } from "react";

type Mode = "generate" | "custom";

export default function Dashboard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Could not access camera",
      );
    }
  }, []);

  useEffect(() => {
    if (sessionStarted) {
      startCamera();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionStarted, startCamera]);

  const canLaunch =
    mode === "generate" || (mode === "custom" && customIdea.trim().length > 0);

  if (sessionStarted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-medium tracking-tight text-foreground">
              pitchify
            </span>
            <span className="text-border">/</span>
            <span className="font-mono text-xs text-muted">session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="font-mono text-xs text-muted">live</span>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12">
          <div className="flex flex-col items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              {mode === "generate" ? "Generated product" : "Your product"}
            </p>
            {mode === "custom" && (
              <p className="max-w-md text-center text-sm text-foreground/70">
                {customIdea}
              </p>
            )}
          </div>

          <div className="relative w-full max-w-2xl overflow-hidden rounded-md border border-border bg-black">
            {cameraError ? (
              <div className="flex h-[400px] flex-col items-center justify-center gap-2 p-6 text-center">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <p className="font-mono text-xs text-red-400">{cameraError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-[400px] w-full object-cover"
              />
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                <p className="font-mono text-xs text-muted">
                  Requesting camera access...
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
              }
              setSessionStarted(false);
              setCameraReady(false);
              setCameraError(null);
            }}
            className="font-mono text-xs text-muted transition-colors hover:text-foreground"
          >
            End session
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center border-b border-border px-6 py-4">
        <span className="font-mono text-xs font-medium tracking-tight text-foreground">
          pitchify
        </span>
        <span className="mx-3 text-border">/</span>
        <span className="font-mono text-xs text-muted">new session</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-md">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Configure
          </p>
          <h1 className="mt-3 text-xl font-medium tracking-tight text-foreground">
            What are you pitching?
          </h1>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode("generate")}
              className={`group relative rounded-md border px-4 py-3.5 text-left transition-all ${
                mode === "generate"
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border hover:border-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Generate for me
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Random product idea, generated on launch
                  </p>
                </div>
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    mode === "generate"
                      ? "border-foreground"
                      : "border-muted"
                  }`}
                >
                  {mode === "generate" && (
                    <div className="h-2 w-2 rounded-full bg-foreground" />
                  )}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode("custom")}
              className={`group relative rounded-md border px-4 py-3.5 text-left transition-all ${
                mode === "custom"
                  ? "border-foreground bg-foreground/[0.03]"
                  : "border-border hover:border-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Use my own idea
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Describe your product, pitch it live
                  </p>
                </div>
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    mode === "custom"
                      ? "border-foreground"
                      : "border-muted"
                  }`}
                >
                  {mode === "custom" && (
                    <div className="h-2 w-2 rounded-full bg-foreground" />
                  )}
                </div>
              </div>
            </button>
          </div>

          {mode === "custom" && (
            <textarea
              value={customIdea}
              onChange={(e) => setCustomIdea(e.target.value)}
              placeholder="A SaaS tool that..."
              className="mt-4 w-full resize-none rounded-md border border-border bg-transparent px-3.5 py-3 font-mono text-sm text-foreground placeholder:text-muted/50 focus:border-foreground focus:outline-none"
              rows={3}
            />
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              disabled={!canLaunch}
              onClick={() => setSessionStarted(true)}
              className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Launch session
            </button>
            <a
              href="/"
              className="text-center font-mono text-xs text-muted transition-colors hover:text-foreground"
            >
              Back to home
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
