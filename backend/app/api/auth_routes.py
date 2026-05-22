"""Google OAuth 2.0 — ported from BioData-AI auth/google_oauth.py"""
from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.httpx_client import AsyncOAuth2Client
from datetime import datetime, timezone
from app.database import get_session
from app.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.core.auth import get_current_user
from app.repositories.user_repository import UserRepository
from app.schemas.auth_schema import TokenSchema, UserMeSchema

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/google")
async def google_login():
    params = (
        f"client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid email profile"
        "&access_type=offline"
        "&prompt=consent"   # ← add this; prevents stale code reuse
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: AsyncSession = Depends(get_session)
):
    async with AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    ) as client:

        token = await client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=code,
            grant_type="authorization_code"
        )

        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo"
        )

        info = resp.json()

    repo = UserRepository(db)

    user = await repo.get_by_google_id(info["sub"])

    if user:
        user = await repo.update(
            user,
            last_login=datetime.now(timezone.utc),
            profile_image=info.get("picture")
        )
    else:
        user = await repo.create(
            google_id=info["sub"],
            email=info["email"],
            name=info.get("name", ""),
            profile_image=info.get("picture"),
            is_verified=info.get("email_verified", False),
            last_login=datetime.now(timezone.utc)
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    frontend_url = settings.FRONTEND_URL.rstrip("/")  # Ensure no trailing slash

    return RedirectResponse(
        url=(
            f"{frontend_url}/login"
            f"?access_token={access_token}"
            f"&refresh_token={refresh_token}"
        )
    )

@router.get("/me", response_model=UserMeSchema)
async def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout")
async def logout():
    return {"message": "Logged out — delete your tokens client-side."}
