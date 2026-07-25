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

type Offer = {
  id: number;
  judge: string;
  amount: string;
  equity: string;
};

const sampleOffers: Offer[] = [
  { id: 1, judge: "Mr. Wonderful", amount: "$50K", equity: "25%" },
  { id: 2, judge: "The Visionary", amount: "$250K", equity: "15%" },
  { id: 3, judge: "The Closer", amount: "$200K", equity: "12%" },
];

export default function Dashboard() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [customIdea, setCustomIdea] = useState("");
  const [phase, setPhase] = useState<"setup" | "launching" | "session" | "summary">("setup");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [raised, setRaised] = useState(0);
  const [equityGiven, setEquityGiven] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [timeAlert, setTimeAlert] = useState<string | null>(null);
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

  if (phase === "summary" && difficulty) {
    const goalMet = raised >= difficulties[difficulty].raiseNum;
    const equityLimit = parseFloat(difficulties[difficulty].equity);
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
                {difficulties[difficulty].raise}
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
                {difficulties[difficulty].equity}
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
              setMode(null);
              setDifficulty(null);
              setTimeLeft(180);
            }}
          >
            Try again
          </Button>
        </motion.div>
      </div>
    );
  }

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
            {difficulty && (
              <>
                <span className="text-muted-foreground">
                  Goal <span className="font-semibold text-foreground">{difficulties[difficulty].raise}</span>
                </span>
                <span className="text-muted-foreground">
                  Equity limit <span className="font-semibold text-foreground">{difficulties[difficulty].equity}</span>
                </span>
              </>
            )}
            <span className={`font-semibold tabular-nums ${timeLeft <= 30 ? "text-destructive" : "text-foreground"}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </header>

        {/* Progress bar */}
        {difficulty && (
          <div className="shrink-0 border-b px-6 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                Raised ${raised.toLocaleString()} of {difficulties[difficulty].raise}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.min(Math.round((raised / difficulties[difficulty].raiseNum) * 100), 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((raised / difficulties[difficulty].raiseNum) * 100, 100)}%` }}
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
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            setOffers((prev) => prev.filter((o) => o.id !== offer.id))
                          }
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
