"""
Pre-generation step: build pitch context from user input before session starts.
Generates a structured pitch summary using Gemini.
"""

import glob
import os
import random
import re

from google import genai
from google.genai import types
from pydantic import BaseModel

_client = None

PITCHES_DIR = os.path.join(os.path.dirname(__file__), "pitches")


class PitchData(BaseModel):
    product_name: str
    product_description: str
    raise_amount: str
    equity_offered: str


def _parse_pitch_markdown(md_text: str) -> PitchData:
    lines = md_text.strip().split("\n")

    product_name = ""
    for line in lines:
        if line.startswith("# ") and "Pitch Deck" not in line:
            product_name = line.lstrip("# ").strip()
            break

    description_lines = []
    in_overview = False
    for line in lines:
        if "Product Overview" in line:
            in_overview = True
            continue
        if in_overview:
            if line.startswith("## "):
                break
            if line.strip().startswith("*"):
                description_lines.append(
                    re.sub(r"^\*\s*\*\*[^*]+\*\*\s*", "", line.strip().lstrip("* "))
                )

    description = " ".join(description_lines) if description_lines else ""

    raise_amount = ""
    equity_offered = ""
    for line in lines:
        money_match = re.search(r"\$[\d,]+(?:,\d{3})*", line)
        equity_match = re.search(r"([\d.]+)%\s*equity", line)
        if money_match and equity_match:
            raise_amount = money_match.group(0).replace("$", "").strip()
            equity_offered = equity_match.group(1) + "%"
            break

    return PitchData(
        product_name=product_name,
        product_description=description,
        raise_amount=raise_amount,
        equity_offered=equity_offered,
    )


def generate_pitch() -> tuple:
    md_files = glob.glob(os.path.join(PITCHES_DIR, "*.md"))
    if not md_files:
        raise FileNotFoundError("No pitch files found in pitches/ directory")

    chosen_md = random.choice(md_files)
    base_name = os.path.splitext(chosen_md)[0]
    png_path = base_name + ".png"

    with open(chosen_md, "r") as f:
        md_text = f.read()

    pitch_data = _parse_pitch_markdown(md_text)

    if os.path.exists(png_path):
        with open(png_path, "rb") as f:
            image_bytes = f.read()
    else:
        image_bytes = b""

    class ImageWrapper:
        def __init__(self, data: bytes):
            self.image_bytes = data

    return (pitch_data, md_text, ImageWrapper(image_bytes))


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
