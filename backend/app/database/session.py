import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.models import Base

logger = logging.getLogger(__name__)

sqlite_url = settings.DATABASE_URL
if not sqlite_url.startswith("sqlite"):
    sqlite_url = settings.SQLITE_URL

engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False}
)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger.info(f"Initialized database engine and schemas: {sqlite_url}")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_session():
    return SessionLocal()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
