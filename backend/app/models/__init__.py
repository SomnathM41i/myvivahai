# app/models/__init__.py
# Import all models here so SQLAlchemy's metadata has the full picture
# whenever any single model is used (e.g. in Celery workers).
from app.models.user_model import User          # noqa: F401  — must be first (others FK to users)
from app.models.upload_model import Upload      # noqa: F401
from app.models.profile_model import Profile    # noqa: F401
from app.models.match_model import Match        # noqa: F401