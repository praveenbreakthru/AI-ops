import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
env_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=env_path)

data_dir = ROOT_DIR / "data"
data_dir.mkdir(parents=True, exist_ok=True)
sqlite_file = data_dir / "aiops_local.db"

class Settings:
    PROJECT_NAME: str = "Windows AIOps Monitoring & Intelligence Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    PROMETHEUS_URL: str = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    LOKI_URL: str = os.getenv("LOKI_URL", "http://localhost:3100")
    ALERTMANAGER_URL: str = os.getenv("ALERTMANAGER_URL", "http://localhost:9093")
    WINDOWS_EXPORTER_URL: str = os.getenv("WINDOWS_EXPORTER_URL", "http://localhost:9182")
    ALLOY_URL: str = os.getenv("ALLOY_URL", "http://localhost:12345")

    # Primary SQLite Database for pure full-stack lightweight deployment
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{sqlite_file.as_posix()}")
    SQLITE_URL: str = f"sqlite:///{sqlite_file.as_posix()}"

    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    OLLAMA_TIMEOUT_SECONDS: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "3"))

    REMEDIATION_MODE: str = os.getenv("REMEDIATION_MODE", "manual_approval")
    MAX_AUTO_ACTIONS_PER_HOUR: int = int(os.getenv("MAX_AUTO_ACTIONS_PER_HOUR", "3"))
    AUDIT_LOG_PATH: str = os.getenv("AUDIT_LOG_PATH", str(ROOT_DIR / "logs" / "remediation_audit.log"))

settings = Settings()
