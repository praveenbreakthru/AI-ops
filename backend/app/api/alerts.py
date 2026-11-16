from fastapi import APIRouter, Request, Depends, Query
from typing import List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import get_db
from app.database.models import Incident
from app.models.schemas import IncidentOut
from app.services.linux_service import linux_service
from app.services.docker_service import docker_service
from app.services.k8s_service import k8s_service

router = APIRouter(tags=["Alerts & Incidents"])

@router.get("/alerts")
def get_active_alerts(target: str = Query("local"), db: Session = Depends(get_db)):
    """Queries active firing alerts for the selected node (local Windows or remote Linux)."""
    alerts = []

    if target == "linux":
        # 1. Check Linux Docker Container failures
        try:
            containers = linux_service.get_docker_containers()
            for c in containers:
                if c.get("is_crashed") or "restarting" in c.get("status", "").lower():
                    alerts.append({
                        "labels": {
                            "alertname": f"DockerContainerCrashed_{c['name']}",
                            "severity": "critical",
                            "instance": f"btubuntu ({settings.LINUX_SERVER_HOST})",
                            "target": "linux"
                        },
                        "annotations": {
                            "summary": f"Container {c['name']} is crashing / restarting",
                            "description": f"Container '{c['name']}' ({c['id']}) entered continuous failure state on Linux server: {c['status']}."
                        },
                        "status": {"state": "active"},
                        "startsAt": datetime.now(timezone.utc).isoformat()
                    })
        except Exception:
            pass

        # 2. Check Linux k3s Pod failures
        try:
            pods = linux_service.get_k8s_pods()
            for p in pods:
                if p.get("is_crashing"):
                    alerts.append({
                        "labels": {
                            "alertname": f"K8sPodFailure_{p['name']}",
                            "severity": "critical",
                            "instance": f"btubuntu ({settings.LINUX_SERVER_HOST})",
                            "target": "linux"
                        },
                        "annotations": {
                            "summary": f"Pod {p['name']} is in {p['status']}",
                            "description": f"Pod {p['name']} in namespace {p['namespace']} is failing with status {p['status']} ({p['restarts']} restarts)."
                        },
                        "status": {"state": "active"},
                        "startsAt": datetime.now(timezone.utc).isoformat()
                    })
        except Exception:
            pass

        # 3. Check Linux Resource Saturation
        try:
            overview = linux_service.get_overview()
            if overview.memory_utilization_percent > 85.0:
                alerts.append({
                    "labels": {
                        "alertname": "LinuxHighMemoryPressure",
                        "severity": "warning",
                        "instance": f"btubuntu ({settings.LINUX_SERVER_HOST})",
                        "target": "linux"
                    },
                    "annotations": {
                        "summary": f"High Memory Utilization ({overview.memory_utilization_percent}%)",
                        "description": f"Linux server RAM is at {overview.memory_utilization_percent}% ({overview.memory_used_gb} GB of {overview.memory_total_gb} GB used)."
                    },
                    "status": {"state": "active"},
                    "startsAt": datetime.now(timezone.utc).isoformat()
                })
        except Exception:
            pass

        # 4. Check Linux Dynamic Discoveries
        try:
            from app.services.discovery_service import discovery_service
            disc_items = discovery_service.get_discovered_items(target="linux")
            for d in disc_items[:3]:
                safe_name = "".join(ch for ch in d['name'] if ch.isalnum() or ch in ['_', '-'])[:30]
                alerts.append({
                    "labels": {
                        "alertname": f"NewWorkloadDiscovered_{safe_name}",
                        "severity": "info",
                        "instance": d["node_name"],
                        "target": "linux"
                    },
                    "annotations": {
                        "summary": f"✨ New Workload Discovered: {d['name']}",
                        "description": f"Dynamic Engine auto-discovered {d['type']} '{d['name']}' ({d['details']})."
                    },
                    "status": {"state": "active"},
                    "startsAt": d.get("discovered_at", datetime.now(timezone.utc).isoformat())
                })
        except Exception:
            pass

        return alerts

    # Local Node Alerts
    incidents = db.query(Incident).filter(Incident.status == "firing").all()
    for inc in incidents:
        alerts.append({
            "labels": {
                "alertname": inc.alert_name,
                "severity": inc.severity,
                "instance": inc.instance or "windows-laptop",
                "target": "local"
            },
            "annotations": {
                "summary": inc.summary,
                "description": inc.description or ""
            },
            "status": {
                "state": "active"
            },
            "startsAt": inc.starts_at.isoformat() if inc.starts_at else None
        })

    # Check local docker crashed containers
    try:
        local_containers = docker_service.get_containers(all=True)
        for c in local_containers:
            if c.get("is_crashed") or "restarting" in c.get("status", "").lower():
                alerts.append({
                    "labels": {
                        "alertname": f"DockerContainerCrashed_{c['name']}",
                        "severity": "critical",
                        "instance": "local-windows-laptop",
                        "target": "local"
                    },
                    "annotations": {
                        "summary": f"Container {c['name']} is stopped with error",
                        "description": f"Container '{c['name']}' exited with code {c.get('exit_code', 1)} on local Windows laptop."
                    },
                    "status": {"state": "active"},
                    "startsAt": datetime.now(timezone.utc).isoformat()
                })
    except Exception:
        pass

    # Append local dynamic discoveries as informational alerts
    try:
        from app.services.discovery_service import discovery_service
        disc_items = discovery_service.get_discovered_items(target="local")
        for d in disc_items[:3]:
            safe_name = "".join(ch for ch in d['name'] if ch.isalnum() or ch in ['_', '-'])[:30]
            alerts.append({
                "labels": {
                    "alertname": f"NewWorkloadDiscovered_{safe_name}",
                    "severity": "info",
                    "instance": d["node_name"],
                    "target": "local"
                },
                "annotations": {
                    "summary": f"✨ New Workload Discovered: {d['name']}",
                    "description": f"Dynamic Engine auto-discovered {d['type']} '{d['name']}' ({d['details']})."
                },
                "status": {"state": "active"},
                "startsAt": d.get("discovered_at", datetime.now(timezone.utc).isoformat())
            })
    except Exception:
        pass

    return alerts

@router.get("/incidents", response_model=List[IncidentOut])
def get_incidents(target: str = Query("local"), db: Session = Depends(get_db)):
    """Returns stored and live correlated incidents for the selected node."""
    if target == "linux":
        # Check if live incident should be returned for Linux
        incidents = db.query(Incident).filter(Incident.instance.like("%linux%") | Incident.instance.like("%btubuntu%")).order_by(Incident.starts_at.desc()).limit(50).all()
        # If no stored incidents yet for Linux, synthesize from live status
        if not incidents:
            live_alerts = get_active_alerts(target="linux", db=db)
            synthetic = []
            for idx, a in enumerate(live_alerts):
                synthetic.append(IncidentOut(
                    id=9000 + idx,
                    alert_name=a["labels"]["alertname"],
                    severity=a["labels"]["severity"],
                    status="firing",
                    instance=a["labels"]["instance"],
                    summary=a["annotations"]["summary"],
                    description=a["annotations"]["description"],
                    root_cause="Automated SSH telemetry detected process exit or resource saturation on Linux node.",
                    recommendations="Execute automated 1-click self-healing container restart via Apps & Containers control center.",
                    starts_at=datetime.now(timezone.utc),
                    resolved_at=None,
                    updated_at=datetime.now(timezone.utc)
                ))
            return synthetic
        return incidents

    return db.query(Incident).filter(~Incident.instance.like("%linux%")).order_by(Incident.starts_at.desc()).limit(50).all()


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

