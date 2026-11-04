import time
import logging
import psutil
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.services.metrics_store import metrics_store
from app.database.session import SessionLocal
from app.database.models import Incident

logger = logging.getLogger(__name__)

class NativeCollector:
    def __init__(self):
        self._prev_net_io = None
        self._prev_net_time = None
        self._prev_disk_io = None
        self._prev_disk_time = None
        # Prime psutil cpu counters
        psutil.cpu_percent(interval=None)
        psutil.cpu_times_percent(interval=None)

    def sample_system_metrics(self):
        """Samples all real-time Windows metrics and stores them in the MetricsStore."""
        now = time.time()
        samples = []

        # 1. CPU Metrics
        total_cpu = psutil.cpu_percent(interval=None)
        samples.append(("cpu_utilization_percent", total_cpu, None))

        per_core = psutil.cpu_percent(interval=None, percpu=True)
        for idx, core_val in enumerate(per_core):
            samples.append(("cpu_core_percent", core_val, f"Core {idx}"))

        cpu_times = psutil.cpu_times_percent(interval=None)
        user_pct = getattr(cpu_times, 'user', 0.0)
        system_pct = getattr(cpu_times, 'system', 0.0)
        samples.append(("cpu_user_percent", user_pct, None))
        samples.append(("cpu_privileged_percent", system_pct, None))

        # 2. Memory Metrics
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        samples.append(("memory_utilization_percent", float(mem.percent), None))
        samples.append(("memory_used_bytes", float(mem.used), None))
        samples.append(("memory_available_bytes", float(mem.available), None))
        samples.append(("memory_total_bytes", float(mem.total), None))
        samples.append(("memory_committed_bytes", float(swap.used), None))
        samples.append(("memory_commit_limit_bytes", float(swap.total), None))

        # 3. Disk Metrics (C:, D:, etc.)
        for part in psutil.disk_partitions(all=False):
            mount = part.mountpoint.rstrip("\\")
            try:
                usage = psutil.disk_usage(part.mountpoint)
                samples.append(("disk_free_bytes", float(usage.free), mount))
                samples.append(("disk_total_bytes", float(usage.total), mount))
                samples.append(("disk_used_percent", float(usage.percent), mount))
                samples.append(("disk_free_gb", round(usage.free / (1024**3), 2), mount))
            except Exception:
                pass

        # 4. Disk I/O Throughput
        try:
            curr_disk_io = psutil.disk_io_counters()
            if self._prev_disk_io and self._prev_disk_time:
                dt = now - self._prev_disk_time
                if dt > 0:
                    read_mbps = (curr_disk_io.read_bytes - self._prev_disk_io.read_bytes) / (1024 * 1024) / dt
                    write_mbps = (curr_disk_io.write_bytes - self._prev_disk_io.write_bytes) / (1024 * 1024) / dt
                    samples.append(("disk_read_throughput_mbps", max(0.0, read_mbps), None))
                    samples.append(("disk_write_throughput_mbps", max(0.0, write_mbps), None))
            self._prev_disk_io = curr_disk_io
            self._prev_disk_time = now
        except Exception:
            pass

        # 5. Network Throughput
        try:
            curr_net_io = psutil.net_io_counters()
            if self._prev_net_io and self._prev_net_time:
                dt = now - self._prev_net_time
                if dt > 0:
                    rx_mbps = (curr_net_io.bytes_recv - self._prev_net_io.bytes_recv) * 8 / 1_000_000 / dt
                    tx_mbps = (curr_net_io.bytes_sent - self._prev_net_io.bytes_sent) * 8 / 1_000_000 / dt
                    samples.append(("network_rx_mbps", max(0.0, rx_mbps), None))
                    samples.append(("network_tx_mbps", max(0.0, tx_mbps), None))
            self._prev_net_io = curr_net_io
            self._prev_net_time = now
        except Exception:
            pass

        # 6. Battery Telemetry
        try:
            battery = psutil.sensors_battery()
            if battery:
                samples.append(("battery_percent", float(battery.percent), None))
        except Exception:
            pass

        # Commit samples to MetricsStore
        metrics_store.record_samples_batch(samples)

        # 7. Check Local Alerting Rules
        self._evaluate_local_alerts(total_cpu, mem.percent)

    def _evaluate_local_alerts(self, cpu_pct: float, ram_pct: float):
        """Native alert evaluation without needing external Alertmanager."""
        rules = [
            {
                "name": "HostHighCpuUtilization",
                "condition": cpu_pct > 88.0,
                "severity": "critical" if cpu_pct > 95.0 else "warning",
                "summary": f"High CPU utilization detected on host ({cpu_pct:.1f}%)",
                "description": f"Windows CPU usage is running elevated at {cpu_pct:.1f}%."
            },
            {
                "name": "HostHighMemoryUtilization",
                "condition": ram_pct > 92.0,
                "severity": "critical" if ram_pct > 96.0 else "warning",
                "summary": f"High memory pressure detected ({ram_pct:.1f}%)",
                "description": f"RAM allocation is approaching capacity at {ram_pct:.1f}%."
            }
        ]

        if not SessionLocal:
            return

        try:
            with SessionLocal() as db:
                for r in rules:
                    existing = db.query(Incident).filter(
                        Incident.alert_name == r["name"],
                        Incident.status == "firing"
                    ).first()

                    if r["condition"]:
                        if not existing:
                            inc = Incident(
                                alert_name=r["name"],
                                severity=r["severity"],
                                status="firing",
                                summary=r["summary"],
                                description=r["description"]
                            )
                            db.add(inc)
                            db.commit()
                            logger.info(f"Native Alert firing: {r['name']}")
                    else:
                        if existing:
                            existing.status = "resolved"
                            existing.resolved_at = datetime.now(timezone.utc)
                            db.commit()
                            logger.info(f"Native Alert resolved: {r['name']}")
        except Exception as e:
            logger.debug(f"Alert evaluation error: {e}")

native_collector = NativeCollector()
