from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Approval, AuditEvent, Threat
from ..schemas import ActionRequest, ActionResponse
from ..services.approval_binding import action_binding
from ..services.output_guard import guard_output
from ..services.policy_engine import evaluate_policy
from ..services.scanner import scan_action
from ..services.tools import ToolError, run_simulated_tool

router = APIRouter(prefix="/api/actions", tags=["actions"])


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


@router.post("/execute", response_model=ActionResponse)
def execute_action(request: ActionRequest, db: Session = Depends(get_db)) -> ActionResponse:
    scan = scan_action(request.tool, request.action, request.arguments)
    policy_allowed, requires_approval, policy_reason = evaluate_policy(db, request.tool, request.action)
    reason = ""
    approval: Approval | None = None

    if scan["flagged"]:
        reason = "Scanner flagged a high-risk request"
    elif not policy_allowed:
        reason = policy_reason
    elif requires_approval:
        approval = db.get(Approval, request.approval_id) if request.approval_id is not None else None
        if approval is None:
            reason = "A separately authorized approval is required"
        elif approval.status != "authorized":
            reason = "Approval is not authorized"
        elif _aware(approval.expires_at) <= datetime.now(timezone.utc):
            approval.status = "expired"
            reason = "Approval has expired"
        elif approval.tool != request.tool or approval.action != request.action:
            reason = "Approval is bound to a different tool/action"
        elif approval.binding_hash != action_binding(request.tool, request.action, request.arguments):
            reason = "Approval is bound to different arguments"
        elif request.actor != approval.authorized_by or request.actor == approval.requested_by:
            reason = "Execution actor does not satisfy the second-authorization check"

    result = None
    outcome = "blocked"
    if not reason:
        try:
            result = guard_output(run_simulated_tool(request.tool, request.action, request.arguments))
            outcome = "executed"
            reason = "Executed by local simulated tool"
            if approval is not None:
                approval.status = "consumed"
        except ToolError as error:
            reason = str(error)

    db.add(
        AuditEvent(
            event_type="action",
            actor=request.actor,
            outcome=outcome,
            detail=f"{request.tool}.{request.action}: {reason}"
            + (f" [request_id={request.request_id}]" if request.request_id else ""),
        )
    )
    if outcome == "blocked":
        db.add(Threat(category="blocked_action", severity=scan["risk_level"], description=reason, source="policy_engine"))
    db.commit()
    return ActionResponse(
        allowed=outcome == "executed",
        outcome=outcome,
        result=result,
        reason=reason,
        risk_level=scan["risk_level"],
    )
