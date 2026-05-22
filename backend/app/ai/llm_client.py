import json
from typing import Optional

from openai import (
    AsyncOpenAI,
    RateLimitError,
    APIStatusError,
    APIConnectionError,
    APITimeoutError,
)

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.config import settings
from app.core.logger import logger


def get_groq_client() -> AsyncOpenAI:
    """
    Fresh client per request.
    Prevents stale event loop issues.
    """

    return AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1",
        timeout=60.0,
    )


@retry(
    retry=retry_if_exception_type((
        RateLimitError,
        APIStatusError,
        APIConnectionError,
        APITimeoutError,
    )),
    stop=stop_after_attempt(5),
    wait=wait_exponential(
        multiplier=1,
        min=3,
        max=30,
    ),
    reraise=True,
)
async def call_llm(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
) -> str:
    """
    Call Groq LLM with retry logic.
    """

    client = get_groq_client()

    messages = []

    if system:
        messages.append({
            "role": "system",
            "content": system,
        })

    messages.append({
        "role": "user",
        "content": prompt,
    })

    response = await client.chat.completions.create(
        model=model or settings.GROQ_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=4096,
    )

    result = response.choices[0].message.content

    if not result:
        raise ValueError("Empty response from LLM")

    logger.info(
        f"Groq response received | chars={len(result)}"
    )

    return result.strip()


async def call_llm_json(
    prompt: str,
    system: str = "",
    model: Optional[str] = None,
) -> dict:
    """
    Call LLM and safely parse JSON.
    """

    raw = await call_llm(prompt, system, model)

    clean = raw.strip()

    # Remove markdown fences
    if clean.startswith("```"):
        clean = clean.replace("```json", "")
        clean = clean.replace("```", "")

    clean = clean.strip()

    try:
        return json.loads(clean)

    except json.JSONDecodeError as e:
        logger.error(
            f"Invalid JSON returned by LLM: {clean}"
        )

        raise ValueError(
            f"LLM returned invalid JSON: {e}"
        )