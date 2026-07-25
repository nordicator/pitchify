import io
import os
import sys
import uuid
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel, Field

# 1. Load environment variables
load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ Error: GEMINI_API_KEY not found in .env file.")
    sys.exit(1)

# Initialize the Google Gen AI client
client = genai.Client(api_key=GEMINI_API_KEY)


# 2. Define the Pydantic schema for structured output
class PitchData(BaseModel):
    product_name: str = Field(description="A creative name for a startup product")
    product_description: str = Field(
        description="A detailed description of the physical product, its features, and purpose"
    )
    raise_amount: str = Field(
        description="Formatted funding ask amount, e.g. '500,000'"
    )
    equity_offered: str = Field(
        description="Percentage of equity offered, e.g. '10'"
    )
    visual_style: str = Field(
        description="Ideal studio photography style for rendering the product image"
    )


def main():
    print("🎲 Inventing a random startup pitch with Gemini...")
    print("-" * 50)

    try:
        # Define and create output directory
        output_dir = os.path.join("backend", "pitches")
        os.makedirs(output_dir, exist_ok=True)

        # ==========================================
        # STEP 1: Gemini generates random project details
        # Model: gemini-3.5-flash
        # ==========================================
        pitch_prompt = """
        Invent a brand new, highly innovative physical startup product concept. 
        It could be smart hardware, eco-tech, home innovation, wearable tech, or consumer electronics.
        Generate realistic financial ask parameters and visual photography guidelines.
        """

        pitch_response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=pitch_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PitchData,
            ),
        )

        # Parse the JSON response into our Pydantic model instance
        pitch: PitchData = PitchData.model_validate_json(pitch_response.text)

        print(f"✨ Product Name: {pitch.product_name}")
        print(f"💰 Raising: ${pitch.raise_amount} for {pitch.equity_offered}% equity")
        print(f"📝 Description: {pitch.product_description.strip()}\n")

        # ==========================================
        # STEP 2: Format the Pitch Text
        # Model: gemini-3.5-flash
        # ==========================================
        summary_prompt = f"""
        Act as an expert venture capital advisor. Format a clean pitch summary using this concept:
        
        - Product Name: {pitch.product_name}
        - Product Description: {pitch.product_description}
        - Seeking Investment: ${pitch.raise_amount}
        - Equity On Offer: {pitch.equity_offered}%

        Format using markdown:
        # {pitch.product_name}
        
        ## 🚀 Elevator Pitch
        [One compelling sentence]
        
        ## 📄 Product Overview
        [2-3 punchy feature bullet points]
        
        ## 📊 The Ask
        [Summary of raise amount and equity offered]
        """

        summary_response = client.models.generate_content(
            model="gemini-3.5-flash", 
            contents=summary_prompt
        )

        # ==========================================
        # STEP 3: Render product shot using working code
        # Model: gemini-2.5-flash-image
        # ==========================================
        image_prompt = (
            f"A professional, commercial product photograph focusing on '{pitch.product_name}'. "
            f"Description: {pitch.product_description}. "
            f"Visual Style: {pitch.visual_style}. Studio lighting, clean background, high detail."
        )

        print("📸 Rendering matching product shot with gemini-2.5-flash-image...")
        image_response = client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=image_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )

        # File naming setups
        unique_suffix = uuid.uuid4().hex[:6]
        safe_name = "".join(
            c for c in pitch.product_name.lower().replace(" ", "_") if c.isalnum() or c == "_"
        )
        
        image_filename = f"{safe_name}_{unique_suffix}.png"
        md_filename = f"{safe_name}_{unique_suffix}.md"

        # Full relative paths inside backend/pitches
        image_path = os.path.join(output_dir, image_filename)
        md_path = os.path.join(output_dir, md_filename)

        # Extract and save image using `part.as_image()`
        image_saved = False
        if image_response.candidates:
            for part in image_response.candidates[0].content.parts:
                if part.inline_data:
                    image = part.as_image()
                    image.save(image_path)
                    print(f"✅ Product shot saved to: {image_path}")
                    image_saved = True
                    break

        if not image_saved:
            print("⚠️ Warning: Could not extract image from response.")

        # ==========================================
        # STEP 4: Save output as a Markdown (.md) file inside backend/pitches
        # ==========================================
        md_content = f"""# Pitch Deck Summary: {pitch.product_name}

![{pitch.product_name} Product Shot](./{image_filename})

{summary_response.text}
"""

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        print(f"📄 Pitch output saved to: {md_path}")
        print("=" * 50)

    except Exception as e:
        print(f"❌ An error occurred: {str(e)}")


if __name__ == "__main__":
    main()