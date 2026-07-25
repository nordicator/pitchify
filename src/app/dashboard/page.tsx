"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

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
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium tracking-tight">
              pitchify
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-sm text-muted-foreground">
              session
            </span>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </Badge>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {mode === "generate"
                ? "Pitching a generated product idea"
                : customIdea}
            </p>
          </div>

          <Card className="w-full max-w-4xl overflow-hidden p-0">
            <div className="relative">
              {cameraError ? (
                <div className="flex h-[560px] flex-col items-center justify-center gap-3 bg-muted/30">
                  <div className="rounded-full bg-destructive/10 p-3">
                    <svg
                      className="size-5 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-[560px] w-full bg-black object-cover"
                />
              )}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20">
                  <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Requesting camera access...
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Button
            variant="outline"
            onClick={() => {
              if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach((track) => track.stop());
              }
              setSessionStarted(false);
              setCameraReady(false);
              setCameraError(null);
            }}
          >
            End session
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center border-b px-6 py-4">
        <span className="font-mono text-sm font-medium tracking-tight">
          pitchify
        </span>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="font-mono text-sm text-muted-foreground">
          new session
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>What are you pitching?</CardTitle>
            <CardDescription>
              Choose a product to present to the sharks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <RadioGroup
              value={mode ?? ""}
              onValueChange={(val) => setMode(val as Mode)}
            >
              <Label
                htmlFor="generate"
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value="generate" id="generate" />
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">Generate for me</span>
                  <span className="text-xs text-muted-foreground">
                    A random product idea will be created on launch
                  </span>
                </div>
              </Label>
              <Label
                htmlFor="custom"
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value="custom" id="custom" />
                <div className="grid gap-0.5">
                  <span className="text-sm font-medium">Use my own idea</span>
                  <span className="text-xs text-muted-foreground">
                    Describe your product and pitch it live
                  </span>
                </div>
              </Label>
            </RadioGroup>

            {mode === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="idea">Your product idea</Label>
                <Textarea
                  id="idea"
                  value={customIdea}
                  onChange={(e) => setCustomIdea(e.target.value)}
                  placeholder="A SaaS tool that..."
                  rows={3}
                />
              </div>
            )}

            <Button disabled={!canLaunch} onClick={() => setSessionStarted(true)}>
              Launch session
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
