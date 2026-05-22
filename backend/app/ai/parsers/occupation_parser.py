from app.ai.llm_client import call_llm_json
from app.core.logger import logger


async def parse_occupation(text: str) -> dict:
    prompt = (
        "Extract occupation/income details from this matrimonial biodata. "
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "occupation": string,\n'
        '  "employer": string,\n'
        '  "job_title": string,\n'
        '  "annual_income": string,\n'
        '  "work_location": string,\n'
        '  "confidence": number\n'
        "}\n\nText: " + text[:5000]
    )
    try:
        return await call_llm_json(prompt)
    except Exception as e:
        logger.error(f"Occupation parse failed: {e}")
        return {"error": str(e)}
