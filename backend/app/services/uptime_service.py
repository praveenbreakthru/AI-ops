import time
import socket
import urllib.request
import urllib.error
import ssl
import threading
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.services.windows_server_service import windows_server_service
from app.services.linux_service import linux_service
from app.services.node_manager import node_manager

logger = logging.getLogger("uptime_service")

class EndpointMetric:
    def __init__(self, url: str, name: str, node_id: str):
        self.url = url
        self.name = name
        self.node_id = node_id
        self.status: str = "unknown"
        self.status_code: Optional[int] = None
        self.latency_ms: float = 0.0
        self.last_checked: Optional[str] = None
        self.error_message: Optional[str] = None
        self.checks_count: int = 0
        self.success_count: int = 0
        self.recent_latencies: List[float] = []

    @property
    def uptime_percent(self) -> float:
        if self.checks_count == 0:
            return 100.0
        return round((self.success_count / self.checks_count) * 100.0, 1)

    @property
    def avg_latency_ms(self) -> float:
        if not self.recent_latencies:
            return round(self.latency_ms, 1)
        return round(sum(self.recent_latencies) / len(self.recent_latencies), 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "name": self.name,
            "node_id": self.node_id,
            "status": self.status,
            "status_code": self.status_code,
            "latency_ms": round(self.latency_ms, 1),
            "avg_latency_ms": self.avg_latency_ms,
            "uptime_percent": self.uptime_percent,
            "checks_count": self.checks_count,
            "last_checked": self.last_checked,
            "error_message": self.error_message,
        }

class UptimeService:
    def __init__(self):
        self._endpoints: Dict[str, EndpointMetric] = {}
        self._lock = threading.Lock()
        self._last_sweep = 0.0
        self._is_sweeping = False

    def probe_single_url(self, url: str, name: str = "Endpoint", node_id: str = "unknown", timeout_sec: float = 3.0) -> Dict[str, Any]:
        """Probes a single HTTP/HTTPS endpoint synchronously with high precision."""
        start = time.perf_counter()
        now_str = datetime.now(timezone.utc).isoformat()
        status_code = None
        error_msg = None
        status = "healthy"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AIOps-Synthetic-Prober/2.0 (+http://aiops-monitor.local)"}
        )

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            with urllib.request.urlopen(req, context=ctx, timeout=timeout_sec) as response:
                status_code = response.getcode()
                latency = (time.perf_counter() - start) * 1000.0
                if 200 <= status_code < 400:
                    status = "healthy"
                else:
                    status = "degraded"
        except urllib.error.HTTPError as e:
            latency = (time.perf_counter() - start) * 1000.0
            status_code = e.code
            if status_code in (401, 403):
                # Auth required, server is actively answering!
                status = "healthy"
                error_msg = f"HTTP {status_code} (Authentication Required)"
            elif status_code == 404:
                status = "warning"
                error_msg = f"HTTP 404 (Endpoint Root Not Found)"
            else:
                status = "degraded"
                error_msg = f"HTTP {status_code} Error"
        except Exception as e:
            latency = (time.perf_counter() - start) * 1000.0
            status = "down"
            err_str = str(e)
            if "10061" in err_str or "refused" in err_str.lower():
                error_msg = "Connection Refused (Port not listening)"
            elif "timed out" in err_str.lower():
                error_msg = "Connection Timed Out (>3s)"
            else:
                error_msg = err_str

        with self._lock:
            if url not in self._endpoints:
                self._endpoints[url] = EndpointMetric(url=url, name=name, node_id=node_id)
            ep = self._endpoints[url]
            ep.status = status
            ep.status_code = status_code
            ep.latency_ms = latency
            ep.last_checked = now_str
            ep.error_message = error_msg
            ep.checks_count += 1
            if status in ("healthy", "warning"):
                ep.success_count += 1
            ep.recent_latencies.append(latency)
            if len(ep.recent_latencies) > 20:
                ep.recent_latencies.pop(0)

            return ep.to_dict()

    def get_endpoints_for_target(self, target: str) -> List[Dict[str, Any]]:
        """Returns synthetic uptime metrics for all applications/endpoints belonging to target."""
        # 1. Discover target URLs if not already in store
        self._ensure_endpoints_registered(target)

        # 2. Trigger async background sweep if not swept recently (TTL 20s)
        now = time.time()
        if (now - self._last_sweep) > 20.0 and not self._is_sweeping:
            self._is_sweeping = True
            threading.Thread(target=self._sweep_endpoints_async, args=(target,), daemon=True).start()

        with self._lock:
            results = []
            for ep in self._endpoints.values():
                if target in ("all", ep.node_id):
                    results.append(ep.to_dict())
            return results

    def _ensure_endpoints_registered(self, target: str):
        """Populates endpoints to probe from discovered applications and IIS sites."""
        with self._lock:
            if target in ("winserver", "windows_server"):
                apps = windows_server_service.get_applications_overview()
                for a in apps:
                    url = a.get("executable_path")
                    if url and (url.startswith("http://") or url.startswith("https://")):
                        if url not in self._endpoints:
                            self._endpoints[url] = EndpointMetric(
                                url=url,
                                name=a.get("name", "IIS Site"),
                                node_id="winserver"
                            )
            elif target == "linux":
                # Known Linux endpoints
                linux_urls = [
                    (f"http://{linux_service.host}:8080", "Jenkins CI/CD"),
                    (f"http://{linux_service.host}:3000", "Grafana Monitoring"),
                    (f"http://{linux_service.host}:6443", "Kubernetes k3s API"),
                    (f"http://{linux_service.host}:5000", "RouteTrackingApp Backend"),
                ]
                for url, name in linux_urls:
                    if url not in self._endpoints:
                        self._endpoints[url] = EndpointMetric(url=url, name=name, node_id="linux")

    def _sweep_endpoints_async(self, target: str):
        """Sweeps registered endpoints in parallel threads."""
        try:
            with self._lock:
                to_probe = [
                    (ep.url, ep.name, ep.node_id)
                    for ep in self._endpoints.values()
                    if target in ("all", ep.node_id)
                ]

            threads = []
            for url, name, node_id in to_probe[:20]: # Probe up to 20 endpoints concurrently
                t = threading.Thread(target=self.probe_single_url, args=(url, name, node_id))
                threads.append(t)
                t.start()

            for t in threads:
                t.join(timeout=3.5)

            self._last_sweep = time.time()
        except Exception as e:
            logger.warning(f"Error in uptime sweep: {e}")
        finally:
            self._is_sweeping = False

uptime_service = UptimeService()

