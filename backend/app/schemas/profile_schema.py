"""
app/schemas/profile_schema.py
Pydantic schemas for profile/generated-data management endpoints.
"""
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class ProfileSchema(BaseModel):
    id: int
    upload_id: Optional[int] = None
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    mother_tongue: Optional[str] = None
    height: Optional[str] = None
    blood_group: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    annual_income: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    siblings: Optional[str] = None
    family_type: Optional[str] = None
    rashi: Optional[str] = None
    nakshatra: Optional[str] = None
    gotra: Optional[str] = None
    manglik: Optional[str] = None
    partner_preference: Optional[str] = None
    ai_confidence: Optional[float] = None
    raw_json: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProfileUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    religion: Optional[str] = None
    caste: Optional[str] = None
    mother_tongue: Optional[str] = None
    height: Optional[str] = None
    blood_group: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    education: Optional[str] = None
    occupation: Optional[str] = None
    annual_income: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    siblings: Optional[str] = None
    family_type: Optional[str] = None
    rashi: Optional[str] = None
    nakshatra: Optional[str] = None
    gotra: Optional[str] = None
    manglik: Optional[str] = None
    partner_preference: Optional[str] = None
