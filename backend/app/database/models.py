from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def utc_now():
    return datetime.now(timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String(128), index=True, nullable=True)
    alert_name = Column(String(128), index=True, nullable=False)
    severity = Column(String(32), index=True, nullable=False, default="warning")
    status = Column(String(32), index=True, nullable=False, default="firing") # firing, acknowledged, resolved
    instance = Column(String(128), default="windows-laptop")
    summary = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    starts_at = Column(DateTime(timezone=True), default=utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(128), index=True, nullable=False)
    current_value = Column(Float, nullable=False)
    baseline_mean = Column(Float, nullable=False)
    baseline_std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    is_anomaly = Column(Boolean, default=True)
    severity = Column(String(32), default="warning")
    explanation = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=utc_now)

class ResourcePrediction(Base):
    __tablename__ = "resource_predictions"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String(64), index=True, nullable=False) # disk_c, memory, cpu
    current_utilization = Column(Float, nullable=False)
    trend_rate_per_hour = Column(Float, nullable=False)
    estimated_exhaustion_hours = Column(Float, nullable=True)
    confidence_score = Column(Float, default=0.85) # 0.0 - 1.0
    recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class RemediationAudit(Base):
    __tablename__ = "remediation_audits"

    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String(128), nullable=False)
    target = Column(String(256), nullable=False)
    status = Column(String(32), default="pending") # pending, approved, rejected, executed, failed
    requested_by = Column(String(64), default="aiops_engine")
    approved_by = Column(String(64), nullable=True)
    command_executed = Column(Text, nullable=True)
    execution_result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    executed_at = Column(DateTime(timezone=True), nullable=True)

class HistoricalReport(Base):
    __tablename__ = "historical_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(32), index=True) # daily, weekly, monthly
    title = Column(String(256), nullable=False)
    summary = Column(Text, nullable=True)
    data_payload = Column(JSON, nullable=True)
    file_path_pdf = Column(String(512), nullable=True)
    file_path_csv = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class MetricSample(Base):
    __tablename__ = "metric_samples"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(64), index=True, nullable=False)
    timestamp = Column(Float, index=True, nullable=False)
    value = Column(Float, nullable=False)
    label = Column(String(64), nullable=True)

class EventLogRecord(Base):
    __tablename__ = "event_log_records"

    id = Column(Integer, primary_key=True, index=True)
    channel = Column(String(32), index=True, nullable=False)
    level = Column(String(32), index=True, nullable=False)
    provider = Column(String(128), nullable=True)
    event_id = Column(Integer, default=0)
    message = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(32), default="admin")
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ManagedNode(Base):
    __tablename__ = "managed_nodes"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    os_type = Column(String(32), nullable=False)  # "linux" or "windows_server"
    host = Column(String(128), nullable=False)
    port = Column(Integer, nullable=False, default=22)
    username = Column(String(128), nullable=False)
    password = Column(String(256), nullable=False)
    is_custom = Column(Boolean, default=True)
    status = Column(String(32), default="online")
    created_at = Column(DateTime(timezone=True), default=utc_now)




