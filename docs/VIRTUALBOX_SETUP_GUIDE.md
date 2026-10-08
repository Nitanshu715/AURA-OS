# Live SSHFS & VirtualBox Shared Folder Sync Setup Guide for AURA-OS

This document explains how to set up **Live Two-Way Code Mirroring** between Windows (Host) and VirtualBox (NitanshuOS Guest), plus autonomous system startup.

---

## 1. Fast Two-Way Live Mounting Options

### Option A: VirtualBox Shared Folders (Recommended for zero network overhead)
1. In VirtualBox VM Settings -> **Shared Folders** -> Click **+ (Add)**:
   - **Folder Path**: `D:\AURA-OS\aura_core`
   - **Folder Name**: `aura_core`
   - **Auto-mount**: Checked
   - **Access**: Read / Write
2. On boot, NitanshuOS auto-mounts this folder to `/media/sf_aura_core`.
3. Every file you save or modify in Windows is **instantly reflected inside the running VM with zero latency**.

---

### Option B: Live SSHFS Mounting (Over Port 22)
1. Ensure OpenSSH server is enabled in NitanshuOS Buildroot (`BR2_PACKAGE_OPENSSH=y`).
2. In VirtualBox VM Settings -> **Network** -> **Adapter 1 (NAT)** -> **Port Forwarding**:
   - Rule 1 (SSH): Host Port `2222` -> Guest Port `22`
   - Rule 2 (AURA Web): Host Port `8888` -> Guest Port `8888`
   - Rule 3 (Ollama/LLM): Host Port `11434` -> Guest Port `11434`
3. On Windows, connect directly using SSH or WinFsp / SSHFS-Win:
   ```powershell
   # Map VM disk as a local Windows Drive (e.g., Z:)
   net use Z: \\sshfs\root@127.0.0.1!2222
   ```

---

## 2. Autonomous VirtualBox Boot Stack

When NitanshuOS boots up in VirtualBox:
1. **Init (`/etc/init.d/S99aura`)** automatically triggers at runtime runlevel.
2. Checks `/media/sf_aura_core` (or `/aura_core`).
3. Spawns `python3 server.py --host 0.0.0.0 --port 8888` in the background.
4. Terminal PTYs (`/ws/term`), Event WebSockets (`/ws/events`), and the REST APIs start listening on all interfaces.
5. You can open `http://localhost:8888` from your Windows browser to interact with the real guest desktop.

---

## 3. Architecture Flow Map
You can inspect the entire end-to-end component flow map live inside the OS:
- Open **Task Manager** -> Navigate to **Architecture Flow Map** tab.
- Visualizes the 4 stages: Hypervisor/Kernel -> Init Daemons -> Core HTTP/WS Gateway -> AI & Neural Vector Memory.
