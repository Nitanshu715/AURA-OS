# AURA-OS Buildroot & NitanshuOS Requirements

This document specifies the packages, kernel features, and runtime configurations needed to run the AURA-OS real desktop environment inside the NitanshuOS Linux guest.

---

## 1. Python 3 Runtime & Modules (Buildroot `menuconfig`)

AURA-OS is powered entirely by the Python standard library with zero external pip dependencies. Enable the following in `Target packages -> Interpreter languages and scripting -> python3`:

| Module | Buildroot Config | Purpose |
|---|---|---|
| `pty` / `termios` | `BR2_PACKAGE_PYTHON3` (built-in) | Interactive VT100 bash terminal PTY bridge (`/ws/term`) |
| `sqlite3` | `BR2_PACKAGE_PYTHON3_SQLITE` | Neural memory vector DB and audit log tracking |
| `zlib` / `zipfile` | `BR2_PACKAGE_PYTHON3_ZLIB` | Third-party app package extraction & installation |
| `ssl` | `BR2_PACKAGE_PYTHON3_SSL` | Secure browser proxy and HTTPS request fetching |
| `select` / `fcntl` | Built-in | Non-blocking WebSocket and PTY I/O multiplexing |

---

## 2. Core Linux Utilities

| Package | Buildroot Config | Purpose |
|---|---|---|
| `bash` | `BR2_PACKAGE_BASH` | Default interactive login shell for the Terminal app |
| `coreutils` | `BR2_PACKAGE_COREUTILS` | Standard filesystem commands (`ls`, `stat`, `df`, `cp`, `mv`) |
| `procps-ng` / `busybox` | `BR2_PACKAGE_PROCPS_NG` | `/proc` process metrics, `top`, `ps`, and signals |
| `e2fsprogs` | `BR2_PACKAGE_E2FSPROGS` | Ext4 filesystem maintenance and statvfs calls |
| `n-sandbox` | Custom Buildroot Overlay | OverlayFS and unshare namespace isolation engine |
| `ffmpeg` (optional) | `BR2_PACKAGE_FFMPEG` | Media Player video decoding and recording transcoding |

---

## 3. Kernel Features (`kernel-auraos.fragment`)

Ensure the NitanshuOS Linux 5.10 LTS kernel includes:
- `CONFIG_NAMESPACES=y` (PID, Mount, Network, UTS, IPC, User)
- `CONFIG_OVERLAY_FS=y` (Disposable sandboxes)
- `CONFIG_CGROUPS=y`, `CONFIG_MEMCG=y`, `CONFIG_CGROUP_PIDS=y` (Cgroups v2 resource accounting)
- `CONFIG_UNIX98_PTYS=y` (Virtual terminal PTY allocation)
