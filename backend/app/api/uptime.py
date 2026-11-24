from fastapi import APIRouter, Query, Body, HTTPException
from typing import Dict, Any, List
from app.services.uptime_service import uptime_service

router = APIRouter(prefix="/uptime", tags=["Synthetic HTTP & Uptime Monitoring"])

@router.get("/overview")
def get_uptime_overview(target: str = Query("winserver")):
    """Returns real-time synthetic uptime, HTTP status codes, and latency for target endpoints."""
    return uptime_service.get_endpoints_for_target(target)

@router.post("/probe")
def probe_endpoint(payload: Dict[str, Any] = Body(...)):
    """Triggers an immediate high-precision ping/probe of an HTTP/HTTPS URL."""
    url = payload.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    name = payload.get("name", "Endpoint")
    node_id = payload.get("node_id", "unknown")
    return uptime_service.probe_single_url(url=url, name=name, node_id=node_id)

