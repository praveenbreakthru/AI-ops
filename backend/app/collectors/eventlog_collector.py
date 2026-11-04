"""
Windows Event Log Collector and Loki Shipper
Collects Application, System, and Security event logs, formats them with
severity levels and categories, and pushes them to Grafana Loki.
"""

import json
import time
import subprocess
import requests
from datetime import datetime, timezone

LOKI_PUSH_URL = "http://localhost:3100/loki/api/v1/push"

def fetch_recent_windows_events(minutes: int = 5, max_events: int = 50):
    """
    Fetches recent Windows Event Logs using PowerShell Get-WinEvent.
    Extracts Provider, Id, LevelDisplayName, Message, and Timestamp.
    """
    ps_script = f"""
    $startTime = (Get-Date).AddMinutes(-{minutes})
    $logs = @('Application', 'System')
    $results = @()
    foreach ($log in $logs) {{
        try {{
            $events = Get-WinEvent -FilterHashtable @{{LogName=$log; StartTime=$startTime}} -MaxEvents {max_events} -ErrorAction SilentlyContinue
            if ($events) {{
                foreach ($e in $events) {{
                    $results += [PSCustomObject]@{{
                        LogName   = $log
                        Id        = $e.Id
                        Provider  = $e.ProviderName
                        Level     = if ($e.LevelDisplayName) {{ $e.LevelDisplayName }} else {{ "Information" }}
                        Time      = $e.TimeCreated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                        Message   = if ($e.Message) {{ $e.Message.Trim() }} else {{ "No message body" }}
                    }}
                }}
            }}
        }} catch {{}}
    }}
    $results | ConvertTo-Json -Depth 3 -Compress
    """
    try:
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            timeout=15
        )
        if proc.returncode == 0 and proc.stdout.strip():
            raw = json.loads(proc.stdout.strip())
            if isinstance(raw, dict):
                return [raw]
            elif isinstance(raw, list):
                return raw
    except Exception as ex:
        print(f"Error fetching Windows events: {ex}")
    return []

def push_to_loki(events):
    """
    Ships structured Windows events to Grafana Loki using the /loki/api/v1/push API.
    """
    if not events:
        return 0

    streams = []
    now_ns = str(time.time_ns())

    for idx, e in enumerate(events):
        level = str(e.get("Level", "Information")).lower()
        if "crit" in level:
            norm_level = "critical"
        elif "err" in level:
            norm_level = "error"
        elif "warn" in level:
            norm_level = "warning"
        else:
            norm_level = "info"

        stream = {
            "stream": {
                "job": "windows_event_logs",
                "channel": e.get("LogName", "Application"),
                "level": norm_level,
                "provider": str(e.get("Provider", "Unknown")),
                "event_id": str(e.get("Id", "0")),
                "host": "windows-laptop"
            },
            "values": [
                [str(time.time_ns() + idx * 1000), f"[{norm_level.upper()}] EventID:{e.get('Id')} ({e.get('Provider')}): {e.get('Message')}"]
            ]
        }
        streams.append(stream)

    payload = {"streams": streams}
    try:
        resp = requests.post(LOKI_PUSH_URL, json=payload, timeout=5)
        if resp.status_code == 204:
            return len(events)
        else:
            print(f"Loki push response: {resp.status_code} - {resp.text}")
    except Exception as ex:
        print(f"Failed to push to Loki: {ex}")
    return 0

if __name__ == "__main__":
    print("Collecting Windows Event Logs...")
    evts = fetch_recent_windows_events(minutes=30, max_events=30)
    print(f"Fetched {len(evts)} events.")
    shipped = push_to_loki(evts)
    print(f"Shipped {shipped} events to Loki successfully.")
