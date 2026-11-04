import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database.models import Base

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None

def get_engine():
    global engine
    if engine is not None:
        return engine

    try:
        # Attempt PostgreSQL connection
        pg_engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            connect_args={"connect_timeout": 3}
        )
        with pg_engine.connect() as conn:
            logger.info("Successfully connected to PostgreSQL at port 5433.")
        engine = pg_engine
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to SQLite.")
        sqlite_engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )
        engine = sqlite_engine

    return engine

def init_db():
    global SessionLocal
    eng = get_engine()
    Base.metadata.create_all(bind=eng)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    logger.info("Database schemas initialized.")

def get_db():
    if SessionLocal is None:
        init_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
