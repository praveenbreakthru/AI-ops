import logging
import requests
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class PrometheusService:
    def __init__(self, base_url: str = settings.PROMETHEUS_URL):
        self.base_url = base_url.rstrip("/")

    def query(self, promql: str) -> Optional[List[Dict[str, Any]]]:
        """Executes an instant PromQL query."""
        try:
            url = f"{self.base_url}/api/v1/query"
            resp = requests.get(url, params={"query": promql}, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return data.get("data", {}).get("result", [])
            logger.warning(f"Prometheus query failed: {promql} -> Status {resp.status_code}")
        except Exception as e:
            logger.error(f"Prometheus query error ({promql}): {e}")
        return None

    def query_scalar(self, promql: str, default: float = 0.0) -> float:
        """Executes a PromQL query expecting a single scalar float result."""
        results = self.query(promql)
        if results and len(results) > 0:
            val = results[0].get("value", [None, None])[1]
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
        return default

    def query_range(self, promql: str, start_time: int, end_time: int, step: str = "15s") -> Optional[List[Dict[str, Any]]]:
        """Executes a range PromQL query over an interval."""
        try:
            url = f"{self.base_url}/api/v1/query_range"
            params = {
                "query": promql,
                "start": start_time,
                "end": end_time,
                "step": step
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    return data.get("data", {}).get("result", [])
        except Exception as e:
            logger.error(f"Prometheus range query error ({promql}): {e}")
        return None

    def check_health(self) -> bool:
        """Returns True if Prometheus is reachable and healthy."""
        try:
            resp = requests.get(f"{self.base_url}/-/healthy", timeout=3)
            return resp.status_code == 200
        except Exception:
            return False

prometheus_service = PrometheusService()
