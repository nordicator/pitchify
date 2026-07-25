"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const judges = [
  {
    name: "Mr. Wonderful",
    philosophy: "Every dollar has a job. If your unit economics don't work at scale, you don't have a business — you have a hobby.",
    lookFor: "Royalty deals, proven revenue, capital efficiency",
    killShot: "What are your customer acquisition costs?",
  },
  {
    name: "The Operator",
    philosophy: "Ideas are worthless. Execution is everything. Show me the team that's shipped before and I'll show you my checkbook.",
    lookFor: "Operational excellence, repeatable processes, team depth",
    killShot: "Walk me through last Tuesday at your company.",
  },
  {
    name: "The Visionary",
    philosophy: "I don't invest in products — I invest in market shifts. If you're not riding a wave that's bigger than you, I'm bored.",
    lookFor: "TAM expansion, timing arguments, category creation",
    killShot: "Why does this need to exist right now?",
  },
  {
    name: "The Skeptic",
    philosophy: "My job is to find the lie you're telling yourself. Every founder has one. The good ones know what theirs is.",
    lookFor: "Intellectual honesty, stress-tested assumptions, risk awareness",
    killShot: "What's the most likely way this fails?",
  },
  {
    name: "The Closer",
    philosophy: "A deal that takes too long to close is a deal that shouldn't close. Speed is a signal of conviction.",
    lookFor: "Clear terms, decisive founders, momentum",
    killShot: "If I offer you 20% less right now, do you take it?",
  },
];

export function JudgeBrowser() {
  const [active, setActive] = useState(0);
  const judge = judges[active];

  return (
    <div className="w-full">
      {/* Judge selector — horizontal names */}
      <div className="flex gap-1 border-b">
        {judges.map((j, i) => (
          <button
            key={j.name}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors",
              i === active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {j.name}
            {i === active && (
              <motion.span
                layoutId="judge-tab"
                className="absolute inset-x-0 -bottom-px h-px bg-foreground"
              />
            )}
          </button>
        ))}
      </div>

      {/* Judge detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="grid gap-8 pt-8 md:grid-cols-[1fr_1px_1fr]"
        >
          <div>
            <blockquote className="text-lg font-medium leading-relaxed tracking-tight">
              &ldquo;{judge.philosophy}&rdquo;
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">
              Looks for: {judge.lookFor}
            </p>
          </div>

          <div className="hidden bg-border md:block" />

          <div className="flex flex-col justify-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Signature question
            </p>
            <p className="mt-2 text-base font-medium">
              {judge.killShot}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
