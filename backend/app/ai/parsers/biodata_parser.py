from pathlib import Path
from app.ai.llm_client_GROQ import call_llm_json
from app.core.logger import logger

PROMPT = (Path(__file__).parent.parent / "prompts" / "biodata_prompt.txt").read_text()


async def parse_biodata(text: str) -> dict:
    try:
        result = await call_llm_json(PROMPT.replace("{text}", text[:8000]))
        logger.info(f"Biodata parsed — confidence: {result.get('confidence', '?')}")
        return result
    except Exception as e:
        logger.error(f"Biodata parse failed: {e}")
        return {"error": str(e), "confidence": 0.0}
