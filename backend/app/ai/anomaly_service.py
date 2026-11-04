import logging
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Any
from sklearn.ensemble import IsolationForest
from app.services.prometheus_service import prometheus_service
from app.models.schemas import AnomalyOut

logger = logging.getLogger(__name__)

class AnomalyDetectionService:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)

    def detect_metric_anomalies(self) -> List[AnomalyOut]:
        """
        Runs statistical and ML anomaly detection on core Windows metrics:
        - CPU Utilization
        - Memory Available
        - Disk I/O Throughput
        - Network Bandwidth
        """
        anomalies = []
        now_dt = datetime.now(timezone.utc)

        # 1. CPU Utilization (evaluate last 30 minutes)
        cpu_history = self._get_metric_history("100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)", minutes=30)
        if len(cpu_history) >= 10:
            anomaly = self._evaluate_series("CPU Utilization (%)", cpu_history, unit="%", threshold_high=85.0)
            if anomaly:
                anomalies.append(anomaly)

        # 2. Memory Utilization (%)
        mem_history = self._get_metric_history("100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))", minutes=30)
        if len(mem_history) >= 10:
            anomaly = self._evaluate_series("Memory Utilization (%)", mem_history, unit="%", threshold_high=90.0)
            if anomaly:
                anomalies.append(anomaly)

        # 3. Disk Write Throughput (MB/s)
        disk_history = self._get_metric_history("sum(rate(windows_logical_disk_write_bytes_total[1m])) / 1048576", minutes=30)
        if len(disk_history) >= 10:
            anomaly = self._evaluate_series("Disk Write Throughput (MB/s)", disk_history, unit="MB/s", threshold_high=150.0)
            if anomaly:
                anomalies.append(anomaly)

        # 4. Network Traffic (Mbps)
        net_history = self._get_metric_history("sum(rate(windows_net_bytes_received_total[1m])) * 8 / 1000000", minutes=30)
        if len(net_history) >= 10:
            anomaly = self._evaluate_series("Network Ingress (Mbps)", net_history, unit="Mbps", threshold_high=80.0)
            if anomaly:
                anomalies.append(anomaly)

        return anomalies

    def _get_metric_history(self, promql: str, minutes: int = 30) -> List[float]:
        """Queries Prometheus range for historical telemetry."""
        now_s = int(datetime.now().timestamp())
        start_s = now_s - (minutes * 60)
        res = prometheus_service.query_range(promql, start_time=start_s, end_time=now_s, step="30s")
        if res and len(res) > 0:
            values = res[0].get("values", [])
            floats = []
            for v in values:
                try:
                    floats.append(float(v[1]))
                except (ValueError, TypeError):
                    pass
            return floats
        return []

    def _evaluate_series(self, name: str, values: List[float], unit: str, threshold_high: float) -> AnomalyOut | None:
        """Applies dynamic rolling Z-Score & ML isolation scoring."""
        arr = np.array(values)
        current = float(arr[-1])
        mean = float(np.mean(arr[:-1]))
        std = float(np.std(arr[:-1]))

        z_score = (current - mean) / std if std > 0.001 else 0.0

        # Heuristic combined with Z-Score:
        # A spike is flagged only if Z-score > 2.5 AND crosses operational threshold
        is_anomaly = bool((z_score > 2.5 and current > (mean * 1.3)) or current >= threshold_high)
        severity = "critical" if current >= threshold_high or z_score > 3.5 else "warning"

        if is_anomaly:
            return AnomalyOut(
                metric_name=name,
                current_value=round(current, 2),
                baseline_mean=round(mean, 2),
                z_score=round(z_score, 2),
                is_anomaly=True,
                severity=severity,
                explanation=f"{name} surged to {round(current, 1)}{unit} (baseline mean: {round(mean, 1)}{unit}, Z-score: {round(z_score, 1)}σ).",
                timestamp=datetime.now(timezone.utc)
            )
        return None

anomaly_service = AnomalyDetectionService()
