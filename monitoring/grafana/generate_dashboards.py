"""
Generates the 9 production Grafana dashboard JSON definitions required by the Windows AIOps Platform.
"""

import json
from pathlib import Path

OUT_DIR = Path(r"D:\Breakthru All Files\AIops-project\monitoring\grafana\dashboards")
OUT_DIR.mkdir(parents=True, exist_ok=True)

DS_PROMETHEUS = {"type": "prometheus", "uid": "PBFA97CFB590B2093"}
DS_LOKI = {"type": "loki", "uid": "P8E80F9AEF21F6940"}

def make_panel(id, title, type, x, y, w, h, targets, options=None, field_config=None):
    panel = {
        "id": id,
        "title": title,
        "type": type,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "targets": targets,
        "options": options or {},
        "fieldConfig": field_config or {"defaults": {}, "overrides": []}
    }
    return panel

# ==============================================================================
# 1. System Overview Dashboard
# ==============================================================================
d1_panels = [
    make_panel(1, "System Uptime", "stat", 0, 0, 4, 3, [
        {"datasource": DS_PROMETHEUS, "expr": "(time() - windows_system_boot_time_timestamp) / 86400", "legendFormat": "Days Uptime"}
    ], field_config={"defaults": {"unit": "d", "decimals": 1, "color": {"mode": "palette-classic"}}}),

    make_panel(2, "CPU Utilization", "gauge", 4, 0, 5, 5, [
        {"datasource": DS_PROMETHEUS, "expr": "100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)", "legendFormat": "CPU %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100, "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}, {"color": "orange", "value": 75}, {"color": "red", "value": 90}]}}}),

    make_panel(3, "RAM Utilization", "gauge", 9, 0, 5, 5, [
        {"datasource": DS_PROMETHEUS, "expr": "100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))", "legendFormat": "RAM %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100, "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}, {"color": "orange", "value": 80}, {"color": "red", "value": 92}]}}}),

    make_panel(4, "Disk Free Space (C:)", "gauge", 14, 0, 5, 5, [
        {"datasource": DS_PROMETHEUS, "expr": "100 * (windows_logical_disk_free_bytes{volume='C:'} / windows_logical_disk_size_bytes{volume='C:'})", "legendFormat": "Free C: %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100, "thresholds": {"mode": "absolute", "steps": [{"color": "red", "value": None}, {"color": "orange", "value": 15}, {"color": "green", "value": 25}]}}}),

    make_panel(5, "Battery Level", "stat", 19, 0, 5, 5, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_hardware_battery_percent", "legendFormat": "Battery"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100, "thresholds": {"mode": "absolute", "steps": [{"color": "red", "value": None}, {"color": "orange", "value": 20}, {"color": "green", "value": 50}]}}}),

    make_panel(6, "CPU & Memory Utilization History", "timeseries", 0, 5, 14, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)", "legendFormat": "CPU Utilization %"},
        {"datasource": DS_PROMETHEUS, "expr": "100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))", "legendFormat": "RAM Utilization %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100}}),

    make_panel(7, "Network Throughput", "timeseries", 14, 5, 10, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "sum(rate(windows_net_bytes_received_total[1m])) * 8", "legendFormat": "Download (bps)"},
        {"datasource": DS_PROMETHEUS, "expr": "sum(rate(windows_net_bytes_sent_total[1m])) * 8", "legendFormat": "Upload (bps)"}
    ], field_config={"defaults": {"unit": "bps"}}),

    make_panel(8, "Recent Error / Warning Logs", "logs", 0, 13, 24, 7, [
        {"datasource": DS_LOKI, "expr": '{job="windows_event_logs"} |= "error" or {job="windows_event_logs"} |= "warning"', "maxLines": 100}
    ])
]

# ==============================================================================
# 2. CPU Monitoring Dashboard
# ==============================================================================
d2_panels = [
    make_panel(1, "Total CPU Usage %", "timeseries", 0, 0, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)", "legendFormat": "Total CPU %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100}}),

    make_panel(2, "Per-Core CPU Utilization %", "timeseries", 12, 0, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "100 - (rate(windows_cpu_time_total{mode='idle'}[1m]) * 100)", "legendFormat": "Core {{core}}"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100}}),

    make_panel(3, "CPU Utilization by Execution Mode", "timeseries", 0, 7, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "avg by (mode) (rate(windows_cpu_time_total[1m]) * 100)", "legendFormat": "Mode: {{mode}}"}
    ], field_config={"defaults": {"unit": "percent"}}),

    make_panel(4, "Core Frequencies", "timeseries", 12, 7, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_cpu_core_frequency_hertz / 1e9", "legendFormat": "Core {{core}} (GHz)"}
    ], field_config={"defaults": {"unit": "hertz", "decimals": 2}}),

    make_panel(5, "Interrupts & Context Switches", "timeseries", 0, 14, 24, 6, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_system_context_switches_total[1m])", "legendFormat": "Context Switches/sec"},
        {"datasource": DS_PROMETHEUS, "expr": "sum(rate(windows_cpu_clock_interrupts_total[1m]))", "legendFormat": "Clock Interrupts/sec"}
    ])
]

# ==============================================================================
# 3. Memory Monitoring Dashboard
# ==============================================================================
d3_panels = [
    make_panel(1, "Total Physical RAM", "stat", 0, 0, 6, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_os_visible_memory_bytes", "legendFormat": "Total RAM"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(2, "Used Physical RAM", "stat", 6, 0, 6, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_os_visible_memory_bytes - windows_memory_available_bytes", "legendFormat": "Used RAM"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(3, "Available Physical RAM", "stat", 12, 0, 6, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_memory_available_bytes", "legendFormat": "Available RAM"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(4, "Memory Utilization %", "gauge", 18, 0, 6, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))", "legendFormat": "RAM %"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100}}),

    make_panel(5, "Physical Memory Usage Trends", "timeseries", 0, 4, 14, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_os_visible_memory_bytes", "legendFormat": "Total RAM"},
        {"datasource": DS_PROMETHEUS, "expr": "windows_os_visible_memory_bytes - windows_memory_available_bytes", "legendFormat": "Used RAM"},
        {"datasource": DS_PROMETHEUS, "expr": "windows_memory_available_bytes", "legendFormat": "Available RAM"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(6, "Committed Memory vs Commit Limit", "timeseries", 14, 4, 10, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_memory_committed_bytes", "legendFormat": "Committed Bytes"},
        {"datasource": DS_PROMETHEUS, "expr": "windows_memory_commit_limit_bytes", "legendFormat": "Commit Limit"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(7, "Paging & Cache Activity", "timeseries", 0, 12, 24, 6, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_memory_cache_bytes", "legendFormat": "Cache Bytes"}
    ], field_config={"defaults": {"unit": "bytes"}})
]

# ==============================================================================
# 4. Disk Monitoring Dashboard
# ==============================================================================
d4_panels = [
    make_panel(1, "Disk Volume Capacity & Free Space", "bargauge", 0, 0, 12, 6, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_logical_disk_free_bytes", "legendFormat": "Free {{volume}}"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(2, "Disk Free Space %", "gauge", 12, 0, 12, 6, [
        {"datasource": DS_PROMETHEUS, "expr": "100 * (windows_logical_disk_free_bytes / windows_logical_disk_size_bytes)", "legendFormat": "Free % {{volume}}"}
    ], field_config={"defaults": {"unit": "percent", "min": 0, "max": 100}}),

    make_panel(3, "Disk Read & Write Throughput", "timeseries", 0, 6, 12, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_logical_disk_read_bytes_total[1m])", "legendFormat": "Read {{volume}}"},
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_logical_disk_write_bytes_total[1m])", "legendFormat": "Write {{volume}}"}
    ], field_config={"defaults": {"unit": "Bps"}}),

    make_panel(4, "Disk Idle Time %", "timeseries", 12, 6, 12, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_logical_disk_idle_seconds_total[1m]) * 100", "legendFormat": "Idle % {{volume}}"}
    ], field_config={"defaults": {"unit": "percent"}})
]

# ==============================================================================
# 5. Network Monitoring Dashboard
# ==============================================================================
d5_panels = [
    make_panel(1, "Incoming Network Throughput", "timeseries", 0, 0, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_net_bytes_received_total[1m]) * 8", "legendFormat": "In {{nic}}"}
    ], field_config={"defaults": {"unit": "bps"}}),

    make_panel(2, "Outgoing Network Throughput", "timeseries", 12, 0, 12, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_net_bytes_sent_total[1m]) * 8", "legendFormat": "Out {{nic}}"}
    ], field_config={"defaults": {"unit": "bps"}}),

    make_panel(3, "Network Packet Errors & Drops", "timeseries", 0, 7, 24, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_net_packets_outbound_errors_total[1m])", "legendFormat": "Outbound Errors {{nic}}"},
        {"datasource": DS_PROMETHEUS, "expr": "rate(windows_net_packets_received_errors_total[1m])", "legendFormat": "Inbound Errors {{nic}}"}
    ], field_config={"defaults": {"unit": "pps"}})
]

# ==============================================================================
# 6. Process Monitoring Dashboard
# ==============================================================================
d6_panels = [
    make_panel(1, "Top 10 Processes by CPU Consumption", "timeseries", 0, 0, 12, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "topk(10, sum by (process) (rate(windows_process_cpu_time_seconds_total[1m])))", "legendFormat": "{{process}}"}
    ], field_config={"defaults": {"unit": "s"}}),

    make_panel(2, "Top 10 Processes by Memory Working Set", "timeseries", 12, 0, 12, 8, [
        {"datasource": DS_PROMETHEUS, "expr": "topk(10, sum by (process) (windows_process_working_set_private_bytes))", "legendFormat": "{{process}}"}
    ], field_config={"defaults": {"unit": "bytes"}}),

    make_panel(3, "Process Handle Counts", "timeseries", 0, 8, 24, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "topk(10, sum by (process) (windows_process_handles))", "legendFormat": "Handles: {{process}}"}
    ])
]

# ==============================================================================
# 7. Windows Services Dashboard
# ==============================================================================
d7_panels = [
    make_panel(1, "Running Monitored Services", "stat", 0, 0, 8, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "count(windows_service_status{status='ok'})", "legendFormat": "Running"}
    ], field_config={"defaults": {"color": {"mode": "fixed", "fixedColor": "green"}}}),

    make_panel(2, "Monitored Services Status Matrix", "table", 0, 4, 24, 12, [
        {"datasource": DS_PROMETHEUS, "expr": "windows_service_status", "instant": True, "format": "table"}
    ])
]

# ==============================================================================
# 8. Logs Monitoring Dashboard
# ==============================================================================
d8_panels = [
    make_panel(1, "Log Stream Volume by Severity", "timeseries", 0, 0, 24, 6, [
        {"datasource": DS_LOKI, "expr": 'sum by (level) (count_over_time({job=~".+"}[1m]))', "legendFormat": "Level: {{level}}"}
    ]),

    make_panel(2, "Windows Event Logs Stream", "logs", 0, 6, 24, 12, [
        {"datasource": DS_LOKI, "expr": '{job="windows_event_logs"}', "maxLines": 500}
    ])
]

# ==============================================================================
# 9. AIOps Intelligence Dashboard
# ==============================================================================
d9_panels = [
    make_panel(1, "Active Critical Alerts", "stat", 0, 0, 8, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "count(ALERTS{alertstate='firing', severity='critical'}) or vector(0)", "legendFormat": "Critical Alerts"}
    ], field_config={"defaults": {"color": {"mode": "thresholds"}, "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}, {"color": "red", "value": 1}]}}}),

    make_panel(2, "Active Warning Alerts", "stat", 8, 0, 8, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "count(ALERTS{alertstate='firing', severity='warning'}) or vector(0)", "legendFormat": "Warning Alerts"}
    ], field_config={"defaults": {"color": {"mode": "thresholds"}, "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}, {"color": "orange", "value": 1}]}}}),

    make_panel(3, "Predicted Days to Disk C: Exhaustion", "stat", 16, 0, 8, 4, [
        {"datasource": DS_PROMETHEUS, "expr": "(windows_logical_disk_free_bytes{volume='C:'} / (deriv(windows_logical_disk_free_bytes{volume='C:'}[1h]) * -86400)) > 0 or vector(999)", "legendFormat": "Estimated Days"}
    ], field_config={"defaults": {"unit": "d", "decimals": 0}}),

    make_panel(4, "Alert Activity & Incident Timeline", "timeseries", 0, 4, 24, 7, [
        {"datasource": DS_PROMETHEUS, "expr": "sum by (alertname) (ALERTS{alertstate='firing'})", "legendFormat": "{{alertname}}"}
    ]),

    make_panel(5, "AI Diagnosis & Correlated Windows Incidents", "logs", 0, 11, 24, 8, [
        {"datasource": DS_LOKI, "expr": '{job="aiops_engine"} or {level=~"error|critical"}', "maxLines": 200}
    ])
]

dashboards = [
    ("01_system_overview.json", "01 - Windows System Overview", "sys-overview", d1_panels),
    ("02_cpu_monitoring.json", "02 - CPU Monitoring & Saturation", "cpu-mon", d2_panels),
    ("03_memory_monitoring.json", "03 - Memory & Paging Monitoring", "mem-mon", d3_panels),
    ("04_disk_monitoring.json", "04 - Disk & Volume Storage", "disk-mon", d4_panels),
    ("05_network_monitoring.json", "05 - Network & Interface Analytics", "net-mon", d5_panels),
    ("06_process_monitoring.json", "06 - Process Resource Tracking", "proc-mon", d6_panels),
    ("07_windows_services.json", "07 - Windows Services Health", "svc-mon", d7_panels),
    ("08_logs_monitoring.json", "08 - Windows Logs Explorer", "logs-mon", d8_panels),
    ("09_aiops_intelligence.json", "09 - AIOps Intelligence & Predictions", "aiops-intel", d9_panels),
]

for filename, title, uid, panels in dashboards:
    doc = {
        "annotations": {"list": []},
        "editable": True,
        "fiscalYearStartMonth": 0,
        "graphTooltip": 1,
        "id": None,
        "links": [],
        "liveNow": False,
        "panels": panels,
        "refresh": "10s",
        "schemaVersion": 39,
        "tags": ["windows", "aiops"],
        "timezone": "browser",
        "title": title,
        "uid": uid,
        "version": 1,
        "weekStart": ""
    }
    target_path = OUT_DIR / filename
    with open(target_path, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)
    print(f"Generated {filename}")

print("All 9 Grafana Dashboards successfully generated.")
