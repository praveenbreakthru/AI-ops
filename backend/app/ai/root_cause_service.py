import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.services.prometheus_service import prometheus_service
from app.services.loki_service import loki_service
from app.services.system_service import system_service

logger = logging.getLogger(__name__)

class RootCauseAnalysisService:
    def analyze_incident(self, incident_title: str = "High CPU Utilization", target: str = "windows-laptop") -> Dict[str, Any]:
        """
        Cross-correlates Prometheus metrics, Loki Windows Event logs, and process table
        to establish evidence-grounded root causes.
        """
        evidence = []
        possible_causes = []
        recommendations = []

        # 1. Inspect Top CPU Processes
        procs = system_service.get_top_processes(limit=5)
        top_proc_names = [f"{p.name} ({p.memory_mb} MB, CPU {p.cpu_percent}%)" for p in procs[:3]]
        evidence.append(f"Top active processes: {', '.join(top_proc_names)}")

        # 2. Query Recent Windows Event Logs from Loki (look for Errors and Warnings in last 15 min)
        recent_logs = loki_service.query_logs(
            logql='{job="windows_event_logs"} |= "error" or {job="windows_event_logs"} |= "critical" or {job="windows_event_logs"} |= "warning"',
            limit=5
        )

        log_evidence = []
        for l in recent_logs:
            log_evidence.append(f"EventID {l['event_id']} ({l['provider']}): {l['message'][:120]}...")
            evidence.append(f"Loki Log: [{l['level'].upper()}] EventID {l['event_id']} ({l['provider']})")

        # 3. Analyze Patterns
        if "CPU" in incident_title or "Spike" in incident_title:
            if procs:
                dominant = procs[0]
                possible_causes.append(f"Process '{dominant.name}' (PID {dominant.pid}) consuming significant resources.")
                recommendations.append(f"Review process '{dominant.name}' behavior or consider throttling if non-essential.")
            possible_causes.append("Periodic background indexing, antivirus scan, or Windows update task.")
            recommendations.append("Inspect Windows Task Scheduler and Windows Update service status.")

        elif "Memory" in incident_title or "RAM" in incident_title:
            possible_causes.append("Memory leak or intensive working set growth in active background applications.")
            if procs:
                possible_causes.append(f"Leading consumer: '{procs[0].name}' using {procs[0].memory_mb} MB RAM.")
            recommendations.append("Close idle browser tabs or restart leaked background worker services.")

        elif "Disk" in incident_title:
            possible_causes.append("Heavy I/O write operations or system log accumulation on drive volume.")
            recommendations.append("Execute approved temporary file purge under %TEMP% policy.")

        else:
            possible_causes.append("Transient system load or scheduled operating system maintenance.")
            recommendations.append("Observe metrics over next evaluation interval for automatic resolution.")

        return {
            "title": incident_title,
            "target": target,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "evidence": evidence,
            "recent_event_logs": log_evidence,
            "likely_root_causes": possible_causes,
            "recommended_actions": recommendations
        }

root_cause_service = RootCauseAnalysisService()
