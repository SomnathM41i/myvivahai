"""
app/schemas/upload_schema.py
Pydantic schemas for upload/file management endpoints.
"""
from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime
import os


class UploadResponseSchema(BaseModel):
    id: int
    original_filename: str
    file_type: str
    file_path: str
    status: str
    profiles_count: int
    error_message: Optional[str] = None
    model_used: Optional[str] = None
    extraction_mode: Optional[str] = "ocr"
    created_at: datetime
    completed_at: Optional[datetime] = None

    @computed_field
    @property
    def file_size_bytes(self) -> Optional[int]:
        try:
            return os.path.getsize(self.file_path) if os.path.exists(self.file_path) else None
        except Exception:
            return None

    model_config = {"from_attributes": True}


class UploadStatusSchema(BaseModel):
    id: int
    status: str
    profiles_count: int
    error_message: Optional[str] = None
    completed_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


class UploadListSchema(BaseModel):
    """Paginated list of uploads."""
    items: list[UploadResponseSchema]
    total: int
    page: int
    page_size: int
    total_pages: int
