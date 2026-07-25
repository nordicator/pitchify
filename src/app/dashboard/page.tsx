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

type GeneratedPitch = {
  content: { product_name: string; elevator_pitch: string; description: string };
  financials: { raise_amount: number; equity_percent: number };
  image_base64: string;
};

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

type Offer = {
  id: number;
  judge: string;
  amount: string;
  equity: string;
};

const sampleOffers: Offer[] = [
  { id: 1, judge: "Mr. Wonderful", amount: "$50K", equity: "25%" },
  { id: 2, judge: "The Visionary", amount: "$250K", equity: "15%" },
];

export default function Dashboard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [customRaise, setCustomRaise] = useState("");
  const [customEquity, setCustomEquity] = useState("");
  const [goalRaise, setGoalRaise] = useState(0);
  const [goalEquity, setGoalEquity] = useState(0);
  const [generatedPitch, setGeneratedPitch] = useState<GeneratedPitch | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [phase, setPhase] = useState<"setup" | "generating" | "briefing" | "launching" | "session" | "summary">("setup");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [raised, setRaised] = useState(0);
  const [equityGiven, setEquityGiven] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [timeAlert, setTimeAlert] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
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
      setTimeLeft(180);
    }
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [phase, startCamera]);

  useEffect(() => {
    if (phase !== "session") return;
    if (timeLeft <= 0) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setPhase("summary");
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== "session") return;
    if (timeLeft === 120) setTimeAlert("2 minutes remaining");
    else if (timeLeft === 60) setTimeAlert("1 minute remaining");
    else if (timeLeft === 30) setTimeAlert("30 seconds — wrap it up!");
    else if (timeLeft === 10) setTimeAlert("10 seconds!");
  }, [timeLeft, phase]);

  useEffect(() => {
    if (!timeAlert) return;
    const timeout = setTimeout(() => setTimeAlert(null), 3000);
    return () => clearTimeout(timeout);
  }, [timeAlert]);

  const canLaunch =
    mode === "generate" ||
    (mode === "custom" && customIdea.trim().length > 0 && parseFloat(customRaise) > 0 && parseFloat(customEquity) > 0);

  const genSteps = [
    "Brainstorming a product concept...",
    "Crafting the elevator pitch...",
    "Setting financial targets...",
    "Rendering product shot...",
    "Packaging your challenge...",
  ];

  useEffect(() => {
    if (phase !== "generating") return;

    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, genSteps.length - 1));
    }, 2500);

    const doFetch = async () => {
      try {
        const res = await fetch("http://localhost:8000/generate-pitch", { method: "POST" });
        if (!res.ok) throw new Error("Generation failed");
        const data: GeneratedPitch = await res.json();
        setGeneratedPitch(data);
        setGoalRaise(data.financials.raise_amount);
        setGoalEquity(data.financials.equity_percent);
        setGenStep(genSteps.length - 1);
        setTimeout(() => setPhase("briefing"), 800);
      } catch {
        setPhase("setup");
        setGenerating(false);
      }
    };
    doFetch();

    return () => clearInterval(stepInterval);
  }, [phase]);

  if (phase === "summary") {
    const goalMet = raised >= goalRaise;
    const equityLimit = goalEquity;
    const withinEquity = equityGiven <= equityLimit;
    const passed = goalMet && withinEquity;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <div className={`rounded-full px-6 py-2 text-sm font-semibold ${
            passed
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-destructive/10 text-destructive"
          }`}>
            {passed ? "Deal Closed" : "No Deal"}
          </div>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {passed ? "You survived the tank." : "The sharks ate you alive."}
          </h1>

          <div className="grid w-full max-w-sm gap-4 rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Raised</span>
              <span className="font-mono text-sm font-semibold">
                ${raised.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Goal</span>
              <span className="font-mono text-sm font-semibold">
                ${goalRaise.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Equity given</span>
              <span className={`font-mono text-sm font-semibold ${
                !withinEquity ? "text-destructive" : ""
              }`}>
                {equityGiven}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Equity limit</span>
              <span className="font-mono text-sm font-semibold">
                {goalEquity}%
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Result</span>
              <span className={`font-mono text-sm font-semibold ${
                passed ? "text-emerald-400" : "text-destructive"
              }`}>
                {goalMet && !withinEquity
                  ? "Over equity limit"
                  : !goalMet
                    ? "Didn't hit goal"
                    : "Passed"}
              </span>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => {
              setPhase("setup");
              setRaised(0);
              setEquityGiven(0);
              setOffers([]);
              setTranscript([]);
              setMode(null);
              setGoalRaise(0);
              setGoalEquity(0);
              setGeneratedPitch(null);
              setGenerating(false);
              setCustomIdea("");
              setCustomRaise("");
              setCustomEquity("");
              setTimeLeft(180);
            }}
          >
            Try again
          </Button>
        </motion.div>
      </div>
    );
  }

  if (phase === "generating") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative size-16">
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-1 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-3 rounded-full border-2 border-t-transparent border-r-primary border-b-transparent border-l-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="flex flex-col items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={genStep}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm font-medium"
              >
                {genSteps[genStep]}
              </motion.p>
            </AnimatePresence>

            <div className="flex gap-1.5">
              {genSteps.map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1.5 rounded-full ${i <= genStep ? "bg-primary" : "bg-muted"}`}
                  initial={{ width: 8 }}
                  animate={{ width: i === genStep ? 24 : 8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This usually takes 10–20 seconds
          </p>
        </motion.div>
      </div>
    );
  }

  if (phase === "briefing" && generatedPitch) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex w-full max-w-xl flex-col items-center gap-6 text-center"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Your challenge
          </p>

          <img
            src={generatedPitch.image_base64}
            alt={generatedPitch.content.product_name}
            className="h-48 w-48 rounded-2xl border object-cover shadow-lg"
          />

          <div className="grid gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {generatedPitch.content.product_name}
            </h1>
            <p className="text-base text-muted-foreground">
              {generatedPitch.content.elevator_pitch}
            </p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {generatedPitch.content.description}
          </p>

          <div className="grid w-full max-w-xs gap-3 rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Target raise</span>
              <span className="font-mono text-sm font-semibold">${goalRaise.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max equity</span>
              <span className="font-mono text-sm font-semibold">{goalEquity}%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              onClick={() => setPhase("launching")}
            >
              Accept challenge
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setGeneratedPitch(null);
                setGenerating(false);
                setPhase("setup");
              }}
            >
              Reroll
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "launching") {
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
            <RollingNumber target={goalRaise} duration={2200} />
          </h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex flex-col items-center gap-1"
          >
            <p className="text-lg text-muted-foreground">
              for <span className="font-semibold text-foreground">{goalEquity}%</span> equity
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
        <header className="flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div className="flex items-center">
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
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            {goalRaise > 0 && (
              <>
                <span className="text-muted-foreground">
                  Goal <span className="font-semibold text-foreground">${goalRaise.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">
                  Equity limit <span className="font-semibold text-foreground">{goalEquity}%</span>
                </span>
              </>
            )}
            <span className={`font-semibold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </header>

        {/* Progress bar */}
        {goalRaise > 0 && (
          <div className="shrink-0 border-b px-6 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                Raised ${raised.toLocaleString()} of ${goalRaise.toLocaleString()}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.min(Math.round((raised / goalRaise) * 100), 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((raised / goalRaise) * 100, 100)}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Main scene — judges 3D */}
          <main className="relative flex-1 bg-black">
            <JudgesSceneLoader />

            {/* Time alert */}
            <AnimatePresence>
              {timeAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-4 py-2 backdrop-blur-sm"
                >
                  <p className={`font-mono text-sm font-semibold ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
                    {timeAlert}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Offer cards — bottom center */}
            <AnimatePresence>
              {offers.length > 0 && (
                <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-3">
                  {offers.map((offer, i) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 40, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-card/90 p-4 shadow-2xl backdrop-blur-md"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {offer.judge}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold">{offer.amount}</span>
                        <span className="text-xs text-muted-foreground">
                          for {offer.equity}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          onClick={() => {
                            const num = parseFloat(offer.amount.replace(/[$,K,M]/g, "")) *
                              (offer.amount.includes("M") ? 1000000 : offer.amount.includes("K") ? 1000 : 1);
                            const eq = parseFloat(offer.equity.replace("%", ""));
                            setRaised((prev) => prev + num);
                            setEquityGiven((prev) => prev + eq);
                            setOffers((prev) => prev.filter((o) => o.id !== offer.id));
                            setTranscript((prev) => [...prev, { speaker: "You", text: `Accepted ${offer.judge}'s offer of ${offer.amount} for ${offer.equity}.` }]);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setOffers((prev) => prev.filter((o) => o.id !== offer.id));
                            setTranscript((prev) => [...prev, { speaker: "You", text: `Declined ${offer.judge}'s offer of ${offer.amount} for ${offer.equity}.` }]);
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Test button */}
            <div className="absolute bottom-4 left-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = sampleOffers[offers.length % sampleOffers.length];
                  setOffers((prev) => [...prev, { ...next, id: Date.now() }]);
                  setTranscript((prev) => [...prev, { speaker: next.judge, text: `Made a ${next.amount} offer for ${next.equity} equity.` }]);
                }}
              >
                Test offer
              </Button>
            </div>
          </main>

          {/* Transcript — right side */}
          <aside className="flex w-[380px] shrink-0 flex-col border-l">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-medium">Transcript</p>
              <p className="font-mono text-xs text-muted-foreground">
                {transcript.length} messages
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-4">
                {transcript.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
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
                  setPhase("summary");
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
                    className="grid gap-4 overflow-hidden"
                  >
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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="raise">Target raise</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <input
                            id="raise"
                            type="text"
                            inputMode="numeric"
                            value={customRaise ? Number(customRaise).toLocaleString() : ""}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, "");
                              if (Number(raw) > 1000000) return;
                              setCustomRaise(raw);
                            }}
                            placeholder="250,000"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="equity">Max equity</Label>
                        <div className="relative">
                          <input
                            id="equity"
                            type="text"
                            inputMode="numeric"
                            value={customEquity}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              if (parseFloat(raw) > 100) return;
                              setCustomEquity(raw);
                            }}
                            placeholder="10"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-7 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                disabled={!canLaunch || generating}
                onClick={() => {
                  if (mode === "generate") {
                    setGenStep(0);
                    setPhase("generating");
                  } else {
                    setGoalRaise(parseFloat(customRaise));
                    setGoalEquity(parseFloat(customEquity));
                    setPhase("launching");
                  }
                }}
                className="w-full"
              >
                {generating ? "Generating..." : mode === "generate" ? "Generate challenge" : "Launch session"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
