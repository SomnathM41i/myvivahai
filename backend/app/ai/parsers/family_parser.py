from pathlib import Path
from app.ai.llm_client_GROQ import call_llm_json
from app.core.logger import logger

PROMPT = (Path(__file__).parent.parent / "prompts" / "family_prompt.txt").read_text()


async def parse_family(text: str) -> dict:
    try:
        return await call_llm_json(PROMPT.replace("{text}", text[:8000]))
    except Exception as e:
        logger.error(f"Family parse failed: {e}")
        return {"error": str(e), "confidence": 0.0}
