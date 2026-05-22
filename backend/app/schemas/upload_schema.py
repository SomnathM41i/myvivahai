from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UploadResponseSchema(BaseModel):
    id: int
    original_filename: str
    file_type: str
    status: str
    profiles_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


class UploadStatusSchema(BaseModel):
    id: int
    status: str
    profiles_count: int
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}
