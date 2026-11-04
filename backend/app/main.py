import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database.session import init_db
from app.api import system, alerts, ai, remediation, reports
from app.services.prometheus_service import prometheus_service
from app.services.loki_service import loki_service
from app.collectors.eventlog_collector import fetch_recent_windows_events, push_to_loki

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aiops_backend")

scheduler = BackgroundScheduler()

def scheduled_log_sync():
    """Periodically fetches and ships new Windows Event Logs to Loki."""
    try:
        events = fetch_recent_windows_events(minutes=2, max_events=20)
        if events:
            push_to_loki(events)
    except Exception as e:
        logger.error(f"Background log sync error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and background scheduler
    logger.info("Starting Windows AIOps Backend Application...")
    init_db()

    scheduler.add_job(scheduled_log_sync, 'interval', seconds=30, id='windows_eventlog_sync')
    scheduler.start()
    logger.info("Background telemetry synchronizer started.")

    yield

    # Shutdown
    logger.info("Shutting down AIOps Backend...")
    scheduler.shutdown(wait=False)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(system.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(ai.router, prefix=settings.API_PREFIX)
app.include_router(remediation.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    """System health check reporting status of all subcomponents."""
    prom_healthy = prometheus_service.check_health()
    loki_healthy = loki_service.check_health()
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "services": {
            "prometheus": "online" if prom_healthy else "offline",
            "loki": "online" if loki_healthy else "offline",
            "backend_api": "online"
        }
    }

@app.get("/api/health/metrics")
def backend_metrics():
    """Prometheus scrape endpoint for backend health."""
    return "# HELP aiops_backend_up Status of AIOps FastAPI backend\n# TYPE aiops_backend_up gauge\naiops_backend_up 1\n"
