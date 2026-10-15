from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Approval, AuditEvent, EvaluationRun, Policy, Threat

router = APIRouter(prefix="/api", tags=["monitoring"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict[str, int]:
    def count(model: type) -> int:
        return int(db.scalar(select(func.count()).select_from(model)) or 0)

    return {
        "actions_total": int(
            db.scalar(select(func.count()).select_from(AuditEvent).where(AuditEvent.event_type == "action")) or 0
        ),
        "actions_blocked": int(
            db.scalar(
                select(func.count()).select_from(AuditEvent).where(
                    AuditEvent.event_type == "action", AuditEvent.outcome == "blocked"
                )
            )
            or 0
        ),
        "threats_total": count(Threat),
        "active_policies": int(
            db.scalar(select(func.count()).select_from(Policy).where(Policy.active.is_(True))) or 0
        ),
        "pending_approvals": int(
            db.scalar(
                select(func.count()).select_from(Approval).where(Approval.status == "pending")
            )
            or 0
        ),
        "evaluations_total": count(EvaluationRun),
    }


@router.get("/threats")
def list_threats(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    search: str = "",
    db: Session = Depends(get_db),
) -> list[dict]:
    bounded_limit = min(max(limit, 1), 500)
    statement = select(Threat)
    if search:
        statement = statement.where(Threat.description.ilike(f"%{search[:120]}%"))
    rows = db.scalars(
        statement.order_by(Threat.id.desc()).offset(offset).limit(bounded_limit)
    )
    return [
        {
            "id": row.id,
            "category": row.category,
            "severity": row.severity,
            "description": row.description,
            "source": row.source,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.get("/audit")
def list_audit(limit: int = 100, db: Session = Depends(get_db)) -> list[dict]:
    bounded_limit = min(max(limit, 1), 500)
    rows = db.scalars(select(AuditEvent).order_by(AuditEvent.id.desc()).limit(bounded_limit))
    return [
        {
            "id": row.id,
            "event_type": row.event_type,
            "actor": row.actor,
            "outcome": row.outcome,
            "detail": row.detail,
            "created_at": row.created_at,
        }
        for row in rows
    ]
