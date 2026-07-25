import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Import PitchTranscript for logging into the ongoing chat session
PitchTranscript = ""  # This will be set externally when the session starts
# Initialize Gemini Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)


# Target criteria input schema
class TargetCriteria(BaseModel):
    target_raise_amount: float = Field(
        description="The minimum amount of money the startup needs to raise (e.g., 500000.0)"
    )
    max_equity_offered: float = Field(
        description="The maximum equity the startup is willing to give up in percent (e.g., 15.0)"
    )


# Structured response schema from Gemini
class PitchEvaluation(BaseModel):
    requirements_met: bool = Field(
        description="True if actual raise >= target raise AND actual equity <= max equity, else False"
    )
    score: int = Field(
        description="Score from 0 to 100 assessing how well funding and equity targets were met"
    )
    status: str = Field(
        description="'Requirements Met' if requirements_met is True, otherwise 'Requirements Not Met'"
    )
    summary: str = Field(
        description="A concise 1-2 sentence breakdown explaining the score and decision"
    )


def evaluate_pitch_with_gemini(
    actual_raise_str: str,
    actual_equity_str: str,
    target: TargetCriteria,
    logger: PitchTranscript,
) -> PitchEvaluation:
    """Evaluates pitch metrics against target criteria using Gemini and 
    logs all details directly to the session's chat transcript.
    """

    # Build evaluation prompt
    prompt = f"""
    You are a Venture Capital Deal Evaluator. Analyze the following pitch offer against target investment requirements:

    --- OFFER DETAILS ---
    - Actual Funding Raised: {actual_raise_str}
    - Actual Equity Offered: {actual_equity_str}%

    --- TARGET CRITERIA ---
    - Target Minimum Funding: ${target.target_raise_amount:,.2f}
    - Target Maximum Equity Allowed: {target.max_equity_offered}%

    --- EVALUATION INSTRUCTIONS ---
    1. Check if Actual Funding Raised >= Target Minimum Funding.
    2. Check if Actual Equity Offered <= Target Maximum Equity Allowed.
    3. `requirements_met` must be True ONLY if BOTH conditions above pass.
    4. Provide a realistic score out of 100 assessing the overall deal favorability against the targets.
    5. Provide a brief 1-2 sentence summary explaining the outcome.
    """

    # Log evaluation request into transcript
    logger.log(
        step="Evaluation Criteria Inputted",
        details={
            "actual_raise": actual_raise_str,
            "actual_equity": f"{actual_equity_str}%",
            "target_min_raise": f"${target.target_raise_amount:,.2f}",
            "target_max_equity": f"{target.max_equity_offered}%",
        },
    )

    try:
        # Call Gemini model
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PitchEvaluation,
            ),
        )

        eval_result = PitchEvaluation.model_validate_json(response.text)

        # Log evaluation output into transcript
        logger.log(
            step="Evaluation Decision Outputted",
            details={
                "requirements_met": eval_result.requirements_met,
                "score": eval_result.score,
                "status": eval_result.status,
                "summary": eval_result.summary,
            },
        )

        return eval_result

    except Exception as e:
        # Log failure into transcript if API call fails
        logger.log(
            step="Evaluation Failed",
            details={"error_message": str(e)},
        )
        raise RuntimeError(f"Gemini evaluation failed: {str(e)}")