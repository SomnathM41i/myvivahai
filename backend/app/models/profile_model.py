from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    upload_id: Mapped[int | None] = mapped_column(ForeignKey("uploads.id"), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    religion: Mapped[str | None] = mapped_column(String(64), nullable=True)
    caste: Mapped[str | None] = mapped_column(String(128), nullable=True)
    mother_tongue: Mapped[str | None] = mapped_column(String(64), nullable=True)
    height: Mapped[str | None] = mapped_column(String(16), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(8), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(256), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    state: Mapped[str | None] = mapped_column(String(128), nullable=True)
    education: Mapped[str | None] = mapped_column(String(256), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(256), nullable=True)
    annual_income: Mapped[str | None] = mapped_column(String(64), nullable=True)
    father_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    mother_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    siblings: Mapped[str | None] = mapped_column(String(128), nullable=True)
    family_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rashi: Mapped[str | None] = mapped_column(String(64), nullable=True)
    nakshatra: Mapped[str | None] = mapped_column(String(64), nullable=True)
    gotra: Mapped[str | None] = mapped_column(String(128), nullable=True)
    manglik: Mapped[str | None] = mapped_column(String(16), nullable=True)
    partner_preference: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime,
        default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime,
        default=lambda: datetime.now(timezone.utc))
