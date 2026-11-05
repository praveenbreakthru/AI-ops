import time
import logging
from collections import deque
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.session import get_db, SessionLocal
from app.database.models import MetricSample

logger = logging.getLogger(__name__)

class MetricsStore:
    def __init__(self, max_memory_points: int = 1200):
        # In-memory fast ring buffer: key is (metric_name, label) -> deque of (timestamp, value)
        self.max_memory_points = max_memory_points
        self._buffers: Dict[str, deque] = {}
        self._last_values: Dict[str, float] = {}

    def _get_key(self, metric_name: str, label: Optional[str] = None) -> str:
        return f"{metric_name}:{label or ''}"

    def record_sample(self, metric_name: str, value: float, label: Optional[str] = None, timestamp: Optional[float] = None):
        """Records a metric sample both in memory and periodically to database."""
        now = timestamp or time.time()
        key = self._get_key(metric_name, label)

        if key not in self._buffers:
            self._buffers[key] = deque(maxlen=self.max_memory_points)

        self._buffers[key].append((now, float(value)))
        self._last_values[key] = float(value)

    def record_samples_batch(self, samples: List[Tuple[str, float, Optional[str]]]):
        """Records multiple metric samples in a batch."""
        now = time.time()
        for name, val, label in samples:
            self.record_sample(name, val, label, timestamp=now)

        # Batch insert to DB asynchronously / quietly
        try:
            if SessionLocal:
                with SessionLocal() as db:
                    db_records = [
                        MetricSample(metric_name=name, value=float(val), label=label, timestamp=now)
                        for name, val, label in samples
                    ]
                    db.bulk_save_objects(db_records)
                    db.commit()
        except Exception as e:
            logger.debug(f"DB metric write batch error: {e}")

    def get_current(self, metric_name: str, label: Optional[str] = None, default: float = 0.0) -> float:
        """Returns the most recent scalar value of a metric."""
        key = self._get_key(metric_name, label)
        return self._last_values.get(key, default)

    def get_history(self, metric_name: str, minutes: int = 30, label: Optional[str] = None) -> List[Tuple[float, float]]:
        """Returns historical (timestamp, value) pairs within the last N minutes."""
        key = self._get_key(metric_name, label)
        cutoff = time.time() - (minutes * 60)

        # Check in-memory ring buffer first
        if key in self._buffers and len(self._buffers[key]) > 0:
            history = [(ts, val) for ts, val in self._buffers[key] if ts >= cutoff]
            if len(history) >= 2:
                return history

        # Fallback to database
        try:
            if SessionLocal:
                with SessionLocal() as db:
                    q = db.query(MetricSample).filter(
                        MetricSample.metric_name == metric_name,
                        MetricSample.timestamp >= cutoff
                    )
                    if label:
                        q = q.filter(MetricSample.label == label)
                    records = q.order_by(MetricSample.timestamp.asc()).all()
                    return [(r.timestamp, r.value) for r in records]
        except Exception as e:
            logger.error(f"Error reading metric history: {e}")
        return []

    def get_range(self, metric_name: str, start_time: float, end_time: float, label: Optional[str] = None) -> List[Tuple[float, float]]:
        """Returns historical pairs between start_time and end_time."""
        key = self._get_key(metric_name, label)
        if key in self._buffers and len(self._buffers[key]) > 0:
            history = [(ts, val) for ts, val in self._buffers[key] if start_time <= ts <= end_time]
            if len(history) >= 2:
                return history

        try:
            if SessionLocal:
                with SessionLocal() as db:
                    q = db.query(MetricSample).filter(
                        MetricSample.metric_name == metric_name,
                        MetricSample.timestamp >= start_time,
                        MetricSample.timestamp <= end_time
                    )
                    if label:
                        q = q.filter(MetricSample.label == label)
                    records = q.order_by(MetricSample.timestamp.asc()).all()
                    return [(r.timestamp, r.value) for r in records]
        except Exception:
            pass
        return []

    def prune_old_samples(self, hours: int = 24):
        """Purges samples older than specified hours to keep SQLite database lean."""
        cutoff = time.time() - (hours * 3600)
        try:
            if SessionLocal:
                with SessionLocal() as db:
                    deleted = db.query(MetricSample).filter(MetricSample.timestamp < cutoff).delete()
                    db.commit()
                    if deleted > 0:
                        logger.info(f"Pruned {deleted} old metric samples from SQLite.")
        except Exception as e:
            logger.warning(f"Error pruning metric samples: {e}")

metrics_store = MetricsStore()

