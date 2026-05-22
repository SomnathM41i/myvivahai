REQUIRED_FIELDS = ["full_name", "mobile", "email", "education", "occupation"]


def get_missing_fields(data: dict) -> list:
    return [f for f in REQUIRED_FIELDS if not data.get(f)]


def sanitize_profile_data(data: dict) -> dict:
    return {k: str(v).strip() if v is not None else None for k, v in data.items()}
