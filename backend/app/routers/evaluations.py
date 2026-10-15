import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import EvaluationRun
from ..schemas import EvaluationRequest, EvaluationResponse
from ..services.policy_engine import evaluate_policy
from ..services.scanner import scan_action
from ..services.tools import ToolError, run_simulated_tool, validate_simulated_tool

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.get("", response_model=list[EvaluationResponse])
def list_evaluations(db: Session = Depends(get_db)) -> list[dict]:
    return [_serialize(run) for run in db.scalars(select(EvaluationRun).order_by(EvaluationRun.id.desc()))]


@router.post("", response_model=EvaluationResponse, status_code=201)
def evaluate(request: EvaluationRequest, db: Session = Depends(get_db)) -> dict:
    tp = fp = tn = fn = 0
    results: list[dict] = []
    for sample in request.samples:
        scan = scan_action(sample.tool, sample.action, sample.arguments)
        policy_allowed, requires_approval, policy_reason = evaluate_policy(db, sample.tool, sample.action)
        try:
            validate_simulated_tool(sample.tool, sample.action, sample.arguments)
            known_action = True
        except ToolError:
            known_action = False
        predicted_blocked = scan["flagged"] or not policy_allowed or requires_approval or not known_action
        if not predicted_blocked:
            run_simulated_tool(sample.tool, sample.action, sample.arguments)
        if predicted_blocked and sample.expected_blocked:
            tp += 1
        elif predicted_blocked:
            fp += 1
        elif sample.expected_blocked:
            fn += 1
        else:
            tn += 1
        results.append(
            {
                "tool": sample.tool,
                "action": sample.action,
                "expected_blocked": sample.expected_blocked,
                "predicted_blocked": predicted_blocked,
                "reason": (
                    "Scanner flagged request"
                    if scan["flagged"]
                    else policy_reason
                    if not policy_allowed
                    else "Action requires approval"
                    if requires_approval
                    else "Unknown simulated action"
                    if not known_action
                    else "Permitted by policy"
                ),
            }
        )

    total = len(results)
    run = EvaluationRun(
        samples=total,
        true_positives=tp,
        false_positives=fp,
        true_negatives=tn,
        false_negatives=fn,
        accuracy=(tp + tn) / total,
        precision=tp / (tp + fp) if tp + fp else 0.0,
        recall=tp / (tp + fn) if tp + fn else 0.0,
        results_json=json.dumps(results, separators=(",", ":")),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _serialize(run)


def _serialize(run: EvaluationRun) -> dict:
    return {
        "id": run.id,
        "samples": run.samples,
        "true_positives": run.true_positives,
        "false_positives": run.false_positives,
        "true_negatives": run.true_negatives,
        "false_negatives": run.false_negatives,
        "accuracy": run.accuracy,
        "precision": run.precision,
        "recall": run.recall,
        "results": json.loads(run.results_json),
        "created_at": run.created_at,
    }
