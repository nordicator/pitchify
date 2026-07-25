"""
FastAPI server for Pitchify.
HTTP endpoints for session setup + WebSocket for Gemini Live audio bridge.
"""

import base64
import os
import traceback
import uuid

import httpx
from google import genai
from google.genai import types
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from preGeneration import generate_pitch, generate_pitch_context
from live_session import run_live_session

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

app = FastAPI(title="Pitchify API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FISH_API_KEY = os.environ.get("FISH_API_KEY", "")
FISH_BASE = "https://api.fish.audio"

# In-memory context store: session_id → context dict
_sessions: dict[str, dict] = {}


# --- Pitch Generation ---

class PitchFinancials(BaseModel):
    raise_amount: int
    equity_percent: float


class PitchContent(BaseModel):
    product_name: str
    elevator_pitch: str
    description: str


class PitchResponse(BaseModel):
    content: PitchContent
    financials: PitchFinancials
    image_base64: str


def _generate_product_image(product_name: str, description: str) -> str:
    """Generate a product image using Gemini's image generation. Returns base64 data URI or empty string."""
    try:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        prompt = (
            f"Generate a clean, minimal product mockup image for a startup called '{product_name}'. "
            f"Product: {description}. "
            "Modern, professional product photography style on a clean white/gradient background. No text."
        )
        response = client.models.generate_content(
            model="gemini-3.1-flash-image",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    img_b64 = base64.b64encode(part.inline_data.data).decode()
                    return f"data:{part.inline_data.mime_type};base64,{img_b64}"
    except Exception as e:
        print(f"Image generation failed (non-fatal): {e}")
    return ""


@app.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch_endpoint():
    """Generates a pitch using Gemini."""
    try:
        pitch_data = generate_pitch()

        raise_num = int(pitch_data.raise_amount.replace(",", "").replace("$", ""))
        equity_num = float(pitch_data.equity_offered.replace("%", ""))

        image_b64 = _generate_product_image(pitch_data.product_name, pitch_data.product_description)

        return PitchResponse(
            content=PitchContent(
                product_name=pitch_data.product_name,
                elevator_pitch=pitch_data.elevator_pitch,
                description=pitch_data.product_description.strip(),
            ),
            financials=PitchFinancials(
                raise_amount=raise_num,
                equity_percent=equity_num,
            ),
            image_base64=image_b64,
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to generate pitch: {str(e)}"
        )


# --- Live Session ---

class StartSessionRequest(BaseModel):
    fundraising_goal: int
    startup_description: str


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "802e3bc2b27e49c2995d23ef70e6ac89"


@app.post("/session/start")
async def start_session(req: StartSessionRequest):
    context = generate_pitch_context(req.fundraising_goal, req.startup_description)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
