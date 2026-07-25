const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type PitchResponse = {
  content: { product_name: string; elevator_pitch: string; description: string };
  financials: { raise_amount: number; equity_percent: number };
  image_base64: string;
};

export type SessionStartResponse = {
  session_id: string;
  context: Record<string, unknown>;
};

export async function generatePitch(): Promise<PitchResponse> {
  const res = await fetch(`${API_BASE}/generate-pitch`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to generate pitch");
  return res.json();
}

export async function startSession(
  fundraisingGoal: number,
  startupDescription: string
): Promise<SessionStartResponse> {
  const res = await fetch(`${API_BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fundraising_goal: fundraisingGoal,
      startup_description: startupDescription,
    }),
  });
  if (!res.ok) throw new Error("Failed to start session");
  return res.json();
}

export function createSessionWebSocket(sessionId: string): WebSocket {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/ws/${sessionId}`);
}

export async function speakText(
  text: string,
  voiceId = "802e3bc2b27e49c2995d23ef70e6ac89"
): Promise<Response> {
  const res = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId }),
  });
  if (!res.ok) throw new Error("TTS request failed");
  return res;
}
