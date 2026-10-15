from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from ..models import Approval
from .approval_binding import action_binding


def create_pending_approval(
    db: Session,
    *,
    tool: str,
    action: str,
    arguments: dict[str, Any],
    requested_by: str,
    ttl_seconds: int = 300,
) -> Approval:
    approval = Approval(
        tool=tool,
        action=action,
        binding_hash=action_binding(tool, action, arguments),
        requested_by=requested_by,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
    )
    db.add(approval)
    db.flush()
    return approval
