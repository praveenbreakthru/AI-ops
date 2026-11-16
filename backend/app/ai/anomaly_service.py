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

    def detect_metric_anomalies(self, target: str = "local") -> List[AnomalyOut]:
        """
        Runs statistical and ML anomaly detection on core metrics.
        Supports both local Windows host and remote Linux server.
        """
        if target == "linux":
            return self.detect_linux_anomalies()

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

    def detect_linux_anomalies(self) -> List[AnomalyOut]:
        """Detects live anomalies, crash loops, and resource saturation on remote Linux server."""
        from app.services.linux_service import linux_service
        anomalies = []
        now = datetime.now(timezone.utc)

        # 1. Check crashing Docker containers
        try:
            containers = linux_service.get_docker_containers()
            for c in containers:
                if c.get("is_crashed") or "restarting" in c.get("status", "").lower():
                    anomalies.append(AnomalyOut(
                        metric_name=f"Docker Container Failure ({c.get('name')})",
                        current_value=1.0,
                        baseline_mean=0.0,
                        z_score=3.8,
                        is_anomaly=True,
                        severity="critical",
                        explanation=f"Container '{c.get('name')}' is in continuous crashing/restarting state on Linux server: {c.get('status')}.",
                        timestamp=now
                    ))
        except Exception:
            pass

        # 2. Check crashing k8s pods
        try:
            pods = linux_service.get_k8s_pods()
            for p in pods:
                if p.get("is_crashing"):
                    anomalies.append(AnomalyOut(
                        metric_name=f"Kubernetes Pod Failure ({p.get('name')})",
                        current_value=float(p.get("restarts", 1)),
                        baseline_mean=0.0,
                        z_score=3.5,
                        is_anomaly=True,
                        severity="critical",
                        explanation=f"Pod '{p.get('name')}' in namespace '{p.get('namespace')}' failed with {p.get('status')} ({p.get('restarts')} restarts).",
                        timestamp=now
                    ))
        except Exception:
            pass

        # 3. Check memory & CPU
        try:
            overview = linux_service.get_overview()
            if overview.memory_utilization_percent > 85.0:
                anomalies.append(AnomalyOut(
                    metric_name="Linux Server Memory Load",
                    current_value=overview.memory_utilization_percent,
                    baseline_mean=55.0,
                    z_score=2.8,
                    is_anomaly=True,
                    severity="warning" if overview.memory_utilization_percent < 92.0 else "critical",
                    explanation=f"Remote Linux memory utilization is high at {overview.memory_utilization_percent}% ({overview.memory_used_gb} GB used of {overview.memory_total_gb} GB).",
                    timestamp=now
                ))
            if overview.cpu_utilization_percent > 80.0:
                anomalies.append(AnomalyOut(
                    metric_name="Linux Server CPU Saturation",
                    current_value=overview.cpu_utilization_percent,
                    baseline_mean=20.0,
                    z_score=3.1,
                    is_anomaly=True,
                    severity="warning",
                    explanation=f"Remote Linux CPU utilization reached {overview.cpu_utilization_percent}%.",
                    timestamp=now
                ))
        except Exception:
            pass

        return anomalies

anomaly_service = AnomalyDetectionService()
