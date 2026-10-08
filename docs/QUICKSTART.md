# AURA-OS Quickstart & Deployment Guide

This guide covers setup and execution of AURA-OS on host systems and hypervisors.

---

## 1. Native Host Launcher (Recommended for Presentation Defense)

The Native Host Launcher runs AURA-OS directly against your host's bare-metal hardware and Python runtime. This eliminates mouse capture lag, resolution scaling bugs, and memory overhead common in VirtualBox.

### Prerequisites
- Python 3.10+ installed and available in system PATH.
- Modern Chromium-based browser (Google Chrome or Microsoft Edge).

### Single-Click Execution (Windows)
Double-click `launch_aura_os.bat` or run in Command Prompt:

```bat
cd /d D:\AURA-OS
launch_aura_os.bat
```

### Manual Execution (Windows / Linux / macOS)
1. Start the core backend server:
```bash
python aura_core/server.py
```

2. Open the desktop interface in your browser:
- Standard Browser View: `http://localhost:8888`
- Standalone App Window Mode (Recommended):
  - **Edge**: `msedge --app=http://localhost:8888 --start-maximized`
  - **Chrome**: `chrome --app=http://localhost:8888 --start-maximized`

---

## 2. VirtualBox VM Deployment (Evaluation Baseline)

For testing inside a hypervisor guest environment:

1. Launch PowerShell with VirtualBox management access.
2. Execute the VM configuration helper:
```powershell
.\setup_virtualbox_vm.ps1
```
3. Attach the generated ISO image (`AURA-OS.iso`) to the virtual optical drive.
4. Set Display Controller to `VBoxSVGA` with 3D Acceleration enabled.
5. Boot the virtual machine.

> **Note on VirtualBox Mouse Driver Limitations**: Standard VirtualBox mouse integration drivers capture host cursor pointers, resulting in noticeable latency compared to native host execution. For evaluation and live demonstrations, use **Native Host Launcher Mode** for 60+ FPS fidelity.
