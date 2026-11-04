import requests
from fastapi import APIRouter, Request, Depends
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import get_db
from app.database.models import Incident
from app.models.schemas import IncidentOut

router = APIRouter(tags=["Alerts & Incidents"])

@router.get("/alerts")
def get_active_alerts(db: Session = Depends(get_db)):
    """Queries active firing alerts natively from the local database."""
    incidents = db.query(Incident).filter(Incident.status == "firing").all()
    return [
        {
            "labels": {
                "alertname": inc.alert_name,
                "severity": inc.severity,
                "instance": inc.instance or "windows-laptop"
            },
            "annotations": {
                "summary": inc.summary,
                "description": inc.description or ""
            },
            "status": {
                "state": "active"
            },
            "startsAt": inc.starts_at.isoformat() if inc.starts_at else None
        }
        for inc in incidents
    ]

@router.get("/incidents", response_model=List[IncidentOut])
def get_incidents(db: Session = Depends(get_db)):
    """Returns stored incidents with historical correlation and resolution."""
    return db.query(Incident).order_by(Incident.starts_at.desc()).limit(50).all()

@router.post("/alerts/webhook")
async def receive_alertmanager_webhook(request: Request, db: Session = Depends(get_db)):
    """Webhook endpoint invoked by Alertmanager for automated alert ingestion."""
    payload = await request.json()
    alerts = payload.get("alerts", [])
    for a in alerts:
        status = a.get("status", "firing")
        labels = a.get("labels", {})
        annotations = a.get("annotations", {})
        alert_name = labels.get("alertname", "UnknownAlert")
        severity = labels.get("severity", "warning")
        summary = annotations.get("summary", alert_name)
        description = annotations.get("description", "")

        # Check existing firing incident for deduplication
        existing = db.query(Incident).filter(
            Incident.alert_name == alert_name,
            Incident.status == "firing"
        ).first()

        if existing:
            if status == "resolved":
                existing.status = "resolved"
                from datetime import datetime, timezone
                existing.resolved_at = datetime.now(timezone.utc)
            else:
                existing.description = description
            db.commit()
        elif status == "firing":
            incident = Incident(
                alert_name=alert_name,
                severity=severity,
                status="firing",
                summary=summary,
                description=description,
                metadata_json=labels
            )
            db.add(incident)
            db.commit()

    return {"status": "processed", "count": len(alerts)}

