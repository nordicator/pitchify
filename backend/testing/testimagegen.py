from google import genai
from google.genai import types

# Initialize with your API key
import os
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
# Uses generate_content with an image-capable Gemini model
response = client.models.generate_content(
    model="gemini-2.5-flash-image",
    contents="A minimalist, high-contrast poster of a mountain peak",
    config=types.GenerateContentConfig(
        response_modalities=["IMAGE"],
    )
)

for part in response.candidates[0].content.parts:
    if part.inline_data:
        image = part.as_image()
        image.save("gemini_output.png")