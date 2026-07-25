"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const judges = [
  {
    name: "James Liang",
    philosophy: "Money tames the beast, money is peace, money is civilization, the end of the story is... money",
    lookFor: "Cares about the financial aspects of your pitch",
    killShot: "How would your profit margins look like if you scaled this?",
  },
  {
    name: "Conrad Mo",
    philosophy: "Without proper execution and supply chain management, ideas are useless",
    lookFor: "Cares about the logistical aspects of your pitch",
    killShot: "Walk me through last Tuesday at your company.",
  },
  {
    name: "Shreyas Rao",
    philosophy: "To create wealth, you must create something people want",
    lookFor: "Cares about the breadth of your pitch",
    killShot: "Why does this need to exist right now?",
  },
  {
    name: "Samuel Tjhia",
    philosophy: "I don't invest in the product, rather I invest in the people",
    lookFor: "Cares about the characteristics of your pitch",
    killShot: "Does this founder truly care?",
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
              • {judge.lookFor}
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
