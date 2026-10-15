from sqlalchemy.orm import Session

from ..models import AuditEvent


def record_event(
    db: Session,
    *,
    request_id: str,
    event_type: str,
    outcome: str,
    detail: str,
    actor: str = "local-demo",
) -> AuditEvent:
    event = AuditEvent(
        event_type=event_type,
        actor=actor,
        outcome=outcome,
        detail=f"{detail} [request_id={request_id}]",
    )
    db.add(event)
    db.flush()
    return event
