from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditEvent, Threat
from ..schemas import ScanRequest, ScanResponse
from ..services.scanner import scan_action

router = APIRouter(prefix="/api/scans", tags=["scanning"])


@router.post("", response_model=ScanResponse)
def scan(request: ScanRequest, db: Session = Depends(get_db)) -> ScanResponse:
    result = scan_action(request.tool, request.action, request.arguments)
    db.add(
        AuditEvent(
            event_type="scan",
            outcome="flagged" if result["flagged"] else "clear",
            detail=f"{request.tool}.{request.action}",
        )
    )
    for finding in result["findings"]:
        db.add(Threat(category="scanner_finding", severity=result["risk_level"], description=finding))
    db.commit()
    return ScanResponse(**result)
