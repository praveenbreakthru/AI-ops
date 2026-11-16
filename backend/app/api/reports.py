import os
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any
from app.reports.report_service import report_service, REPORTS_DIR

router = APIRouter(prefix="/reports", tags=["Reports & Historical Export"])

@router.get("")
def list_reports():
    """Lists generated PDF and CSV report files."""
    files = []
    if REPORTS_DIR.exists():
        for f in REPORTS_DIR.glob("*.*"):
            files.append({
                "filename": f.name,
                "size_bytes": f.stat().st_size,
                "modified": f.stat().st_mtime
            })
    return files

@router.post("/generate")
def generate_report(report_type: str = Query("daily", pattern="^(daily|weekly|monthly)$")):
    """Generates a new system performance report."""
    return report_service.generate_report(report_type=report_type)

@router.get("/download/{filename}")
def download_report(filename: str):
    """Downloads a CSV or PDF report."""
    target_path = REPORTS_DIR / filename
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Report file not found.")
    media_type = "application/pdf" if filename.endswith(".pdf") else "text/csv"
    return FileResponse(path=str(target_path), filename=filename, media_type=media_type)
