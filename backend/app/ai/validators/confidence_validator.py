def is_high_confidence(data: dict, threshold: float = 0.6) -> bool:
    return float(data.get("confidence", 0)) >= threshold


def get_confidence_label(score: float) -> str:
    if score >= 0.85:
        return "high"
    elif score >= 0.60:
        return "medium"
    return "low"
