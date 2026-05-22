from pydantic import BaseModel, EmailStr
from typing import Optional


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserMeSchema(BaseModel):
    id: int
    email: EmailStr
    name: str
    profile_image: Optional[str] = None
    is_verified: bool
    model_config = {"from_attributes": True}
