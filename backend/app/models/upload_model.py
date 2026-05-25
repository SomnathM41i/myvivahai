from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Upload(Base):
    __tablename__ = "uploads"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    original_filename: Mapped[str] = mapped_column(String(512))
    stored_filename: Mapped[str] = mapped_column(String(512))
    file_type: Mapped[str] = mapped_column(String(16))
    file_path: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    model_used: Mapped[str | None] = mapped_column(String(128), nullable=True)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    profiles_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    # "ocr" = traditional OCR→text→LLM pipeline
    # "vision" = send image/PDF page directly to vision LLM (no OCR step)
    extraction_mode: Mapped[str] = mapped_column(String(16), default="ocr")
    created_at: Mapped[datetime] = mapped_column(DateTime,
        default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
