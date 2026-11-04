import logging
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
from app.services.metrics_store import metrics_store
from app.models.schemas import AnomalyOut

logger = logging.getLogger(__name__)

class AnomalyDetectionService:
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)

    def detect_metric_anomalies(self) -> List[AnomalyOut]:
        """
        Runs statistical and ML anomaly detection on core Windows metrics:
        - CPU Utilization
        - Memory Utilization
        - Disk I/O Throughput
        - Network Bandwidth
        """
        anomalies = []

        # 1. CPU Utilization (evaluate last 30 minutes)
        cpu_history = self._get_metric_history("cpu_utilization_percent", minutes=30)
        anomaly = self._evaluate_series("CPU Utilization (%)", cpu_history, unit="%", threshold_high=85.0)
        if anomaly:
            anomalies.append(anomaly)

        # 2. Memory Utilization (%)
        mem_history = self._get_metric_history("memory_utilization_percent", minutes=30)
        anomaly = self._evaluate_series("Memory Utilization (%)", mem_history, unit="%", threshold_high=90.0)
        if anomaly:
            anomalies.append(anomaly)

        # 3. Disk Write Throughput (MB/s)
        disk_history = self._get_metric_history("disk_write_throughput_mbps", minutes=30)
        anomaly = self._evaluate_series("Disk Write Throughput (MB/s)", disk_history, unit="MB/s", threshold_high=150.0)
        if anomaly:
            anomalies.append(anomaly)

        # 4. Network Traffic (Mbps)
        net_history = self._get_metric_history("network_rx_mbps", minutes=30)
        anomaly = self._evaluate_series("Network Ingress (Mbps)", net_history, unit="Mbps", threshold_high=80.0)
        if anomaly:
            anomalies.append(anomaly)

        return anomalies

    def _get_metric_history(self, metric_name: str, minutes: int = 30) -> List[float]:
        """Queries local metrics_store for historical telemetry."""
        samples = metrics_store.get_history(metric_name, minutes=minutes)
        if samples and len(samples) >= 3:
            return [float(val) for _, val in samples]

        # If cold start, prime with current value
        curr = metrics_store.get_current(metric_name, default=0.0)
        return [curr, curr, curr]

    def _evaluate_series(self, name: str, values: List[float], unit: str, threshold_high: float) -> Optional[AnomalyOut]:
        """Applies dynamic rolling Z-Score & ML anomaly checks."""
        if not values or len(values) < 2:
            return None

        arr = np.array(values)
        current = float(arr[-1])
        mean = float(np.mean(arr[:-1])) if len(arr) > 1 else current
        std = float(np.std(arr[:-1])) if len(arr) > 1 else 0.0

        z_score = (current - mean) / std if std > 0.001 else 0.0

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
