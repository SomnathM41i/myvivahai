from __future__ import annotations

import json
import logging
import re
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  PYDANTIC SCHEMA  — mirrors every field your UI/DB uses
#     (cross-referenced against ProfilePreview.jsx, EditProfile.jsx,
#      BiodataExtractor.jsx ProfileCard, and schema_mapper.py)
# ─────────────────────────────────────────────────────────────────────────────

class PersonalInfo(BaseModel):
    full_name:      Optional[str] = None
    date_of_birth:  Optional[str] = None
    age:            Optional[str] = None
    gender:         Optional[str] = None
    religion:       Optional[str] = None
    caste:          Optional[str] = None
    sub_caste:      Optional[str] = None
    mother_tongue:  Optional[str] = None
    height:         Optional[str] = None
    complexion:     Optional[str] = None
    blood_group:    Optional[str] = None
    marital_status: Optional[str] = None
    mobile:         Optional[str] = None
    email:          Optional[str] = None
    city:           Optional[str] = None
    state:          Optional[str] = None
    country:        Optional[str] = None


class FamilyInfo(BaseModel):
    father_name:       Optional[str] = None
    father_occupation: Optional[str] = None
    mother_name:       Optional[str] = None
    mother_occupation: Optional[str] = None
    siblings:          Optional[str] = None
    brothers:          Optional[str] = None
    sisters:           Optional[str] = None
    family_type:       Optional[str] = None   # Nuclear / Joint
    family_status:     Optional[str] = None   # Middle class / Upper middle / etc.
    native_place:      Optional[str] = None


class EducationInfo(BaseModel):
    highest_education: Optional[str] = None
    degree:            Optional[str] = None
    college:           Optional[str] = None
    field_of_study:    Optional[str] = None
    graduation_year:   Optional[str] = None


class OccupationInfo(BaseModel):
    occupation:    Optional[str] = None
    employer:      Optional[str] = None
    job_title:     Optional[str] = None
    annual_income: Optional[str] = None
    work_location: Optional[str] = None


class HoroscopeInfo(BaseModel):
    rashi:       Optional[str] = None
    nakshatra:   Optional[str] = None
    gotra:       Optional[str] = None
    manglik:     Optional[str] = None
    birth_time:  Optional[str] = None
    birth_place: Optional[str] = None
    charan:      Optional[str] = None


class PartnerPreferences(BaseModel):
    preferred_age_range:   Optional[str] = None
    preferred_height:      Optional[str] = None
    preferred_education:   Optional[str] = None
    preferred_occupation:  Optional[str] = None
    preferred_income:      Optional[str] = None
    preferred_caste:       Optional[str] = None
    preferred_location:    Optional[str] = None
    other_preferences:     Optional[str] = None


class ParsedBiodata(BaseModel):
    """Single model — all biodata sections combined."""
    personal:            PersonalInfo     = PersonalInfo()
    family:              FamilyInfo       = FamilyInfo()
    education:           EducationInfo    = EducationInfo()
    occupation:          OccupationInfo   = OccupationInfo()
    horoscope:           HoroscopeInfo    = HoroscopeInfo()
    partner_preferences: PartnerPreferences = PartnerPreferences()
    ai_confidence:       float            = 0.0

    @field_validator("ai_confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, v):
        try:
            return max(0.0, min(1.0, float(v)))
        except (TypeError, ValueError):
            return 0.0

    @model_validator(mode="after")
    def ensure_nested_defaults(self):
        """Ensure every nested section is always a proper model, never None."""
        if self.personal            is None: self.personal            = PersonalInfo()
        if self.family              is None: self.family              = FamilyInfo()
        if self.education           is None: self.education           = EducationInfo()
        if self.occupation          is None: self.occupation          = OccupationInfo()
        if self.horoscope           is None: self.horoscope           = HoroscopeInfo()
        if self.partner_preferences is None: self.partner_preferences = PartnerPreferences()
        return self

    def to_flat_dict(self) -> dict:
        """
        Flatten all nested sections into a single dict.

        Output shape is identical to your existing merge_parsed_sections()
        so schema_mapper.map_to_profile_fields() works without changes.
        """
        d: dict = {}
        d.update(self.personal.model_dump())
        d.update(self.family.model_dump())
        d.update(self.education.model_dump())
        d.update(self.occupation.model_dump())
        d.update(self.horoscope.model_dump())
        d.update(self.partner_preferences.model_dump())
        d["ai_confidence"] = self.ai_confidence
        # Alias expected by schema_mapper and BiodataExtractor ProfileCard
        d.setdefault("education", self.education.highest_education)
        # Alias expected by BiodataExtractor ProfileCard
        d["name"]       = self.personal.full_name
        d["confidence"] = self.ai_confidence
        return d


# ─────────────────────────────────────────────────────────────────────────────
# 2.  PROMPTS  — all in one place (replaces the 4 separate .txt files)
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert Indian matrimonial biodata parser.
You read biodata text written in English, Hindi, or Marathi (often mixed).
You return ONLY valid JSON — no explanation, no markdown, no code fences.
Set any field you cannot find to null. Never invent or guess values.

IMPORTANT for Marathi/Hindi biodata:
- नाव / पूर्ण नाव = full_name
- जन्म तारीख / जन्मतारीख = date_of_birth
- वय / वर्षे = age
- शिक्षण / शैक्षणिक = highest_education
- व्यवसाय / नोकरी = occupation
- उत्पन्न / वार्षिक उत्पन्न = annual_income
- राशी / रास = rashi
- नक्षत्र = nakshatra
- गोत्र = gotra
- मंगळ = manglik
- मोबाईल / संपर्क = mobile
- जन्म वेळ / वेळ = birth_time
- जन्म स्थळ = birth_place
- जात / जाती = caste
- पोटजात / पोट-जात = sub_caste
- शहर / गाव = city
- वडील / पिता = father_name
- आई / माता = mother_name
- भाऊ = brothers
- बहीण = sisters

Extract the FIRST biodata profile if multiple profiles appear in the text.
For multi-profile pages, extract ALL profiles as separate JSON objects in an array under key "profiles".
If only one profile, use the standard flat structure (not array)."""


SINGLE_PASS_PROMPT = """Extract ALL information from the matrimonial biodata text below.
Return a single JSON object with EXACTLY this structure.
Use null for every field you cannot find. Do NOT add extra keys.

MARATHI/HINDI KEYWORD MAPPINGS — if you see these words in the text, map them to the JSON field shown:
नाव / पूर्ण नाव → full_name | जन्म तारीख → date_of_birth | वय → age | उंची → height
शिक्षण / पदवी → highest_education | महाविद्यालय → college | व्यवसाय / नोकरी → occupation
उत्पन्न / वार्षिक उत्पन्न → annual_income | राशी / रास → rashi | नक्षत्र → nakshatra
गोत्र → gotra | मंगळ → manglik | मोबाईल / फोन → mobile | ईमेल → email
जात → caste | पोटजात → sub_caste | धर्म → religion | वडील / पिता → father_name
आई / माता → mother_name | भाऊ → brothers | बहीण → sisters | रक्तगट → blood_group
जन्म वेळ → birth_time | जन्म स्थळ → birth_place | शहर / गाव → city | राज्य → state

{{
  "personal": {{
    "full_name":      string,   // Candidate's full name
    "date_of_birth":  string,   // DD/MM/YYYY or as written
    "age":            string,   // e.g. "28 years"
    "gender":         string,   // Male / Female
    "religion":       string,   // Hindu / Muslim / Christian / Sikh / Jain / Buddhist etc.
    "caste":          string,
    "sub_caste":      string,
    "mother_tongue":  string,   // Marathi / Hindi / Gujarati etc.
    "height":         string,   // e.g. "5'6\""
    "complexion":     string,   // Fair / Wheatish / Dark
    "blood_group":    string,
    "marital_status": string,   // Never Married / Divorced / Widowed
    "mobile":         string,
    "email":          string,
    "city":           string,
    "state":          string,
    "country":        string
  }},
  "family": {{
    "father_name":        string,
    "father_occupation":  string,
    "mother_name":        string,
    "mother_occupation":  string,
    "siblings":           string,   // e.g. "2 brothers, 1 sister"
    "brothers":           string,
    "sisters":            string,
    "family_type":        string,   // Nuclear / Joint
    "family_status":      string,   // Middle Class / Upper Middle Class / Rich
    "native_place":       string
  }},
  "education": {{
    "highest_education":  string,   // e.g. "B.E. Computer Science"
    "degree":             string,
    "college":            string,
    "field_of_study":     string,
    "graduation_year":    string
  }},
  "occupation": {{
    "occupation":     string,
    "employer":       string,
    "job_title":      string,
    "annual_income":  string,   // e.g. "8 LPA" or "₹8,00,000"
    "work_location":  string
  }},
  "horoscope": {{
    "rashi":        string,   // Moon sign e.g. Mesh / Vrishabh
    "nakshatra":    string,
    "gotra":        string,
    "manglik":      string,   // Yes / No / Anshik
    "birth_time":   string,
    "birth_place":  string,
    "charan":       string
  }},
  "partner_preferences": {{
    "preferred_age_range":   string,   // e.g. "25-30"
    "preferred_height":      string,
    "preferred_education":   string,
    "preferred_occupation":  string,
    "preferred_income":      string,
    "preferred_caste":       string,
    "preferred_location":    string,
    "other_preferences":     string
  }},
  "ai_confidence": number   // 0.0–1.0: your confidence in the overall extraction quality
}}

BIODATA TEXT:
{text}"""


def build_prompt(text: str, char_limit: int = 8000) -> str:
    """
    Build the final prompt string.
    8000 chars covers multi-profile newspaper pages (was 6000).
    Newspaper biodata pages often have 2-3 profiles so we need more room.
    """
    return SINGLE_PASS_PROMPT.format(text=text[:char_limit])


# ─────────────────────────────────────────────────────────────────────────────
# 3.  GROQ API CALL  — single call with tenacity retry
# ─────────────────────────────────────────────────────────────────────────────

def _clean_response(raw: str) -> str:
    """Strip markdown fences if the model ignores json_object mode."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return raw.strip()


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
)
async def _call_groq(client, model: str, prompt: str) -> str:
    """Single Groq call. tenacity retries up to 3× on any exception."""
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.0,          # Deterministic — critical for structured extraction
        max_tokens=2048,          # Full JSON response fits comfortably within this
        response_format={"type": "json_object"},  # Groq JSON mode — no markdown wrapping
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# 4.  PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

async def parse_biodata_single_pass(
    text: str,
    groq_client,          # Your existing AsyncOpenAI client from llm_client.py
    model: Optional[str] = None,
) -> ParsedBiodata:
    """
    Single entry point for TEXT-based extraction.
    Replaces ALL 4 parser calls in profile_service.py.

    Args:
        text:         Extracted text from OCR / PDF / DOCX
        groq_client:  Your AsyncOpenAI client (from get_groq_client())
        model:        Groq model name (defaults to settings.GROQ_MODEL)

    Returns:
        ParsedBiodata — always returns, never raises.
        On failure returns a zeroed ParsedBiodata with ai_confidence=0.0
        so the pipeline can continue and mark the upload as low-confidence.
    """
    from app.config import settings
    model = model or settings.GROQ_MODEL

    prompt = build_prompt(text)

    try:
        raw    = await _call_groq(groq_client, model, prompt)
        clean  = _clean_response(raw)
        data   = json.loads(clean)
        result = ParsedBiodata.model_validate(data)
        logger.info(
            f"Single-pass parse OK | "
            f"name={result.personal.full_name!r} | "
            f"ai_confidence={result.ai_confidence:.2f}"
        )
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Groq returned invalid JSON: {e}")
        return ParsedBiodata()

    except Exception as e:
        logger.error(f"Single-pass parse failed after retries: {e}")
        return ParsedBiodata()


# ─────────────────────────────────────────────────────────────────────────────
# 5.  VISION EXTRACTION  — send image/PDF page directly, skip OCR entirely
# ─────────────────────────────────────────────────────────────────────────────

import base64
import mimetypes

# Vision model is now configured via .env: GROQ_VISION_MODEL
# Default: meta-llama/llama-4-scout-17b-16e-instruct

VISION_SYSTEM_PROMPT = """You are an expert Indian matrimonial biodata parser.
You can read English, Hindi, and Marathi text directly from images.
You return ONLY valid JSON — no explanation, no markdown, no code fences.
Set any field you cannot find to null. Never invent or guess values.

CRITICAL RULES:
1. education.highest_education = CANDIDATE'S OWN degree only.
   Family members (brother, sister, mama) are listed with their degrees in brackets — 
   put those in family fields, NOT in education.
2. occupation = CANDIDATE'S current job only.
3. mobile = संपर्क / Contact numbers for the CANDIDATE.
4. For Marathi labels: नाव=name, शिक्षण=education, व्यवसाय=occupation,
   उत्पन्न=income, राशी=rashi, संपर्क=mobile, वडील=father, आई=mother,
   भाऊ=brothers, बहीण=sisters, जन्म तारीख=DOB, उंची=height, रक्त गट=blood_group."""


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
)
async def _call_groq_vision(client, model: str, image_b64: str, mime: str) -> str:
    """Send a base64-encoded image to the Groq vision model."""
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{image_b64}",
                        },
                    },
                    {
                        "type": "text",
                        "text": SINGLE_PASS_PROMPT.format(text="[See image above — read ALL text directly from the image]"),
                    },
                ],
            },
        ],
        temperature=0.0,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


# ─────────────────────────────────────────────────────────────────────────────
# 5b.  GEMINI VISION EXTRACTION  — same pipeline, different model provider
# ─────────────────────────────────────────────────────────────────────────────


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
)
async def _call_gemini_vision(client, model: str, image_b64: str, mime: str) -> str:
    """Send a base64-encoded image to Gemini vision model (OpenAI-compatible endpoint)."""
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime};base64,{image_b64}",
                        },
                    },
                    {
                        "type": "text",
                        "text": SINGLE_PASS_PROMPT.format(text="[See image above — read ALL text directly from the image]"),
                    },
                ],
            },
        ],
        temperature=0.0,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


async def parse_biodata_gemini_vision(
    file_path: str,
    file_type: str,
    gemini_client,
    model: Optional[str] = None,
) -> ParsedBiodata:
    """
    Gemini vision-mode extraction: sends image/PDF directly to Gemini vision LLM.

    Args:
        file_path:   Absolute path to the uploaded file
        file_type:   "image" or "pdf"
        gemini_client: AsyncOpenAI client pointed at Gemini endpoint
        model:       Gemini model name (defaults to settings.GEMINI_MODEL)

    Returns:
        ParsedBiodata — always returns, never raises.
    """
    from app.config import settings

    vision_model = model or settings.GEMINI_MODEL
    logger.info(f"Gemini vision mode: {file_path} using {vision_model}")

    try:
        if file_type == "pdf":
            pages = _pdf_page_to_base64(file_path)
        else:
            mime = mimetypes.guess_type(file_path)[0] or "image/jpeg"
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
            pages = [(base64.b64encode(raw_bytes).decode(), mime)]

        best: Optional[ParsedBiodata] = None

        for page_num, (b64, mime) in enumerate(pages):
            logger.info(f"Gemini vision: processing page {page_num + 1}/{len(pages)}")
            try:
                raw   = await _call_gemini_vision(gemini_client, vision_model, b64, mime)
                clean = _clean_response(raw)
                data  = json.loads(clean)

                profiles_raw: list[dict] = data.pop("profiles", []) or []

                result = ParsedBiodata.model_validate(data)
                result._extra_profiles = [
                    ParsedBiodata.model_validate(p) for p in profiles_raw
                    if isinstance(p, dict)
                ]

                logger.info(
                    f"Gemini vision page {page_num+1} OK | "
                    f"name={result.personal.full_name!r} | "
                    f"conf={result.ai_confidence:.2f} | "
                    f"extra_profiles={len(result._extra_profiles)}"
                )

                if best is None or result.ai_confidence > best.ai_confidence:
                    best = result

                if result.ai_confidence >= 0.7:
                    break

            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Gemini vision page {page_num+1} failed: {e}")
                continue

        if best is not None:
            return best

        logger.error("Gemini vision extraction: all pages failed")
        return ParsedBiodata()

    except Exception as e:
        logger.error(f"Gemini vision extraction failed: {e}")
        return ParsedBiodata()


def _pdf_page_to_base64(file_path: str) -> list[tuple[str, str]]:
    """
    Convert each page of a PDF to a base64 JPEG.
    Returns list of (base64_string, mime_type) tuples — one per page.
    Requires: pip install pdf2image
    """
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(file_path, dpi=200, fmt="jpeg")
        result = []
        for img in images:
            import io
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            b64 = base64.b64encode(buf.getvalue()).decode()
            result.append((b64, "image/jpeg"))
        return result
    except ImportError:
        raise RuntimeError(
            "pdf2image is required for vision mode PDF extraction. "
            "Run: pip install pdf2image"
        )


async def parse_biodata_vision(
    file_path: str,
    file_type: str,
    groq_client,
    model: Optional[str] = None,
) -> ParsedBiodata:
    """
    Vision-mode extraction: sends image/PDF directly to the LLM — no OCR step.
    Works best for:
      - Marathi/Hindi biodata images (avoids Tesseract language issues)
      - WhatsApp-compressed phone photos
      - Multi-column newspaper biodata pages
      - Any image where OCR gives poor results

    Args:
        file_path:   Absolute path to the uploaded file
        file_type:   "image" or "pdf"
        groq_client: AsyncOpenAI-compatible Groq client
        model:       Vision model name (defaults to llama-4-scout)

    Returns:
        ParsedBiodata — always returns, never raises.
    """
    from app.config import settings

    vision_model = model or settings.GROQ_VISION_MODEL
    logger.info(f"Vision mode: {file_path} using {vision_model}")

    try:
        # ── Build list of (b64, mime) for each page/image ────────────────
        if file_type == "pdf":
            pages = _pdf_page_to_base64(file_path)
        else:
            # Direct image — read and base64-encode
            mime = mimetypes.guess_type(file_path)[0] or "image/jpeg"
            with open(file_path, "rb") as f:
                raw_bytes = f.read()
            pages = [(base64.b64encode(raw_bytes).decode(), mime)]

        # ── Call vision LLM once per page, merge results ─────────────────
        # For most biodata files this is 1 page.
        # For multi-page PDFs we take the first page with a confident result.
        best: Optional[ParsedBiodata] = None

        for page_num, (b64, mime) in enumerate(pages):
            logger.info(f"Vision: processing page {page_num + 1}/{len(pages)}")
            try:
                raw   = await _call_groq_vision(groq_client, vision_model, b64, mime)
                clean = _clean_response(raw)
                data  = json.loads(clean)

                # Handle multi-profile response (newspaper page)
                profiles_raw: list[dict] = data.pop("profiles", []) or []

                result = ParsedBiodata.model_validate(data)
                result._extra_profiles = [
                    ParsedBiodata.model_validate(p) for p in profiles_raw
                    if isinstance(p, dict)
                ]

                logger.info(
                    f"Vision page {page_num+1} OK | "
                    f"name={result.personal.full_name!r} | "
                    f"conf={result.ai_confidence:.2f} | "
                    f"extra_profiles={len(result._extra_profiles)}"
                )

                # Keep the most confident page result
                if best is None or result.ai_confidence > best.ai_confidence:
                    best = result

                # Stop early if we got a confident result (saves API quota)
                if result.ai_confidence >= 0.7:
                    break

            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Vision page {page_num+1} failed: {e}")
                continue

        if best is not None:
            return best

        logger.error("Vision extraction: all pages failed")
        return ParsedBiodata()

    except Exception as e:
        logger.error(f"Vision extraction failed: {e}")
        return ParsedBiodata()


# ─────────────────────────────────────────────────────────────────────────────
# 5.  HOW TO UPDATE profile_service.py
# ─────────────────────────────────────────────────────────────────────────────
#
# REMOVE these imports:
#   from app.ai.parsers.biodata_parser    import parse_biodata
#   from app.ai.parsers.family_parser     import parse_family
#   from app.ai.parsers.education_parser  import parse_education
#   from app.ai.parsers.occupation_parser import parse_occupation
#   from app.ai.transformers.response_transformer import merge_parsed_sections
#
# ADD these imports:
#   from app.ai.parsers.single_pass_parser import parse_biodata_single_pass
#   from app.ai.llm_client import get_groq_client
#
# REMOVE the entire parser block (including all asyncio.sleep calls):
#   logger.info("Running biodata parser…")
#   biodata = await parse_biodata(trimmed)
#   await asyncio.sleep(_PARSER_DELAY_SECONDS)
#   ... (family, education, occupation parsers)
#   merged = merge_parsed_sections(biodata, family, education, occupation)
#
# REPLACE with:
#   client = get_groq_client()
#   parsed = await parse_biodata_single_pass(trimmed, client)
#   flat   = parsed.to_flat_dict()
#   profile_fields = map_to_profile_fields(flat)
#
# Also remove:
#   _PARSER_DELAY_SECONDS = 4
#   import asyncio  (if only used for the sleep calls)
# ─────────────────────────────────────────────────────────────────────────────