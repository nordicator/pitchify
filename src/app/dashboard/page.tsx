"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
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
import { JudgesSceneLoader } from "@/components/judges-scene-loader";

type Mode = "generate" | "custom";
type Difficulty = "easy" | "normal" | "difficult";

const difficulties = {
  easy: { label: "Easy", raise: "$50K", raiseNum: 50000, equity: "20%" },
  normal: { label: "Normal", raise: "$250K", raiseNum: 250000, equity: "10%" },
  difficult: { label: "Difficult", raise: "$1M", raiseNum: 1000000, equity: "5%" },
} as const;

function RollingNumber({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return (
    <span className="tabular-nums">
      ${value.toLocaleString()}
    </span>
  );
}

export default function Dashboard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [phase, setPhase] = useState<"setup" | "launching" | "session">("setup");
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
    if (phase === "session") {
      startCamera();
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [phase, startCamera]);

  const canLaunch =
    difficulty !== null &&
    (mode === "generate" || (mode === "custom" && customIdea.trim().length > 0));

  const placeholderTranscript = [
    { speaker: "You", text: "We're building an AI-powered tool that helps sales teams practice their pitches before real calls." },
    { speaker: "The Skeptic", text: "So it's a role-play simulator. How is this different from having a colleague run through it with you?" },
    { speaker: "You", text: "Three things — it's available 24/7, it gives structured feedback on specific metrics, and it adapts to the buyer persona you're selling to." },
    { speaker: "Mr. Wonderful", text: "What do you charge per seat?" },
    { speaker: "You", text: "$49 per user per month, with team plans starting at $399 for ten seats." },
    { speaker: "The Operator", text: "What's your current ARR and how many paying teams do you have?" },
  ];

  if (phase === "launching" && difficulty) {
    const { raiseNum, equity } = difficulties[difficulty];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Your target raise
          </p>
          <h1 className="text-6xl font-bold tracking-tight md:text-8xl">
            <RollingNumber target={raiseNum} duration={2200} />
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col items-center gap-1"
          >
            <p className="text-lg text-muted-foreground">
              for <span className="font-semibold text-foreground">{equity}</span> equity
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
          >
            <Button
              size="lg"
              onClick={() => setPhase("session")}
            >
              Connect with judges
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (phase === "session") {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <header className="flex shrink-0 items-center border-b px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm font-medium tracking-tight transition-colors hover:text-primary"
          >
            pitchify
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="font-mono text-sm text-muted-foreground">
            session
          </span>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Main scene — judges 3D */}
          <main className="relative flex-1 bg-black">
            <JudgesSceneLoader />

            {/* Mini webcam — top right */}
            <div className="absolute top-4 right-4 z-10 h-[120px] w-[160px] overflow-hidden rounded-lg border border-white/10 bg-black shadow-lg">
              {cameraError ? (
                <div className="flex h-full items-center justify-center">
                  <p className="px-2 text-center text-[10px] text-muted-foreground">
                    {cameraError}
                  </p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              )}
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
                </div>
              )}
            </div>
          </main>

          {/* Transcript — right side */}
          <aside className="flex w-[380px] shrink-0 flex-col border-l">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium">Transcript</p>
              <p className="font-mono text-xs text-muted-foreground">
                {placeholderTranscript.length} messages
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-4">
                {placeholderTranscript.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {msg.speaker}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {msg.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="shrink-0 border-t p-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (videoRef.current?.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach((track) => track.stop());
                  }
                  setPhase("setup");
                  setCameraReady(false);
                  setCameraError(null);
                }}
              >
                <svg
                  className="size-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                End session
              </Button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center border-b px-6 py-4">
        <Link
          href="/"
          className="font-mono text-sm font-medium tracking-tight transition-colors hover:text-primary"
        >
          pitchify
        </Link>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="font-mono text-sm text-muted-foreground">
          new session
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What are you pitching?</CardTitle>
              <CardDescription>
                Choose a product to present to the panel.
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
                    <span className="text-sm font-medium">
                      Generate for me
                    </span>
                    <span className="text-xs text-muted-foreground">
                      A random product challenge on launch
                    </span>
                  </div>
                </Label>
                <Label
                  htmlFor="custom"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="custom" id="custom" />
                  <div className="grid gap-0.5">
                    <span className="text-sm font-medium">
                      Use my own idea
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Describe your product and pitch it live
                    </span>
                  </div>
                </Label>
              </RadioGroup>

              <AnimatePresence>
                {mode === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-2 overflow-hidden"
                  >
                    <Label htmlFor="idea">Your product idea</Label>
                    <Textarea
                      id="idea"
                      value={customIdea}
                      onChange={(e) => setCustomIdea(e.target.value)}
                      placeholder="A SaaS tool that..."
                      rows={3}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {mode !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-3 overflow-hidden"
                  >
                    <Label>Difficulty</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(difficulties) as [Difficulty, typeof difficulties[Difficulty]][]).map(
                        ([key, { label, raise, equity }]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDifficulty(key)}
                            className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                              difficulty === key
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">
                              Raise {raise}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              for {equity}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                disabled={!canLaunch}
                onClick={() => setPhase("launching")}
                className="w-full"
              >
                Launch session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
