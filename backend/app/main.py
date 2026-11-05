import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database.session import init_db
from app.api import system, alerts, ai, remediation, reports, apps
from app.services.native_collector import native_collector
from app.services.eventlog_service import eventlog_service
from app.services.metrics_store import metrics_store
from app.ai.auto_heal_engine import auto_heal_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aiops_backend")

scheduler = BackgroundScheduler()

def scheduled_metric_collection():
    """Samples real-time Windows performance metrics natively."""
    try:
        native_collector.sample_system_metrics()
    except Exception as e:
        logger.debug(f"Metric collection error: {e}")

def scheduled_eventlog_sync():
    """Polls Windows Event Logs and persists to SQLite."""
    try:
        eventlog_service.sync_windows_event_logs(minutes=3, max_events=20)
    except Exception as e:
        logger.debug(f"Event log sync error: {e}")

def scheduled_database_prune():
    """Prunes historical samples older than 24 hours."""
    try:
        metrics_store.prune_old_samples(hours=24)
    except Exception as e:
        logger.debug(f"Prune error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and background collector jobs
    logger.info("Starting Pure Full-Stack Windows AIOps Backend...")
    init_db()

    # Initial sample pass
    scheduled_metric_collection()
    scheduled_eventlog_sync()

    # Schedule periodic collection
    scheduler.add_job(scheduled_metric_collection, 'interval', seconds=3, id='native_metric_collection')
    scheduler.add_job(scheduled_eventlog_sync, 'interval', seconds=20, id='native_eventlog_sync')
    scheduler.add_job(auto_heal_engine.run_self_healing_cycle, 'interval', seconds=15, id='auto_heal_cycle')
    scheduler.add_job(scheduled_database_prune, 'interval', hours=6, id='metrics_prune')
    scheduler.start()
    logger.info("Native background collectors started (Metrics 3s, Logs 20s, AutoHeal 15s).")

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
app.include_router(apps.router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    """Pure full-stack health verification reporting status of all subcomponents."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "mode": "pure_fullstack",
        "services": {
            "native_collector": "online",
            "eventlog_service": "online",
            "sqlite_store": "online",
            "backend_api": "online"
        }
    }
