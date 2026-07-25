"""
FastAPI server for Pitchify.
HTTP endpoints for session setup + WebSocket for Gemini Live audio bridge.
"""

import os
import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from preGeneration import generate_pitch_context
from live_session import run_live_session

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

app = FastAPI(title="Pitchify API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FISH_API_KEY = os.environ.get("FISH_API_KEY", "")
FISH_BASE = "https://api.fish.audio"

# In-memory context store: session_id → context dict
_sessions: dict[str, dict] = {}


class StartSessionRequest(BaseModel):
    fundraising_goal: int
    startup_description: str


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "802e3bc2b27e49c2995d23ef70e6ac89"


@app.post("/session/start")
async def start_session(req: StartSessionRequest):
    context = generate_pitch_context(req.fundraising_goal, req.startup_description)
    import uuid
    session_id = str(uuid.uuid4())
    _sessions[session_id] = context
    return {"session_id": session_id, "context": context}


@app.get("/voices")
async def list_voices(page_size: int = 20, language: str = "en"):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FISH_BASE}/model",
            params={"page_size": page_size, "language": language, "sort_by": "task_count"},
            headers={"Authorization": f"Bearer {FISH_API_KEY}"},
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/tts")
async def tts(req: TTSRequest):
    async def stream():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{FISH_BASE}/v1/tts",
                headers={
                    "Authorization": f"Bearer {FISH_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "text": req.text,
                    "reference_id": req.voice_id,
                    "format": "mp3",
                    "mp3_bitrate": 128,
                    "latency": "balanced",
                    "temperature": 0.7,
                    "top_p": 0.7,
                },
                timeout=30.0,
            ) as resp:
                if resp.status_code != 200:
                    raise HTTPException(status_code=resp.status_code)
                async for chunk in resp.aiter_bytes(1024):
                    yield chunk

    return StreamingResponse(stream(), media_type="audio/mpeg")


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    context = _sessions.get(session_id)
    if context is None:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    try:
        await run_live_session(session_id, context, websocket)
    except WebSocketDisconnect:
        pass
    finally:
        _sessions.pop(session_id, None)


@app.get("/health")
async def health():
    return {"status": "ok"}
