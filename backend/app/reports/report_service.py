import os
import csv
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.services.system_service import system_service
from app.ai.anomaly_service import anomaly_service
from app.ai.prediction_service import prediction_service

REPORTS_DIR = Path("data/reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

class ReportService:
    def generate_report(self, report_type: str = "daily") -> Dict[str, Any]:
        """Generates comprehensive system health report with CSV and PDF files."""
        now = datetime.now(timezone.utc)
        ts_str = now.strftime("%Y%m%d_%H%M%S")
        title = f"Windows AIOps {report_type.capitalize()} Health Report"

        overview = system_service.get_system_overview()
        anomalies = anomaly_service.detect_metric_anomalies()
        predictions = prediction_service.get_resource_predictions()

        csv_filename = f"report_{report_type}_{ts_str}.csv"
        pdf_filename = f"report_{report_type}_{ts_str}.pdf"

        csv_path = REPORTS_DIR / csv_filename
        pdf_path = REPORTS_DIR / pdf_filename

        # 1. Generate CSV
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Section", "Metric", "Value", "Unit"])
            writer.writerow(["System", "Status", overview.status, ""])
            writer.writerow(["System", "CPU Utilization", overview.cpu_utilization_percent, "%"])
            writer.writerow(["System", "RAM Utilization", overview.memory_utilization_percent, "%"])
            writer.writerow(["System", "RAM Used", overview.memory_used_gb, "GB"])
            writer.writerow(["System", "RAM Total", overview.memory_total_gb, "GB"])
            writer.writerow(["System", "Disk C Free", overview.disk_free_c_gb, "GB"])
            writer.writerow(["System", "Disk C Free %", overview.disk_free_c_percent, "%"])
            writer.writerow(["System", "Uptime", overview.uptime_days, "days"])
            writer.writerow(["Anomalies", "Count Detected", len(anomalies), ""])
            for a in anomalies:
                writer.writerow(["Anomaly", a.metric_name, a.current_value, a.severity])
            for p in predictions:
                writer.writerow(["Prediction", p.resource_type, p.current_utilization, p.status])

        # 2. Generate PDF via ReportLab
        self._build_pdf(pdf_path, title, overview, anomalies, predictions, now)

        return {
            "title": title,
            "report_type": report_type,
            "generated_at": now.isoformat(),
            "csv_file": str(csv_path),
            "pdf_file": str(pdf_path),
            "summary": {
                "system_status": overview.status,
                "cpu_util": overview.cpu_utilization_percent,
                "ram_util": overview.memory_utilization_percent,
                "disk_free_c_gb": overview.disk_free_c_gb,
                "anomalies_count": len(anomalies),
                "predictions_count": len(predictions)
            }
        }

    def _build_pdf(self, path: Path, title: str, overview, anomalies, predictions, dt):
        doc = SimpleDocTemplate(str(path), pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle(
            "ReportTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1e293b")
        )
        story.append(Paragraph(title, title_style))
        story.append(Paragraph(f"Generated at: {dt.strftime('%Y-%m-%d %H:%M:%S UTC')}", styles["Normal"]))
        story.append(Spacer(1, 15))

        # Overview Table
        data = [
            ["Metric", "Value", "Status"],
            ["System Status", overview.status.upper(), "Normal" if overview.status == "healthy" else "Alert"],
            ["CPU Utilization", f"{overview.cpu_utilization_percent}%", "OK" if overview.cpu_utilization_percent < 85 else "High"],
            ["RAM Utilization", f"{overview.memory_utilization_percent}% ({overview.memory_used_gb}/{overview.memory_total_gb} GB)", "OK"],
            ["Disk C: Free Space", f"{overview.disk_free_c_gb} GB ({overview.disk_free_c_percent}%)", "OK" if overview.disk_free_c_percent > 10 else "Low"],
            ["System Uptime", f"{overview.uptime_days} days", "Running"],
            ["Exporter Health", "ONLINE" if overview.exporter_online else "OFFLINE", "Good" if overview.exporter_online else "Action Needed"]
        ]

        t = Table(data, colWidths=[200, 200, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white])
        ]))
        story.append(t)
        story.append(Spacer(1, 20))

        # Predictive Analytics Summary
        story.append(Paragraph("Predictive Capacity Forecasts", styles["Heading2"]))
        pred_data = [["Resource", "Utilization", "Trend", "Status"]]
        for p in predictions:
            pred_data.append([p.resource_type, f"{p.current_utilization}%", f"{p.trend_rate_per_hour} MB/hr", p.status.upper()])

        t_pred = Table(pred_data, colWidths=[180, 110, 110, 100])
        t_pred.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#334155")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white])
        ]))
        story.append(t_pred)

        doc.build(story)

report_service = ReportService()

