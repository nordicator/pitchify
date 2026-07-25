"use client";

import { useCallback, useRef, useState } from "react";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useSpeechRecognition(onFinalTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);

  const start = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) onFinalTranscript(text);
        }
      }
    };

    recognition.onend = () => {
      if (activeRef.current) {
        recognition.start();
      } else {
        setIsListening(false);
      }
    };

    recognition.onerror = (e: { error: string }) => {
      if (e.error === "aborted" || e.error === "no-speech") return;
      setIsListening(false);
      activeRef.current = false;
    };

    recognitionRef.current = recognition;
    activeRef.current = true;
    recognition.start();
    setIsListening(true);
  }, [onFinalTranscript]);

  const stop = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const pause = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resume = useCallback(() => {
    if (recognitionRef.current) {
      activeRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      start();
    }
  }, [start]);

  return { isListening, start, stop, pause, resume };
}
