import base64
import io
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Import the generation function and schema from generate_pitch.py
from preGeneration import PitchData, generate_pitch

app = FastAPI(title="Startup Pitch Generator API")


# Response schema returning the pitch text and a base64-encoded image string
class PitchResponse(BaseModel):
    product_name: str
    product_description: str
    raise_amount: str
    equity_offered: str
    pitch_markdown: str
    image_base64: str  # Direct image bytes formatted as base64 string


@app.post("/generate-pitch", response_model=PitchResponse)
async def generate_pitch_endpoint():
    """Generates pitch details and product shot in memory and returns JSON."""
    try:
        # 1. Generate pitch content & image using your module
        pitch_data, summary_markdown, image = generate_pitch()

        # 2. Convert PIL Image into Base64 string (no disk save required)
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

        # 3. Return JSON response
        return PitchResponse(
            product_name=pitch_data.product_name,
            product_description=pitch_data.product_description.strip(),
            raise_amount=pitch_data.raise_amount,
            equity_offered=pitch_data.equity_offered,
            pitch_markdown=summary_markdown,
            image_base64=f"data:image/png;base64,{img_base64}",
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate pitch: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)