import json
import logging
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.database.session import SessionLocal
from app.database.models import EventLogRecord

logger = logging.getLogger(__name__)

class EventLogService:
    def sync_windows_event_logs(self, minutes: int = 5, max_events: int = 30):
        """Fetches recent Windows Event logs via PowerShell and stores in SQLite."""
        ps_script = f"""
        $logs = @('Application', 'System')
        $results = @()
        foreach ($log in $logs) {{
            try {{
                $events = Get-WinEvent -LogName $log -MaxEvents {max_events} -ErrorAction SilentlyContinue
                if ($events) {{
                    foreach ($e in $events) {{
                        $results += [PSCustomObject]@{{
                            channel   = $log
                            event_id  = $e.Id
                            provider  = $e.ProviderName
                            level     = if ($e.LevelDisplayName) {{ $e.LevelDisplayName }} else {{ "Information" }}
                            timestamp = $e.TimeCreated.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                            message   = if ($e.Message) {{ $e.Message.Trim() }} else {{ "No message body" }}
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
                timeout=12
            )
            if proc.returncode == 0 and proc.stdout.strip():
                raw = json.loads(proc.stdout.strip())
                if isinstance(raw, dict):
                    raw = [raw]

                if SessionLocal:
                    with SessionLocal() as db:
                        for item in raw:
                            # Avoid duplicates: check if this event exists
                            try:
                                dt = datetime.fromisoformat(item["timestamp"].replace("Z", "+00:00"))
                            except Exception:
                                dt = datetime.now(timezone.utc)

                            exists = db.query(EventLogRecord).filter(
                                EventLogRecord.channel == item.get("channel"),
                                EventLogRecord.event_id == int(item.get("event_id", 0)),
                                EventLogRecord.timestamp == dt
                            ).first()

                            if not exists:
                                record = EventLogRecord(
                                    channel=item.get("channel", "System"),
                                    level=item.get("level", "Information"),
                                    provider=item.get("provider", "Unknown"),
                                    event_id=int(item.get("event_id", 0)),
                                    message=item.get("message", "")[:2000],
                                    timestamp=dt
                                )
                                db.add(record)
                        db.commit()
        except Exception as e:
            logger.debug(f"Event log sync error: {e}")

    def query_logs(self, channel: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
        """Queries stored logs from SQLite."""
        if not SessionLocal:
            return []

        try:
            with SessionLocal() as db:
                q = db.query(EventLogRecord)
                if channel and channel.lower() != "all":
                    q = q.filter(EventLogRecord.channel.ilike(channel))

                records = q.order_by(EventLogRecord.timestamp.desc()).limit(limit).all()

                return [
                    {
                        "timestamp": r.timestamp.isoformat() if r.timestamp else datetime.now(timezone.utc).isoformat(),
                        "channel": r.channel,
                        "level": r.level,
                        "provider": r.provider,
                        "event_id": str(r.event_id),
                        "message": r.message
                    }
                    for r in records
                ]
        except Exception as e:
            logger.error(f"Error querying event logs from database: {e}")
            return []

    def check_health(self) -> bool:
        return True

eventlog_service = EventLogService()
