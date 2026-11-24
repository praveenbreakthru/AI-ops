import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
env_path = ROOT_DIR / ".env"
load_dotenv(dotenv_path=env_path)

data_dir = ROOT_DIR / "data"
data_dir.mkdir(parents=True, exist_ok=True)
sqlite_file = (data_dir / "aiops_local.db").resolve()

logs_dir = ROOT_DIR / "logs"
logs_dir.mkdir(parents=True, exist_ok=True)

raw_db_url = os.getenv("DATABASE_URL", "")
if not raw_db_url or "./data" in raw_db_url:
    resolved_db_url = f"sqlite:///{sqlite_file.as_posix()}"
else:
    resolved_db_url = raw_db_url

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
    DATABASE_URL: str = resolved_db_url
    SQLITE_URL: str = f"sqlite:///{sqlite_file.as_posix()}"

    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    OLLAMA_TIMEOUT_SECONDS: int = int(os.getenv("OLLAMA_TIMEOUT_SECONDS", "3"))

    REMEDIATION_MODE: str = os.getenv("REMEDIATION_MODE", "manual_approval")
    MAX_AUTO_ACTIONS_PER_HOUR: int = int(os.getenv("MAX_AUTO_ACTIONS_PER_HOUR", "3"))
    AUDIT_LOG_PATH: str = os.getenv("AUDIT_LOG_PATH", str(logs_dir / "remediation_audit.log"))

    # Remote Linux Server Settings
    LINUX_SERVER_HOST: str = os.getenv("LINUX_SERVER_HOST", "172.16.10.29")
    LINUX_SERVER_PORT: int = int(os.getenv("LINUX_SERVER_PORT", "22"))
    LINUX_SERVER_USER: str = os.getenv("LINUX_SERVER_USER", "administrator")
    LINUX_SERVER_PASSWORD: str = os.getenv("LINUX_SERVER_PASSWORD", "")

    # Remote Windows Server Settings
    WINDOWS_SERVER_HOST: str = os.getenv("WINDOWS_SERVER_HOST", "172.16.10.30")
    WINDOWS_SERVER_PORT: int = int(os.getenv("WINDOWS_SERVER_PORT", "5985"))
    WINDOWS_SERVER_USER: str = os.getenv("WINDOWS_SERVER_USER", "administrator")
    WINDOWS_SERVER_PASSWORD: str = os.getenv("WINDOWS_SERVER_PASSWORD", "")


settings = Settings()
