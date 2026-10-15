from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Approval, AuditEvent
from ..schemas import ApprovalAuthorize, ApprovalCreate, ApprovalRead
from ..services.approval_service import create_pending_approval
from ..services.policy_engine import evaluate_policy
from ..services.scanner import scan_action
from ..services.tools import ToolError, validate_simulated_tool

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


@router.get("", response_model=list[ApprovalRead])
def list_approvals(db: Session = Depends(get_db)) -> list[Approval]:
    return list(db.scalars(select(Approval).order_by(Approval.id.desc())))


@router.post("", response_model=ApprovalRead, status_code=status.HTTP_201_CREATED)
def request_approval(request: ApprovalCreate, db: Session = Depends(get_db)) -> Approval:
    allowed, requires_approval, reason = evaluate_policy(db, request.tool, request.action)
    if not allowed or not requires_approval:
        raise HTTPException(status_code=403, detail=reason if not allowed else "Policy does not require approval")
    if scan_action(request.tool, request.action, request.arguments)["flagged"]:
        raise HTTPException(status_code=403, detail="Scanner flagged a high-risk request")
    try:
        validate_simulated_tool(request.tool, request.action, request.arguments)
    except ToolError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    approval = create_pending_approval(
        db,
        tool=request.tool,
        action=request.action,
        arguments=request.arguments,
        requested_by=request.requested_by,
        ttl_seconds=request.ttl_seconds,
    )
    db.add(AuditEvent(event_type="approval_requested", actor=request.requested_by, outcome="pending", detail=str(approval.id)))
    db.commit()
    db.refresh(approval)
    return approval


@router.post("/{approval_id}/authorize", response_model=ApprovalRead)
def authorize_approval(
    approval_id: int, request: ApprovalAuthorize, db: Session = Depends(get_db)
) -> Approval:
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=409, detail="Approval is not pending")
    if _aware(approval.expires_at) <= datetime.now(timezone.utc):
        approval.status = "expired"
        db.add(AuditEvent(event_type="approval_expired", actor=request.authorized_by, outcome="expired", detail=str(approval.id)))
        db.commit()
        raise HTTPException(status_code=410, detail="Approval has expired")
    if request.authorized_by == approval.requested_by:
        raise HTTPException(status_code=403, detail="A different local actor must authorize this request")
    allowed, requires_approval, reason = evaluate_policy(db, approval.tool, approval.action)
    if not allowed or not requires_approval:
        raise HTTPException(status_code=403, detail=reason if not allowed else "Approval policy is no longer active")
    approval.authorized_by = request.authorized_by
    approval.status = "authorized"
    db.add(AuditEvent(event_type="approval_authorized", actor=request.authorized_by, outcome="authorized", detail=str(approval.id)))
    db.commit()
    db.refresh(approval)
    return approval
