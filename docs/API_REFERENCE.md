# AURA-OS Kernel REST API & WebSocket Protocol Reference

All endpoints bind to `http://localhost:8888` by default and support CORS for local loopback development.

---

## 1. WebSocket Streaming Endpoints

### 1.1 Interactive VT100 Terminal (`/ws/term`)
- **Protocol**: RFC 6455 WebSocket (`ws://localhost:8888/ws/term`)
- **Direction**: Full-Duplex Bi-directional
- **Handshake Response**: `101 Switching Protocols` with immediate socket buffer flushing.
- **Client Frame**: Keystrokes encoded as UTF-8 or binary VT100 control sequences.
- **Server Frame**: ANSI color formatted text stream emitted from host PTY or confined sandbox.
- **Payload Resizing**: Send JSON string `{"resize": {"cols": 80, "rows": 24}}` to adjust terminal boundaries.

### 1.2 System Event Stream (`/ws/events`)
- **Protocol**: RFC 6455 WebSocket (`ws://localhost:8888/ws/events`)
- **Server Push**: Emits real-time system audit events formatted as JSON:
```json
{
  "timestamp": "2026-10-05T01:15:00Z",
  "category": "KERNEL",
  "message": "VFS storage root mapped to ~/AURA_STORE/"
}
```

---

## 2. System Telemetry & Process APIs

### 2.1 Get System Information (`GET /api/sys/info`)
Returns host hardware configuration and platform parameters:
```json
{
  "hostname": "aura-host",
  "platform": "win32",
  "arch": "AMD64",
  "kernel": "6.8.0-aura",
  "cpu": { "cores": 8, "model": "x86_64" },
  "memory": { "total_mb": 16384 }
}
```

### 2.2 Get Real-Time Statistics (`GET /api/sys/stats`)
Returns instantaneous system load and memory consumption:
```json
{
  "cpu_percent": 14.2,
  "memory": { "total_mb": 16384, "used_mb": 6240, "free_mb": 10144, "percent": 38.1 },
  "disk": { "read_mb_s": 2.4, "write_mb_s": 0.8 },
  "network": { "recv_kb_s": 42.1, "sent_kb_s": 12.3 }
}
```

### 2.3 List Processes (`GET /api/proc/list`)
Returns snapshot of active processes running under the host/sandbox:
```json
[
  { "pid": 1024, "name": "python", "cpu_percent": 2.1, "memory_mb": 48.5, "status": "running", "user": "aura" }
]
```

### 2.4 Send Process Signal (`POST /api/proc/<pid>/signal`)
- **Payload**: `{"signal": "TERM", "force": false}`
- **Response**: `{"ok": true, "message": "Signal sent successfully"}`

---

## 3. Sandboxed Filesystem APIs

### 3.1 List Directory (`GET /api/fs/list?path=<relative_path>`)
Returns directory entries strictly within `~/AURA_STORE/`:
```json
[
  { "name": "Documents", "is_dir": true, "size": 0, "mtime": 1728080000 },
  { "name": "main.cpp", "is_dir": false, "size": 1042, "mtime": 1728080500, "ext": "cpp" }
]
```

### 3.2 Write File (`POST /api/fs/write`)
- **Payload**: `{"path": "Documents/notes.txt", "content": "Sample content..."}`
- **Response**: `{"ok": true, "bytes_written": 17}`

---

## 4. Reverse Proxy & Terminal Fallback APIs

### 4.1 Reverse Proxy Gateway (`GET /api/proxy?url=<target_url>`)
Fetches remote web content, strips `X-Frame-Options` and `Content-Security-Policy`, and rewrites asset links to permit live rendering inside desktop browser windows.

### 4.2 Terminal HTTP RPC Fallback (`POST /api/term/exec`)
Executes sandboxed commands via HTTP POST if WebSocket connections are interrupted:
- **Payload**: `{"command": "ls -la", "cwd": ""}`
- **Response**:
```json
{
  "ok": true,
  "exit_code": 0,
  "stdout": "total 4\n-rw-r--r-- 1 aura aura 1024 Oct 5 01:00 test.c\n",
  "stderr": "",
  "cwd": "~"
}
```
