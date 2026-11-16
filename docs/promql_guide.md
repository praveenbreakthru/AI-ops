# PromQL Production Query Reference Guide

This guide documents the core PromQL queries configured for the Windows AIOps platform.

---

### 1. CPU Metrics

- **Real-time CPU Utilization (%)**:
  ```promql
  100 - (avg by (instance) (rate(windows_cpu_time_total{mode="idle"}[1m])) * 100)
  ```
- **Per-Core CPU Utilization (%)**:
  ```promql
  100 - (rate(windows_cpu_time_total{mode="idle"}[1m]) * 100)
  ```
- **Core Frequency (GHz)**:
  ```promql
  windows_cpu_core_frequency_hertz / 1e9
  ```
- **Privileged (Kernel) vs User Mode CPU (%)**:
  ```promql
  avg by (instance) (rate(windows_cpu_time_total{mode="privileged"}[1m])) * 100
  avg by (instance) (rate(windows_cpu_time_total{mode="user"}[1m])) * 100
  ```

---

### 2. Memory Metrics

- **Total Physical RAM (GB)**:
  ```promql
  windows_os_visible_memory_bytes / 1024 / 1024 / 1024
  ```
- **Available Physical RAM (GB)**:
  ```promql
  windows_memory_available_bytes / 1024 / 1024 / 1024
  ```
- **Memory Utilization (%)**:
  ```promql
  100 * (1 - (windows_memory_available_bytes / windows_os_visible_memory_bytes))
  ```
- **Committed Memory vs Commit Limit (%)**:
  ```promql
  100 * (windows_memory_committed_bytes / windows_memory_commit_limit_bytes)
  ```

---

### 3. Disk Metrics

- **Disk Free Space (%)**:
  ```promql
  100 * (windows_logical_disk_free_bytes / windows_logical_disk_size_bytes)
  ```
- **Disk Free Space (GB)**:
  ```promql
  windows_logical_disk_free_bytes / 1024 / 1024 / 1024
  ```
- **Disk Read Throughput (MB/s)**:
  ```promql
  rate(windows_logical_disk_read_bytes_total[1m]) / 1024 / 1024
  ```
- **Disk Write Throughput (MB/s)**:
  ```promql
  rate(windows_logical_disk_write_bytes_total[1m]) / 1024 / 1024
  ```

---

### 4. Network Metrics

- **Incoming Network Bandwidth (Mbps)**:
  ```promql
  rate(windows_net_bytes_received_total[1m]) * 8 / 1000000
  ```
- **Outgoing Network Bandwidth (Mbps)**:
  ```promql
  rate(windows_net_bytes_sent_total[1m]) * 8 / 1000000
  ```
- **Total Packet Errors (errors/sec)**:
  ```promql
  rate(windows_net_packets_outbound_errors_total[1m]) + rate(windows_net_packets_received_errors_total[1m])
  ```

---

### 5. Processes & Services

- **Top 10 Processes by CPU (Seconds/sec)**:
  ```promql
  topk(10, sum by (process) (rate(windows_process_cpu_time_seconds_total[1m])))
  ```
- **Top 10 Processes by Private Working Set RAM (MB)**:
  ```promql
  topk(10, sum by (process) (windows_process_working_set_private_bytes) / 1024 / 1024)
  ```
- **Monitored Services Count Running**:
  ```promql
  count(windows_service_status{status="ok"})
  ```

---

### 6. Hardware & Battery

- **Battery Charge Level (%)**:
  ```promql
  windows_hardware_battery_percent
  ```
- **Estimated Battery Runtime (Minutes)**:
  ```promql
  windows_hardware_battery_runtime_minutes
  ```
- **System Uptime (Days)**:
  ```promql
  (time() - windows_system_boot_time_timestamp) / 86400
  ```

