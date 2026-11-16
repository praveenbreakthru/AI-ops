# Configuration & Architecture Guide

## Port Mapping & Service Directory

| Service | Port | Endpoint URL | Configuration File |
|---|---|---|---|
| **windows_exporter** | 9182 | `http://127.0.0.1:9182/metrics` | `monitoring/windows_exporter/config.yml` |
| **Prometheus** | 9090 | `http://127.0.0.1:9090` | `monitoring/prometheus/prometheus.yml` |
| **Grafana** | 3000 | `http://127.0.0.1:3000` | Provisioned via `monitoring/grafana/` |
| **Loki** | 3100 | `http://127.0.0.1:3100` | `monitoring/loki/loki-config.yml` |
| **Alertmanager** | 9093 | `http://127.0.0.1:9093` | `monitoring/alertmanager/alertmanager.yml` |
| **PostgreSQL** | 5433 | `127.0.0.1:5433` | `.env` / `docker/docker-compose.yml` |
| **FastAPI Backend**| 8000 | `http://127.0.0.1:8000` | `backend/app/config.py` |
| **React UI** | 5173 | `http://127.0.0.1:5173` | `frontend/vite.config.ts` |
| **Grafana Alloy** | 12345 | `http://127.0.0.1:12345` | `monitoring/alloy/config.alloy` |

---

## Grafana Dashboards Provisioned

1. **01 - Windows System Overview** (`/d/sys-overview`): Aggregate health, CPU/RAM/Disk gauges, uptime, and battery telemetry.
2. **02 - CPU Monitoring & Saturation** (`/d/cpu-mon`): Real-time per-core breakdown, clock frequencies, execution modes (user/privileged), context switches.
3. **03 - Memory & Paging Monitoring** (`/d/mem-mon`): Physical RAM consumption, committed memory vs limit, file system cache.
4. **04 - Disk & Volume Storage** (`/d/disk-mon`): Logical volumes C: and D: capacity, read/write MB/s throughput, idle time.
5. **05 - Network & Interface Analytics** (`/d/net-mon`): Download/Upload Mbps, packet drops, NIC state.
6. **06 - Process Resource Tracking** (`/d/proc-mon`): Top CPU and RAM consuming executables, handle counts.
7. **07 - Windows Services Health** (`/d/svc-mon`): Running vs stopped services matrix.
8. **08 - Windows Logs Explorer** (`/d/logs-mon`): Full LogQL Windows Event stream (Application & System channels).
9. **09 - AIOps Intelligence & Predictions** (`/d/aiops-intel`): Anomaly detection alerts, disk exhaustion horizon, AI diagnosis summaries.

---

## AI & Machine Learning Configuration

- **Anomaly Detection**: Rolling 30-minute window evaluation using dynamic Z-Score (`Z > 2.5`) combined with scikit-learn `IsolationForest`.
- **Predictive Monitoring**: Linear regression slope estimation calculating days to exhaustion and confidence scores.
- **Root Cause Cross-Correlation**: Spikes trigger cross-correlation between Prometheus metric time boundaries and Loki log events.
- **LLM Integration**: Connects to local Ollama on port `11434` with `llama3.2`. If Ollama is offline, seamlessly activates deterministic grounded reasoning.
- **Controlled Remediation**: Safelisted Windows services (`Spooler`, `W32Time`, `LanmanWorkstation`) and approved `%TEMP%` cleanup under manual operator approval.

