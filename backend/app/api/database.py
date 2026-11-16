import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.services.database_service import database_service

logger = logging.getLogger("api_database")

router = APIRouter(prefix="/database", tags=["Database Intelligence & Query Profiling"])

class TerminateQueryRequest(BaseModel):
    query_pid: int
    engine: str = "PostgreSQL Server"
    target: str = "winserver"

@router.get("/overview")
def get_database_overview(target: str = Query("winserver", description="Target server: winserver, linux, or local")) -> Dict[str, Any]:
    """
    Returns high-level vitals for database engines running on target host:
    PostgreSQL 18, Microsoft SQL Server (MSSQLSERVER), MariaDB, or SQLite.
    Includes active connection saturation, buffer hit ratio, and memory footprint.
    """
    try:
        return database_service.get_database_overview(target)
    except Exception as e:
        logger.error(f"Error fetching database overview for {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queries")
def get_database_queries(
    target: str = Query("winserver", description="Target server"),
    slow_only: bool = Query(False, description="Filter only slow queries (>500ms)")
) -> List[Dict[str, Any]]:
    """
    Returns running queries with SQL statement text, duration, database, client IP,
    and AI-assisted query tuning recommendations.
    """
    try:
        return database_service.get_queries(target, slow_only)
    except Exception as e:
        logger.error(f"Error fetching database queries for {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables")
def get_database_tables(target: str = Query("winserver", description="Target server")) -> List[Dict[str, Any]]:
    """
    Returns storage size and row count leaderboard for top tables across databases.
    """
    try:
        return database_service.get_tables(target)
    except Exception as e:
        logger.error(f"Error fetching database tables for {target}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/terminate")
def terminate_query(req: TerminateQueryRequest) -> Dict[str, Any]:
    """
    Kills or cancels a runaway or blocking query process on the target database engine.
    """
    try:
        result = database_service.terminate_query(
            query_pid=req.query_pid,
            engine=req.engine,
            target=req.target
        )
        return result
    except Exception as e:
        logger.error(f"Error terminating query {req.query_pid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

