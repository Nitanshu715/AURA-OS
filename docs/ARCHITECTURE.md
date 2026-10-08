# AURA-OS System Architecture Specification

## 1. High-Level Architecture Overview

AURA-OS implements a decoupled, hybrid micro-kernel architecture designed to bridge the gap between high-performance local operating system execution and zero-latency hardware-accelerated web presentation runtimes.

```
+-----------------------------------------------------------------------------------+
|                        PRESENTATION TIER (Chromium / Edge Shell)                  |
|  Desktop Compositor | Window Manager | Taskbar & Start Menu | 14 Native Web Apps  |
+-----------------------------------------------------------------------------------+
                               |                                 ^
            HTTP REST APIs / JSON              RFC 6455 WebSockets / PTY ANSI Stream
                               v                                 |
+-----------------------------------------------------------------------------------+
|                    BACKEND KERNEL SERVICES TIER (Python Core Engine)              |
|  HTTP Request Router | WebSocket Bridge | Process Manager | Filesystem Sandbox    |
|  Security & Auth     | Web Proxy Engine | Hardware Telemetry | Audit Logger       |
+-----------------------------------------------------------------------------------+
                               |                                 ^
                      System Calls (os, sys, subprocess, pty, procfs)
                               v                                 |
+-----------------------------------------------------------------------------------+
|                         HOST OPERATING SYSTEM / BARE METAL                        |
|                 Linux / Windows Host Kernel | CPU, RAM, Disk, Network             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Kernel Core & Asynchronous Runtime (`aura_core/server.py`)
- **Multithreaded Server Engine**: Pure Python standard library implementation utilizing `socketserver.ThreadingMixIn` and `http.server.SimpleHTTPRequestHandler`.
- **Zero Third-Party Dependencies**: Completely standalone without external pip packages (`flask`, `django`, `websockets`, `uvicorn`), allowing immediate deployment on any Python 3.10+ installation.
- **REST Telemetry Router**: Serves high-frequency hardware metrics (`/api/sys/stats`), process management endpoints (`/api/proc/list`, `/api/proc/<pid>/signal`), and filesystem operations (`/api/fs/*`).

### 2.2 Pseudoterminal (PTY) & WebSocket Subsystem (`aura_core/ws.py`)
- **RFC 6455 Frame Parser**: Bitwise stream unmasking and framing algorithm handling variable-length payload buffers (126-bit and 64-bit frame headers).
- **Interactive Shell Session**:
  - **Linux Platform**: Spawns an interactive `/bin/bash` or `/bin/sh` session connected to a real POSIX pseudo-terminal via `pty.openpty()` and non-blocking I/O polling via `select.select()`.
  - **Windows Host Platform**: Confined sandbox command interpreter operating directly inside `~/AURA_STORE/`.
- **Buffer Flushing**: Explicit call to `self.wfile.flush()` immediately following `101 Switching Protocols` handshake response, preventing browser handshake timeouts.
- **Resilient HTTP RPC Fallback**: Transparently backs up WebSocket sessions via `/api/term/exec` if firewall or security policies disrupt WebSocket upgrades.

### 2.3 Dynamic Web Proxy Gateway (`aura_core/api/proxy.py`)
- **CORS & Framing Bypass**: Intercepts outgoing HTTP requests, fetches remote content via Python's `urllib`, and strips restrictive security headers:
  - `X-Frame-Options`
  - `Content-Security-Policy` (specifically `frame-ancestors`)
- **Asset Rewriting**: Intercepts relative asset paths, script bundles, and SPA dynamic chunks, rewriting them through `/api/proxy` to allow functional navigation inside client `<iframe>` elements.

### 2.4 Human Interface Desktop Compositor (`aura_core/ui/`)
- **60+ FPS Rendering Pipeline**: Native CSS Hardware Acceleration utilizing `transform`, `opacity`, and GPU-composed layers.
- **Window Management Engine (`wm.js`)**:
  - Priority Queue Z-Index Arbitration ensuring $O(1)$ focus switching.
  - Multi-window snapping (left half, right half, top maximize).
  - 8-directional edge resizing with boundary collision detection.
- **Fluent Acrylic Taskbar (`taskbar.css`)**:
  - Windows 11 style 48px translucent bar with subpixel border glow.
  - Interactive Sound Wave Equalizer canvas widget connected to Task Manager.
  - Start Menu panel (620x660px) with indexed search.
