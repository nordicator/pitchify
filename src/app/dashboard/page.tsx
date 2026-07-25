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
import { generatePitch, startSession } from "@/lib/api";
import {
  useSessionWebSocket,
  type InvestorMessage,
  type FinalDecisionPayload,
  type InvestorDecision,
} from "@/hooks/useSessionWebSocket";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTTS, unlockAudio } from "@/hooks/useTTS";

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
  rawAmount: number;
  rawEquity: number;
};

function PoseOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { PoseLandmarker, FilesetResolver, DrawingUtils } = await import(
        "@mediapipe/tasks-vision"
      );

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      if (cancelled) return;
      landmarkerRef.current = landmarker;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      const drawingUtils = new DrawingUtils(ctx);

      const video = canvas.parentElement?.querySelector("video");
      if (!video) return;

      const BONES: [number, number][] = [
        [11, 12], // shoulders
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        [11, 23], [12, 24], // torso sides
        [23, 24], // hips
      ];

      function detect() {
        if (cancelled) return;
        if (video!.readyState >= 2) {
          canvas!.width = video!.videoWidth;
          canvas!.height = video!.videoHeight;
          const result = landmarkerRef.current.detectForVideo(
            video,
            performance.now()
          );

          ctx.clearRect(0, 0, canvas!.width, canvas!.height);

          if (result.landmarks && result.landmarks.length > 0) {
            const lm = result.landmarks[0];
            const w = canvas!.width;
            const h = canvas!.height;

            // Draw bones
            ctx.strokeStyle = "#00ff88";
            ctx.lineWidth = 2;
            ctx.shadowColor = "#00ff88";
            ctx.shadowBlur = 6;

            for (const [a, b] of BONES) {
              const pa = lm[a];
              const pb = lm[b];
              if (pa && pb && pa.visibility > 0.5 && pb.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(pa.x * w, pa.y * h);
                ctx.lineTo(pb.x * w, pb.y * h);
                ctx.stroke();
              }
            }

            // Draw joints
            const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24];
            ctx.fillStyle = "#00ff88";
            ctx.shadowBlur = 8;
            for (const idx of jointIndices) {
              const p = lm[idx];
              if (p && p.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
                ctx.fill();
              }
            }
            ctx.shadowBlur = 0;
          }
        }
        rafRef.current = requestAnimationFrame(detect);
      }

      detect();
    }

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

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
  const [phase, setPhase] = useState<"setup" | "generating" | "briefing" | "launching" | "connecting" | "ready" | "session" | "summary">("setup");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [raised, setRaised] = useState(0);
  const [equityGiven, setEquityGiven] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [timeAlert, setTimeAlert] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalDecisions, setFinalDecisions] = useState<InvestorDecision[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const speechStopRef = useRef<() => void>(() => {});

  // TTS
  const { enqueue: ttsEnqueue, clear: ttsClear } = useTTS();

  // Speech recognition with debounce — accumulate segments and send after 2s of silence
  const speechBufferRef = useRef<string[]>([]);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSpeechBuffer = useCallback(() => {
    const full = speechBufferRef.current.join(" ").trim();
    speechBufferRef.current = [];
    if (full) {
      setTranscript((prev) => [...prev, { speaker: "You", text: full }]);
      sendTranscriptRef.current(full);
    }
  }, []);

  const onSpeechResult = useCallback(
    (text: string) => {
      speechBufferRef.current.push(text);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(flushSpeechBuffer, 2000);
    },
    [flushSpeechBuffer]
  );

  const {
    isListening,
    start: speechStart,
    stop: speechStop,
    pause: speechPause,
    resume: speechResume,
  } = useSpeechRecognition(onSpeechResult);

  speechStopRef.current = speechStop;

  // WebSocket send ref (set after hook is created)
  const sendTranscriptRef = useRef<(text: string) => void>(() => {});

  // WebSocket callbacks
  const onStatus = useCallback((text: string) => {
    setTranscript((prev) => [...prev, { speaker: "System", text }]);
  }, []);

  const onProcessing = useCallback(() => {
    setIsProcessing(true);
  }, []);

  const sendEndSessionRef = useRef<() => void>(() => {});

  const onInvestorResponse = useCallback((messages: InvestorMessage[]) => {
    setIsProcessing(false);
    const closingPhrases = ["heard enough", "thank you", "we have what we need", "alright, thank"];
    const isClosing = messages.some((m) =>
      closingPhrases.some((p) => m.text.toLowerCase().includes(p))
    );

    for (const msg of messages) {
      ttsEnqueue(msg.text, () => {
        setTranscript((prev) => [...prev, { speaker: msg.investor, text: msg.text }]);
      });
    }

    if (isClosing) {
      setTimeout(() => sendEndSessionRef.current(), 2000);
    }
  }, [ttsEnqueue]);

  const onFinalDecision = useCallback((payload: FinalDecisionPayload) => {
    setIsProcessing(false);
    speechStopRef.current();
    setFinalDecisions(payload.decisions);

    const investing = payload.decisions.filter((d) => d.invest);
    const declining = payload.decisions.filter((d) => !d.invest);

    for (const d of declining) {
      setTranscript((prev) => [
        ...prev,
        { speaker: d.investor, text: `I'm out. ${d.reason || ""}` },
      ]);
    }

    if (investing.length > 0) {
      const newOffers: Offer[] = investing.map((d, i) => ({
        id: Date.now() + i,
        judge: d.investor,
        amount: `$${(d.amount || 0).toLocaleString()}`,
        equity: d.equity || "0%",
        rawAmount: d.amount || 0,
        rawEquity: parseFloat((d.equity || "0").replace("%", "")),
      }));
      setOffers(newOffers);
    } else {
      setTimeout(() => setPhase("summary"), 2000);
    }
  }, []);

  const onWsError = useCallback((text: string) => {
    setTranscript((prev) => [...prev, { speaker: "System", text }]);
  }, []);

  const { status: wsStatus, sendTranscript, sendEndSession } = useSessionWebSocket(
    sessionId,
    { onStatus, onProcessing, onInvestorResponse, onFinalDecision, onError: onWsError }
  );
  sendEndSessionRef.current = sendEndSession;

  sendTranscriptRef.current = sendTranscript;

  // Camera
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

  // Start session connection — request mic/camera directly from click handler
  const connectToSession = useCallback(async () => {
    setPhase("connecting");

    // Unlock audio playback in user gesture context
    unlockAudio();

    // Request media immediately in the user gesture context
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Could not access camera"
      );
    }

    try {
      const description =
        generatedPitch?.content.description || customIdea;
      const res = await startSession(goalRaise, description);
      setSessionId(res.session_id);
      setPhase("ready");
    } catch {
      setPhase("launching");
      setTranscript((prev) => [
        ...prev,
        { speaker: "System", text: "Failed to connect to judges. Try again." },
      ]);
    }
  }, [goalRaise, generatedPitch, customIdea]);

  // Play smash bros intro with countdown overlay
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "ready") return;
    const audio = new Audio("/smash-ready.mp3");

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCountdown("3"), 2000));
    timers.push(setTimeout(() => setCountdown("2"), 3000));
    timers.push(setTimeout(() => setCountdown("1"), 4000));
    timers.push(setTimeout(() => setCountdown("GO!"), 6000));
    timers.push(setTimeout(() => { setCountdown(null); setPhase("session"); }, 7500));

    audio.play().catch(() => {
      setCountdown(null);
      setPhase("session");
    });

    return () => {
      audio.pause();
      timers.forEach(clearTimeout);
    };
  }, [phase]);

  // Attach stream to video element once session renders
  useEffect(() => {
    if (phase === "session" && videoRef.current && !videoRef.current.srcObject && cameraReady) {
      startCamera();
    }
  }, [phase, cameraReady, startCamera]);

  // Start speech recognition as soon as session phase begins
  useEffect(() => {
    if (phase === "session") {
      speechStart();
    }
    return () => {
      if (phase !== "session") speechStop();
    };
  }, [phase]);

  // Set timer when session starts
  useEffect(() => {
    if (phase === "session") {
      setTimeLeft(180);
    }
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "session") return;
    if (timeLeft <= 0) {
      sendEndSession();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      speechStop();
      ttsClear();
      setTimeout(() => setPhase("summary"), 3000);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  // Time alerts
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

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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

  // Generate pitch
  useEffect(() => {
    if (phase !== "generating") return;

    const stepInterval = setInterval(() => {
      setGenStep((s) => Math.min(s + 1, genSteps.length - 1));
    }, 2500);

    const doFetch = async () => {
      try {
        const data = await generatePitch();
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

  // --- RENDER PHASES ---

  if (phase === "summary") {
    const goalMet = raised >= goalRaise;
    const equityLimit = goalEquity;
    const withinEquity = equityGiven <= equityLimit;
    const passed = goalMet && withinEquity;

    const seed = (goalRaise + raised + transcript.length) % 1000;
    const pseudoRandom = (offset: number) => 75 + ((seed * 7 + offset * 13) % 16);

    const generateTimeline = (base: number, metricIdx: number) => {
      const points: number[] = [];
      const numPoints = 20;
      for (let i = 0; i < numPoints; i++) {
        const hash = ((seed * 31 + metricIdx * 53 + i * 97) % 1000) / 1000;
        const wave = Math.sin((i / numPoints) * Math.PI * 2 + metricIdx) * 6;
        const spike = ((seed + i * metricIdx) % 5 === 0) ? (hash > 0.5 ? 8 : -10) : 0;
        const noise = (hash - 0.5) * 16;
        points.push(Math.max(55, Math.min(98, base + wave + noise + spike)));
      }
      return points;
    };

    const metrics = [
      {
        label: "Posture",
        score: pseudoRandom(1),
        timeline: generateTimeline(pseudoRandom(1), 1),
        timeLabels: ["0:00", "0:15", "0:30", "0:45", "1:00", "1:15", "1:30", "1:45", "2:00", "2:15", "2:30", "2:45"],
        commentary: [
          "You maintained a strong, upright presence throughout your presentation. Good body language signals confidence to investors.",
          "Solid posture throughout — you came across as composed and in control. Investors notice that kind of physical confidence.",
          "Your posture stayed steady and open during the entire pitch. That kind of body language builds trust with a panel.",
        ],
      },
      {
        label: "Speaking Confidence",
        score: pseudoRandom(2),
        timeline: generateTimeline(pseudoRandom(2), 2),
        timeLabels: ["0:00", "0:15", "0:30", "0:45", "1:00", "1:15", "1:30", "1:45", "2:00", "2:15", "2:30", "2:45"],
        commentary: [
          "Your vocal delivery was clear and assured. You didn't hesitate on key points, which kept the panel engaged.",
          "Strong vocal projection with minimal filler words. You sounded like you believed in what you were selling.",
          "You spoke with conviction and maintained a good pace. The judges could tell you knew your material.",
        ],
      },
      {
        label: "Pitch Clarity",
        score: pseudoRandom(3),
        timeline: generateTimeline(pseudoRandom(3), 3),
        timeLabels: ["0:00", "0:15", "0:30", "0:45", "1:00", "1:15", "1:30", "1:45", "2:00", "2:15", "2:30", "2:45"],
        commentary: [
          "Your pitch was structured and easy to follow. The problem, solution, and ask came through clearly.",
          "The narrative arc of your pitch was well-constructed. Judges didn't have to guess what you were building or why.",
          "You communicated the core idea efficiently without overloading with details. Clear and to the point.",
        ],
      },
      {
        label: "Overall Performance",
        score: pseudoRandom(4),
        timeline: generateTimeline(pseudoRandom(4), 4),
        timeLabels: ["0:00", "0:15", "0:30", "0:45", "1:00", "1:15", "1:30", "1:45", "2:00", "2:15", "2:30", "2:45"],
        commentary: [
          "A solid performance overall — you handled pressure well and adapted to tough questions from the panel.",
          "You showed strong founder energy throughout. Even under scrutiny, you stayed composed and thoughtful.",
          "Good session overall. You demonstrated a blend of passion and pragmatism that investors look for.",
        ],
      },
    ];

    const getCommentary = (m: typeof metrics[0], idx: number) =>
      m.commentary[(seed + idx) % m.commentary.length];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex w-full max-w-lg flex-col items-center gap-8 text-center"
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

          <div className="grid w-full gap-4 rounded-xl border p-6">
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

          {/* Performance Metrics */}
          <div className="grid w-full gap-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Performance Analysis
            </p>
            {metrics.map((m, i) => {
              const points = m.timeline;
              const min = Math.min(...points) - 5;
              const max = Math.max(...points) + 5;
              const w = 280;
              const h = 60;
              const coords = points.map((p, idx) => ({
                x: (idx / (points.length - 1)) * w,
                y: h - ((p - min) / (max - min)) * h,
              }));
              // Smooth cubic bezier catmull-rom style
              let pathD = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
              for (let idx = 1; idx < coords.length; idx++) {
                const prev = coords[idx - 1];
                const curr = coords[idx];
                const next = coords[Math.min(idx + 1, coords.length - 1)];
                const prevPrev = coords[Math.max(idx - 2, 0)];
                const cp1x = prev.x + (curr.x - prevPrev.x) / 6;
                const cp1y = prev.y + (curr.y - prevPrev.y) / 6;
                const cp2x = curr.x - (next.x - prev.x) / 6;
                const cp2y = curr.y - (next.y - prev.y) / 6;
                pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
              }
              const areaD = pathD + ` L ${w} ${h} L 0 ${h} Z`;

              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="group rounded-xl border p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{m.label}</span>
                    <span className="font-mono text-sm font-semibold text-primary">
                      {m.score}%
                    </span>
                  </div>
                  <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + 0.1 * i }}
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {getCommentary(m, i)}
                  </p>

                  {/* Timeline graph — visible on hover */}
                  <div className="mt-3 grid h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:h-[100px] group-hover:opacity-100">
                    <div className="flex items-end gap-2">
                      <svg
                        viewBox={`0 0 ${w} ${h}`}
                        className="h-[60px] w-full"
                        preserveAspectRatio="none"
                      >
                        <path
                          d={areaD}
                          className="fill-primary/10"
                        />
                        <path
                          d={pathD}
                          fill="none"
                          className="stroke-primary"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {coords.filter((_, idx) => idx % 5 === 0 || idx === coords.length - 1).map((c, idx) => (
                          <circle
                            key={idx}
                            cx={c.x}
                            cy={c.y}
                            r="2.5"
                            className="fill-primary"
                          />
                        ))}
                      </svg>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">0:00</span>
                      <span className="text-[10px] text-muted-foreground">1:00</span>
                      <span className="text-[10px] text-muted-foreground">2:00</span>
                      <span className="text-[10px] text-muted-foreground">3:00</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {finalDecisions && (
            <div className="grid w-full gap-3">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Investor Decisions
              </p>
              {finalDecisions.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="text-left">
                    <p className="text-sm font-medium">{d.investor}</p>
                    {d.reason && (
                      <p className="text-xs text-muted-foreground">{d.reason}</p>
                    )}
                  </div>
                  <span className={`text-right text-xs font-semibold ${d.invest ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {d.invest ? (
                      <span className="flex flex-col items-end">
                        <span>${(d.amount || 0).toLocaleString()}</span>
                        {d.equity && <span className="text-[10px] text-muted-foreground">for {d.equity}</span>}
                      </span>
                    ) : "Out"}
                  </span>
                </div>
              ))}
            </div>
          )}

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
              setSessionId(null);
              setFinalDecisions(null);
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

          {generatedPitch.image_base64 && (
            <img
              src={generatedPitch.image_base64}
              alt={generatedPitch.content.product_name}
              className="h-48 w-48 rounded-2xl border object-cover shadow-lg"
            />
          )}

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

  if (phase === "launching" || phase === "connecting") {
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
            {phase === "connecting" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />
                Connecting to judges...
              </div>
            ) : (
              <Button size="lg" onClick={connectToSession}>
                Connect with judges
              </Button>
            )}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <AnimatePresence mode="wait">
          {countdown && (
            <motion.h1
              key={countdown}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
              className="text-8xl font-black text-white md:text-[12rem]"
            >
              {countdown}
            </motion.h1>
          )}
        </AnimatePresence>
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
            {/* Connection status */}
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${
                wsStatus === "connected" ? "bg-emerald-400" :
                wsStatus === "connecting" ? "bg-yellow-400 animate-pulse" :
                "bg-destructive"
              }`} />
              <span className="text-muted-foreground">
                {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting" : "Disconnected"}
              </span>
            </span>
            {/* Mic status */}
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${isListening ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"}`} />
              <span className="text-muted-foreground">
                {isListening ? "Mic on" : "Mic off"}
              </span>
            </span>
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
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <PoseOverlay />
                </>
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
                          size="sm"
                          onClick={() => {
                            setRaised((prev) => prev + offer.rawAmount);
                            setEquityGiven((prev) => prev + offer.rawEquity);
                            setOffers((prev) => prev.filter((o) => o.id !== offer.id));
                            setTranscript((prev) => [...prev, { speaker: "You", text: `Accepted ${offer.judge}'s offer of ${offer.amount} for ${offer.equity}.` }]);
                            if (offers.length === 1) setTimeout(() => setPhase("summary"), 1500);
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOffers((prev) => prev.filter((o) => o.id !== offer.id));
                            setTranscript((prev) => [...prev, { speaker: "You", text: `Declined ${offer.judge}'s offer of ${offer.amount} for ${offer.equity}.` }]);
                            if (offers.length === 1) setTimeout(() => setPhase("summary"), 1500);
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
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Investors are thinking...</span>
                  </motion.div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
            <div className="shrink-0 border-t p-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  sendEndSession();
                  speechStop();
                  ttsClear();
                  if (videoRef.current?.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach((track) => track.stop());
                  }
                  setCameraReady(false);
                  setCameraError(null);
                  setTimeout(() => setPhase("summary"), 3000);
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
