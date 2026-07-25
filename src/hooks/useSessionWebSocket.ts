"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSessionWebSocket } from "@/lib/api";

export type WsStatus = "connecting" | "connected" | "error" | "disconnected";

export type InvestorMessage = { investor: string; text: string };
export type InvestorDecision = {
  investor: string;
  invest: boolean;
  amount?: number;
  equity?: string;
  confidence?: number;
  reason?: string;
};
export type FinalDecisionPayload = { final: true; decisions: InvestorDecision[] };

type Callbacks = {
  onStatus?: (text: string) => void;
  onProcessing?: () => void;
  onInvestorResponse?: (messages: InvestorMessage[]) => void;
  onFinalDecision?: (payload: FinalDecisionPayload) => void;
  onError?: (text: string) => void;
};

export function useSessionWebSocket(
  sessionId: string | null,
  callbacks: Callbacks
) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!sessionId) return;

    setStatus("connecting");
    const ws = createSessionWebSocket(sessionId);
    wsRef.current = ws;

    ws.onopen = () => setStatus("connected");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "status":
          callbacksRef.current.onStatus?.(msg.text);
          break;
        case "processing":
          callbacksRef.current.onProcessing?.();
          break;
        case "investor_response":
          callbacksRef.current.onInvestorResponse?.(msg.data);
          break;
        case "final_decision":
          callbacksRef.current.onFinalDecision?.(msg.data);
          break;
        case "error":
          callbacksRef.current.onError?.(msg.text);
          break;
      }
    };

    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus("disconnected");

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  const sendTranscript = useCallback((text: string) => {
    wsRef.current?.send(JSON.stringify({ type: "transcript", text }));
  }, []);

  const sendEndSession = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "end_session" }));
  }, []);

  return { status, sendTranscript, sendEndSession };
}
