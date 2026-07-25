"""
Pre-generation step: build pitch context from user input before session starts.
Generates a structured pitch summary using Gemini.
"""

import json
import logging
import os
import re
import time

from google import genai
from google.genai import types
from pydantic import BaseModel

log = logging.getLogger("pitchify.generation")

_client = None


class PitchData(BaseModel):
    product_name: str
    product_description: str
    elevator_pitch: str
    raise_amount: str
    equity_offered: str


class _PitchSchema(BaseModel):
    product_name: str
    elevator_pitch: str
    product_description: str
    raise_amount: int
    equity_offered: float


def generate_pitch() -> PitchData:
    """Generate a unique startup pitch concept using Gemini with structured output."""
    client = _get_client()

    prompt = """\
Invent a creative startup product. Keep ALL text fields SHORT.

- product_name: 1-2 word brand name
- elevator_pitch: One sentence, max 15 words
- product_description: Max 2 short sentences
- raise_amount: integer like 500000
- equity_offered: number like 10.0"""

    last_error = None
    for attempt in range(3):
        t0 = time.perf_counter()
        try:
            log.info(f"Pitch generation | attempt={attempt+1}")
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                config=types.GenerateContentConfig(
                    temperature=1.2,
                    max_output_tokens=2048,
                    response_mime_type="application/json",
                    response_schema=_PitchSchema,
                ),
                contents=prompt,
            )
            elapsed = time.perf_counter() - t0
            log.info(f"Pitch generation response | {elapsed:.2f}s | raw={response.text[:100]!r}")

            result = _PitchSchema.model_validate_json(response.text)
            log.info(f"Pitch generated OK | name={result.product_name!r} | raise={result.raise_amount} | equity={result.equity_offered}")

            return PitchData(
                product_name=result.product_name,
                product_description=result.product_description,
                elevator_pitch=result.elevator_pitch,
                raise_amount=str(result.raise_amount),
                equity_offered=str(result.equity_offered),
            )
        except Exception as e:
            elapsed = time.perf_counter() - t0
            last_error = e
            log.warning(f"Pitch generation failed | attempt={attempt+1} | {elapsed:.2f}s | {e}")
            continue

    log.error(f"Pitch generation exhausted all retries | {last_error}")
    raise last_error


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def generate_pitch_context(fundraising_goal: int, startup_description: str) -> dict:
    log.info(f"Generating pitch context | goal=${fundraising_goal:,} | desc={startup_description[:60]!r}")
    t0 = time.perf_counter()

    prompt = (
        f"A founder is pitching a startup. Given the description below, write a 2-3 sentence "
        f"pitch summary that captures the core value proposition, target market, and key risk.\n\n"
        f"Description: {startup_description}\n\nPitch summary:"
    )

    response = _get_client().models.generate_content(
        model="gemini-3.5-flash",
        config=types.GenerateContentConfig(
            max_output_tokens=256,
            temperature=0.7,
        ),
        contents=prompt,
    )

    elapsed = time.perf_counter() - t0
    pitch_summary = response.text.strip() if response.text else startup_description
    log.info(f"Pitch context ready | {elapsed:.2f}s | summary={pitch_summary[:80]!r}")

    return {
        "fundraising_goal": fundraising_goal,
        "startup_description": startup_description,
        "pitch_summary": pitch_summary,
    }
