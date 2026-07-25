"""
Pre-generation step: build pitch context from user input before session starts.
Generates a structured pitch summary using Gemini.
"""

import os
from google import genai
from google.genai import types

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def generate_pitch_context(fundraising_goal: int, startup_description: str) -> dict:
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

    pitch_summary = response.text.strip() if response.text else startup_description

    return {
        "fundraising_goal": fundraising_goal,
        "startup_description": startup_description,
        "pitch_summary": pitch_summary,
    }
