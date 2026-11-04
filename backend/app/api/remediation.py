from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.ai.remediation_service import remediation_service
from app.models.schemas import RemediationActionRequest, RemediationActionOut

router = APIRouter(prefix="/remediation", tags=["Controlled Remediation"])

@router.get("/audit")
def get_remediation_audit():
    """Returns the history of all requested and executed remediation actions."""
    return remediation_service.action_history

@router.post("/actions")
def request_remediation_action(req: RemediationActionRequest):
    """Submits a requested remediation action under approval policy."""
    return remediation_service.request_action(
        action_type=req.action_type,
        target=req.target,
        reason=req.reason
    )

@router.post("/approve/{action_id}")
def approve_action(action_id: int):
    """Explicitly approves and executes an action with audit logging."""
    result = remediation_service.approve_and_execute(action_id=action_id, approved_by="admin_operator")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
