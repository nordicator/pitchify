import base64
import io
import os
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from preGeneration import PitchData, generate_pitch

app = FastAPI(title="Startup Pitch Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch_endpoint():
    """Generates a pitch with clearly separated content, financials, and image."""
    try:
        pitch_data, summary_markdown, image = generate_pitch()

        from PIL import Image as PILImage
        buffered = io.BytesIO()
        if isinstance(image, PILImage.Image):
            image.save(buffered, "PNG")
        else:
            PILImage.open(io.BytesIO(image.image_bytes)).save(buffered, "PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        raise_num = int(pitch_data.raise_amount.replace(",", "").replace("$", ""))
        equity_num = float(pitch_data.equity_offered.replace("%", ""))

        lines = summary_markdown.strip().split("\n")
        elevator = ""
        for i, line in enumerate(lines):
            if "elevator" in line.lower() or "pitch" in line.lower():
                for j in range(i + 1, len(lines)):
                    if lines[j].strip() and not lines[j].startswith("#"):
                        elevator = lines[j].strip()
                        break
                break

        if not elevator:
            elevator = pitch_data.product_description.split(".")[0] + "."

        return PitchResponse(
            content=PitchContent(
                product_name=pitch_data.product_name,
                elevator_pitch=elevator,
                description=pitch_data.product_description.strip(),
            ),
            financials=PitchFinancials(
                raise_amount=raise_num,
                equity_percent=equity_num,
            ),
            image_base64=f"data:image/png;base64,{img_base64}",
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Failed to generate pitch: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
