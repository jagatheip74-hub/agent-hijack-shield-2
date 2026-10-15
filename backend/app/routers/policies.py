from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditEvent, Policy
from ..schemas import PolicyCreate, PolicyRead, PolicyUpdate

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get("", response_model=list[PolicyRead])
def list_policies(db: Session = Depends(get_db)) -> list[Policy]:
    return list(db.scalars(select(Policy).order_by(Policy.id)))


@router.post("", response_model=PolicyRead, status_code=status.HTTP_201_CREATED)
def create_policy(request: PolicyCreate, db: Session = Depends(get_db)) -> Policy:
    policy = Policy(**request.model_dump())
    db.add(policy)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Policy name already exists") from None
    db.refresh(policy)
    db.add(AuditEvent(event_type="policy_created", outcome="created", detail=policy.name))
    db.commit()
    return policy


@router.patch("/{policy_id}", response_model=PolicyRead)
def update_policy(policy_id: int, request: PolicyUpdate, db: Session = Depends(get_db)) -> Policy:
    policy = db.get(Policy, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    try:
        policy.active = request.selected_active()
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    db.add(AuditEvent(event_type="policy_updated", outcome="updated", detail=policy.name))
    db.commit()
    db.refresh(policy)
    return policy
