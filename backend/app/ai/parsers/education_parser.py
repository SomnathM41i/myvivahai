from backend.app.ai.llm_client_GROQ import call_llm_json
from app.core.logger import logger


async def parse_education(text: str) -> dict:
    prompt = (
        "Extract education details from this matrimonial biodata. "
        "Return ONLY valid JSON:\n"
        "{\n"
        '  "highest_education": string,\n'
        '  "degree": string,\n'
        '  "college": string,\n'
        '  "graduation_year": string,\n'
        '  "field_of_study": string,\n'
        '  "confidence": number\n'
        "}\n\nText: " + text[:5000]
    )
    try:
        return await call_llm_json(prompt)
    except Exception as e:
        logger.error(f"Education parse failed: {e}")
        return {"error": str(e)}
