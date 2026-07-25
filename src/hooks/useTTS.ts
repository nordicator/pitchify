"use client";

import { useCallback, useRef } from "react";
import { speakText } from "@/lib/api";

let audioUnlocked = false;

/**
 * Call this from a click handler to unlock audio playback in the browser.
 */
export function unlockAudio() {
  if (audioUnlocked) return;
  const silent = new Audio(
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
  );
  silent.play().then(() => {
    audioUnlocked = true;
  }).catch(() => {});
}

type QueueItem = {
  text: string;
  onStart?: () => void;
};

export function useTTS(onPlayStart?: () => void, onPlayEnd?: () => void) {
  const queueRef = useRef<QueueItem[]>([]);
  const playingRef = useRef(false);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;

    playingRef.current = true;
    onPlayStart?.();

    const item = queueRef.current.shift()!;
    item.onStart?.();

    try {
      const res = await speakText(item.text);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          resolve();
        });
      });
    } catch {
      // TTS failure is non-fatal
    }

    playingRef.current = false;
    onPlayEnd?.();

    if (queueRef.current.length > 0) {
      playNext();
    }
  }, [onPlayStart, onPlayEnd]);

  const enqueue = useCallback(
    (text: string, onStart?: () => void) => {
      queueRef.current.push({ text, onStart });
      playNext();
    },
    [playNext]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
  }, []);

  return { enqueue, clear };
}
