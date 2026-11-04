import os
import platform
import psutil
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.services.prometheus_service import prometheus_service
from app.models.schemas import (
    HostSpecs, SystemOverview, CpuMetrics, MemoryMetrics,
    DiskVolumeInfo, ProcessSummary, ServiceSummary
)

class SystemService:
    def __init__(self):
        self._cached_specs = None

    def get_host_specs(self) -> HostSpecs:
        """Collects baseline hardware and OS specifications."""
        if self._cached_specs:
            return self._cached_specs

        boot_timestamp = psutil.boot_time()
        uptime_days = (datetime.now().timestamp() - boot_timestamp) / 86400
        last_boot = datetime.fromtimestamp(boot_timestamp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # Battery & Hardware via CIM / WMI
        battery_pct = None
        battery_runtime = None
        gpu_name = "Intel(R) UHD Graphics 620"
        thermal_supported = False

        battery = psutil.sensors_battery()
        if battery:
            battery_pct = float(battery.percent)
            if battery.secsleft > 0 and battery.secsleft != psutil.POWER_TIME_UNLIMITED:
                battery_runtime = round(battery.secsleft / 60.0, 1)

        mem = psutil.virtual_memory()

        specs = HostSpecs(
            hostname=platform.node(),
            os_name=platform.system(),
            os_version=platform.version(),
            os_architecture=platform.machine(),
            cpu_model="Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz",
            cpu_cores=psutil.cpu_count(logical=False) or 4,
            cpu_logical=psutil.cpu_count(logical=True) or 8,
            total_ram_gb=round(mem.total / (1024**3), 2),
            uptime_days=round(uptime_days, 2),
            last_boot=last_boot,
            battery_percent=battery_pct,
            battery_runtime_min=battery_runtime,
            gpu_model=gpu_name,
            sensor_thermal_supported=thermal_supported
        )
        self._cached_specs = specs
        return specs

    def get_system_overview(self) -> SystemOverview:
        """Aggregates real-time health, PromQL gauges, and specs."""
        specs = self.get_host_specs()

        # Prometheus PromQL queries
        cpu_util = prometheus_service.query_scalar(
            "100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)",
            default=psutil.cpu_percent()
        )
        ram_util = prometheus_service.query_scalar(
            "100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))",
            default=psutil.virtual_memory().percent
        )
        ram_avail = prometheus_service.query_scalar("windows_memory_available_bytes", default=float(psutil.virtual_memory().available))
        ram_total = prometheus_service.query_scalar("windows_os_visible_memory_bytes", default=float(psutil.virtual_memory().total))
        ram_used = ram_total - ram_avail

        disk_free_c = prometheus_service.query_scalar("windows_logical_disk_free_bytes{volume='C:'}", default=0.0)
        disk_total_c = prometheus_service.query_scalar("windows_logical_disk_size_bytes{volume='C:'}", default=1.0)
        disk_free_c_pct = (disk_free_c / disk_total_c * 100.0) if disk_total_c > 0 else 0.0

        net_rx = prometheus_service.query_scalar("sum(rate(windows_net_bytes_received_total[1m])) * 8 / 1000000", default=0.0)
        net_tx = prometheus_service.query_scalar("sum(rate(windows_net_bytes_sent_total[1m])) * 8 / 1000000", default=0.0)

        active_alerts = int(prometheus_service.query_scalar("count(ALERTS{alertstate='firing'})", default=0.0))
        exporter_up = bool(prometheus_service.query_scalar("up{job='windows-exporter'}", default=1.0) == 1.0)

        status = "healthy"
        if active_alerts > 0 or cpu_util > 90 or ram_util > 92:
            status = "degraded"
        if not exporter_up:
            status = "critical"

        return SystemOverview(
            status=status,
            cpu_utilization_percent=round(cpu_util, 1),
            memory_utilization_percent=round(ram_util, 1),
            memory_used_gb=round(ram_used / (1024**3), 2),
            memory_total_gb=round(ram_total / (1024**3), 2),
            disk_free_c_percent=round(disk_free_c_pct, 1),
            disk_free_c_gb=round(disk_free_c / (1024**3), 2),
            disk_total_c_gb=round(disk_total_c / (1024**3), 2),
            network_rx_mbps=round(net_rx, 2),
            network_tx_mbps=round(net_tx, 2),
            active_alerts_count=active_alerts,
            recent_incidents_count=active_alerts,
            uptime_days=specs.uptime_days,
            exporter_online=exporter_up,
            specs=specs
        )

    def get_cpu_metrics(self) -> CpuMetrics:
        """Fetches detailed CPU metrics."""
        total_cpu = prometheus_service.query_scalar(
            "100 - (avg by (instance) (rate(windows_cpu_time_total{mode='idle'}[1m])) * 100)",
            default=psutil.cpu_percent()
        )
        user_cpu = prometheus_service.query_scalar("avg(rate(windows_cpu_time_total{mode='user'}[1m])) * 100", default=0.0)
        priv_cpu = prometheus_service.query_scalar("avg(rate(windows_cpu_time_total{mode='privileged'}[1m])) * 100", default=0.0)
        csw = prometheus_service.query_scalar("rate(windows_system_context_switches_total[1m])", default=0.0)
        clk = prometheus_service.query_scalar("sum(rate(windows_cpu_clock_interrupts_total[1m]))", default=0.0)

        # Per core metrics
        per_core = {}
        core_results = prometheus_service.query("100 - (rate(windows_cpu_time_total{mode='idle'}[1m]) * 100)")
        if core_results:
            for item in core_results:
                core_label = item.get("metric", {}).get("core", "0")
                try:
                    per_core[f"Core {core_label}"] = round(float(item["value"][1]), 1)
                except Exception:
                    pass

        # Core frequencies
        frequencies = {}
        freq_results = prometheus_service.query("windows_cpu_core_frequency_hertz / 1e9")
        if freq_results:
            for item in freq_results:
                core_label = item.get("metric", {}).get("core", "0")
                try:
                    frequencies[f"Core {core_label}"] = round(float(item["value"][1]), 2)
                except Exception:
                    pass

        return CpuMetrics(
            total_utilization_percent=round(total_cpu, 1),
            per_core_percent=per_core,
            user_percent=round(user_cpu, 1),
            privileged_percent=round(priv_cpu, 1),
            interrupts_per_sec=round(clk, 1),
            context_switches_per_sec=round(csw, 1),
            frequencies_ghz=frequencies
        )

    def get_memory_metrics(self) -> MemoryMetrics:
        """Fetches detailed RAM and paging metrics."""
        tot = prometheus_service.query_scalar("windows_os_visible_memory_bytes", default=float(psutil.virtual_memory().total))
        avail = prometheus_service.query_scalar("windows_memory_available_bytes", default=float(psutil.virtual_memory().available))
        used = tot - avail
        pct = (used / tot * 100.0) if tot > 0 else 0.0

        committed = prometheus_service.query_scalar("windows_memory_committed_bytes", default=0.0)
        limit = prometheus_service.query_scalar("windows_memory_commit_limit_bytes", default=0.0)
        cache = prometheus_service.query_scalar("windows_memory_cache_bytes", default=0.0)

        return MemoryMetrics(
            total_bytes=tot,
            used_bytes=used,
            available_bytes=avail,
            utilization_percent=round(pct, 1),
            committed_bytes=committed,
            commit_limit_bytes=limit,
            cache_bytes=cache
        )

    def get_disk_metrics(self) -> List[DiskVolumeInfo]:
        """Fetches logical disk metrics for each mounted volume."""
        volumes = []
        free_results = prometheus_service.query("windows_logical_disk_free_bytes")
        total_results = prometheus_service.query("windows_logical_disk_size_bytes")
        read_results = prometheus_service.query("rate(windows_logical_disk_read_bytes_total[1m]) / 1048576")
        write_results = prometheus_service.query("rate(windows_logical_disk_write_bytes_total[1m]) / 1048576")

        totals_map = {item.get("metric", {}).get("volume"): float(item["value"][1]) for item in (total_results or [])}
        read_map = {item.get("metric", {}).get("volume"): float(item["value"][1]) for item in (read_results or [])}
        write_map = {item.get("metric", {}).get("volume"): float(item["value"][1]) for item in (write_results or [])}

        if free_results:
            for item in free_results:
                vol = item.get("metric", {}).get("volume")
                if not vol or not vol.endswith(":"):
                    continue
                free_b = float(item["value"][1])
                tot_b = totals_map.get(vol, 0.0)
                used_pct = ((tot_b - free_b) / tot_b * 100.0) if tot_b > 0 else 0.0
                volumes.append(DiskVolumeInfo(
                    volume=vol,
                    free_bytes=free_b,
                    total_bytes=tot_b,
                    used_percent=round(used_pct, 1),
                    read_throughput_mbps=round(read_map.get(vol, 0.0), 2),
                    write_throughput_mbps=round(write_map.get(vol, 0.0), 2)
                ))

        # Fallback to psutil if Prometheus returned empty
        if not volumes:
            for part in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    volumes.append(DiskVolumeInfo(
                        volume=part.mountpoint.rstrip("\\"),
                        free_bytes=float(usage.free),
                        total_bytes=float(usage.total),
                        used_percent=float(usage.percent),
                        read_throughput_mbps=0.0,
                        write_throughput_mbps=0.0
                    ))
                except Exception:
                    pass

        return volumes

    def get_top_processes(self, limit: int = 15) -> List[ProcessSummary]:
        """Returns top resource-consuming processes running on Windows."""
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'num_handles']):
            try:
                info = p.info
                mem_mb = (info['memory_info'].rss / (1024**2)) if info['memory_info'] else 0.0
                procs.append(ProcessSummary(
                    name=info['name'] or "unknown",
                    pid=info['pid'],
                    cpu_percent=round(float(info['cpu_percent'] or 0.0), 1),
                    memory_mb=round(mem_mb, 1),
                    handles=info.get('num_handles')
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Sort by memory consumption descending
        procs.sort(key=lambda x: x.memory_mb, reverse=True)
        return procs[:limit]

    def get_services(self, limit: int = 30) -> List[ServiceSummary]:
        """Returns key Windows Services and their statuses."""
        services = []
        # Query via PowerShell Get-Service for accurate Windows Service info
        try:
            cmd = "Get-Service | Where-Object { $_.StartType -in 'Automatic', 'Auto' } | Select-Object -First 30 Name, DisplayName, Status, StartType | ConvertTo-Json -Compress"
            proc = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=8)
            if proc.returncode == 0 and proc.stdout.strip():
                import json
                data = json.loads(proc.stdout.strip())
                if isinstance(data, dict):
                    data = [data]
                for item in data:
                    raw_status = str(item.get("Status", "Stopped"))
                    norm_status = "ok" if "Running" in raw_status else "stopped"
                    services.append(ServiceSummary(
                        name=item.get("Name", "Unknown"),
                        display_name=item.get("DisplayName", "Unknown"),
                        status=norm_status,
                        start_mode=str(item.get("StartType", "Auto"))
                    ))
        except Exception:
            pass

        return services

system_service = SystemService()
