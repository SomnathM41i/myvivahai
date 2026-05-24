"""
schema_mapper.py  — UPDATED VERSION
=====================================
Drop this file at:  app/ai/transformers/schema_mapper.py

Changes from your original:
  - Added partner_preferences fields (preferred_age_range etc.)
  - Added horoscope fields already present in ProfilePreview.jsx
    (rashi, nakshatra, gotra, manglik) — were missing from your original mapper
  - Added confidence_score, confidence_label, needs_review from Problem 3
  - Added charan from horoscope prompt

Everything else is unchanged — same function signature.
"""


def map_to_profile_fields(merged: dict) -> dict:
    return {
        # ── Personal ──────────────────────────────────────────────────────
        "full_name":      merged.get("full_name"),
        "date_of_birth":  merged.get("date_of_birth"),
        "age":            merged.get("age"),
        "gender":         merged.get("gender"),
        "religion":       merged.get("religion"),
        "caste":          merged.get("caste"),
        "sub_caste":      merged.get("sub_caste"),
        "mother_tongue":  merged.get("mother_tongue"),
        "height":         merged.get("height"),
        "complexion":     merged.get("complexion"),
        "blood_group":    merged.get("blood_group"),
        "marital_status": merged.get("marital_status"),
        "mobile":         merged.get("mobile"),
        "email":          merged.get("email"),
        "city":           merged.get("city"),
        "state":          merged.get("state"),
        "country":        merged.get("country"),

        # ── Education & Career ────────────────────────────────────────────
        "education":      merged.get("education") or merged.get("highest_education"),
        "highest_education": merged.get("highest_education"),
        "degree":         merged.get("degree"),
        "college":        merged.get("college"),
        "field_of_study": merged.get("field_of_study"),
        "graduation_year": merged.get("graduation_year"),
        "occupation":     merged.get("occupation"),
        "employer":       merged.get("employer"),
        "job_title":      merged.get("job_title"),
        "annual_income":  merged.get("annual_income"),
        "work_location":  merged.get("work_location"),

        # ── Family ────────────────────────────────────────────────────────
        "father_name":       merged.get("father_name"),
        "father_occupation": merged.get("father_occupation"),
        "mother_name":       merged.get("mother_name"),
        "mother_occupation": merged.get("mother_occupation"),
        "siblings":          merged.get("siblings"),
        "brothers":          merged.get("brothers"),
        "sisters":           merged.get("sisters"),
        "family_type":       merged.get("family_type"),
        "family_status":     merged.get("family_status"),
        "native_place":      merged.get("native_place"),

        # ── Horoscope ─────────────────────────────────────────────────────
        "rashi":       merged.get("rashi"),
        "nakshatra":   merged.get("nakshatra"),
        "gotra":       merged.get("gotra"),
        "manglik":     merged.get("manglik"),
        "birth_time":  merged.get("birth_time"),
        "birth_place": merged.get("birth_place"),
        "charan":      merged.get("charan"),

        # ── Partner preferences ───────────────────────────────────────────
        "preferred_age_range":  merged.get("preferred_age_range"),
        "preferred_height":     merged.get("preferred_height"),
        "preferred_education":  merged.get("preferred_education"),
        "preferred_occupation": merged.get("preferred_occupation"),
        "preferred_income":     merged.get("preferred_income"),
        "preferred_caste":      merged.get("preferred_caste"),
        "preferred_location":   merged.get("preferred_location"),
        "other_preferences":    merged.get("other_preferences"),

        # ── Confidence (Problem 3) ────────────────────────────────────────
        "ai_confidence":     merged.get("ai_confidence", 0.0),
        "confidence_score":  merged.get("confidence_score", 0.0),
        "confidence_label":  merged.get("confidence_label", "low"),
        "needs_review":      merged.get("needs_review", True),
        "review_reasons":    merged.get("review_reasons", "[]"),
    }