"""
LLM Client — wraps Groq (primary) with retry logic.
Ported from BioData-AI core/extractor.py Groq integration.
Same API key works — just copy GROQ_API_KEY to .env.
"""
import json
from typing import Optional
from groq import Groq
from tenacity import retry, stop_after_attempt, wait_exponential
from app.config import settings
from app.core.logger import logger

_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def call_llm(prompt: str, system: str = "", model: Optional[str] = None) -> str:
    """Call Groq and return raw text. Retries 3× on failure."""
    client = get_groq_client()
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = client.chat.completions.create(
        model=model or settings.GROQ_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=4096,
    )
    result = response.choices[0].message.content
    logger.debug(f"LLM response: {len(result)} chars")
    return result


async def call_llm_json(prompt: str, system: str = "", model: Optional[str] = None) -> dict:
    """Call LLM and parse JSON. Strips markdown fences if present."""
    raw = await call_llm(prompt, system, model)
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    return json.loads(clean.strip().rstrip("`"))
