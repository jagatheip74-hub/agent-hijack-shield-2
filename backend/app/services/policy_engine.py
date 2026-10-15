from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Policy


def seed_demo_policies(db: Session) -> None:
    """Add local synthetic demo rules when absent without changing team-defined rules."""
    defaults = (
        ("Allow public sample report", "public_report_reader", "read_report", True, False),
        ("Allow explicitly permitted public synthetic record", "demo_database_reader", "read_record", True, False),
        ("Require approval for simulated message", "demo_email_sender", "send_message", True, True),
        ("Deny unimplemented demo file writer", "demo_file_writer", "write_file", False, True),
    )
    existing = set(db.scalars(select(Policy.name)))
    for name, tool, action, allowed, requires_approval in defaults:
        if name not in existing:
            db.add(
                Policy(
                    name=name,
                    tool=tool,
                    action=action,
                    allowed=allowed,
                    requires_approval=requires_approval,
                    active=True,
                )
            )
    if any(name not in existing for name, *_ in defaults):
        db.commit()


def evaluate_policy(db: Session, tool: str, action: str) -> tuple[bool, bool, str]:
    """Default-deny policy check, deliberately independent from scanner output."""
    matches = list(
        db.scalars(
            select(Policy).where(
                Policy.tool == tool,
                Policy.action == action,
                Policy.active.is_(True),
            )
        )
    )
    if not matches:
        return False, False, "No active policy explicitly allows this tool/action"
    if any(not policy.allowed for policy in matches):
        return False, False, "An active matching policy denies this tool/action"
    return True, any(policy.requires_approval for policy in matches), "Allowed by active policy"
