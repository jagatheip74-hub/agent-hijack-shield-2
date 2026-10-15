def score_risk_level(level: str) -> int:
    """Map the transparent scanner's categorical assessment to a 0–100 score."""
    return {"low": 0, "medium": 45, "high": 85, "critical": 100}.get(level.lower(), 0)
