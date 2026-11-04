import logging
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger(__name__)

class LokiService:
    def __init__(self, base_url: str = settings.LOKI_URL):
        self.base_url = base_url.rstrip("/")

    def query_logs(self, logql: str = '{job="windows_event_logs"}', limit: int = 100) -> List[Dict[str, Any]]:
        """Queries log streams from Loki using LogQL."""
        try:
            url = f"{self.base_url}/loki/api/v1/query_range"
            resp = requests.get(url, params={"query": logql, "limit": limit}, timeout=8)
            if resp.status_code == 200:
                data = resp.json().get("data", {}).get("result", [])
                entries = []
                for stream in data:
                    labels = stream.get("stream", {})
                    for val in stream.get("values", []):
                        # val[0] is nanosecond timestamp string, val[1] is log message line
                        ts_ns = int(val[0])
                        ts_dt = datetime.fromtimestamp(ts_ns / 1e9, tz=timezone.utc).isoformat()
                        entries.append({
                            "timestamp": ts_dt,
                            "channel": labels.get("channel", "Unknown"),
                            "level": labels.get("level", "info"),
                            "provider": labels.get("provider", "Unknown"),
                            "event_id": labels.get("event_id", "0"),
                            "message": val[1]
                        })
                # Sort descending by timestamp
                entries.sort(key=lambda x: x["timestamp"], reverse=True)
                return entries[:limit]
        except Exception as e:
            logger.error(f"Loki query error ({logql}): {e}")
        return []

    def check_health(self) -> bool:
        """Returns True if Loki is ready."""
        try:
            resp = requests.get(f"{self.base_url}/loki/api/v1/labels", timeout=1.5)
            return resp.status_code == 200
        except Exception:
            return False

loki_service = LokiService()
