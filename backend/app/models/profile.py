# backend/app/models/profile.py

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_id       = Column(String, unique=True, index=True)

    # Quick-access columns (also stored in full inside `data`)
    name          = Column(String, nullable=True)
    age           = Column(Integer, nullable=True)
    city          = Column(String, nullable=True)
    confidence    = Column(Float, default=0.0)

    # Full extracted JSON blob
    data          = Column(JSON, nullable=False)

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user          = relationship("User", back_populates="profiles")