"use client";

import { useCallback, useRef } from "react";
import { speakText } from "@/lib/api";

export function useTTS(onPlayStart?: () => void, onPlayEnd?: () => void) {
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;

    playingRef.current = true;
    onPlayStart?.();

    const text = queueRef.current.shift()!;
    try {
      const res = await speakText(text);
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
    (text: string) => {
      queueRef.current.push(text);
      playNext();
    },
    [playNext]
  );

  const clear = useCallback(() => {
    queueRef.current = [];
  }, []);

  return { enqueue, clear };
}
