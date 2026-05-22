"""Direct text-to-profile parser endpoint — useful for testing AI pipeline."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.ai.parsers.biodata_parser import parse_biodata
from app.ai.parsers.family_parser import parse_family
from app.ai.transformers.response_transformer import merge_parsed_sections
from app.ai.transformers.schema_mapper import map_to_profile_fields

router = APIRouter(prefix="/api/parser", tags=["parser"])


class ParseRequest(BaseModel):
    text: str


@router.post("/parse")
async def parse_text(req: ParseRequest, current_user=Depends(get_current_user)):
    biodata = await parse_biodata(req.text)
    family = await parse_family(req.text)
    merged = merge_parsed_sections(biodata, family, {}, {})
    return {"raw": merged, "mapped": map_to_profile_fields(merged)}
