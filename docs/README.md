# AURA-OS Comprehensive Documentation Index

This directory houses complete specifications, architectural blueprints, benchmarks, API references, and photographic captures of AURA-OS in operation.

## Table of Contents

| Document | Primary Focus | Description |
| :--- | :--- | :--- |
| [**DUAL_TWIN_ARCHITECTURE.md**](DUAL_TWIN_ARCHITECTURE.md) | **Multi-Agent Engine** | Mathematical formulation, 5-Core agent matrix, and autonomous self-healing recovery sequences. |
| [**ARCHITECTURE.md**](ARCHITECTURE.md) | **Core Subsystems** | Microkernel server, POSIX PTY bridge, RFC 6455 WebSockets, and hardware compositor. |
| [**APPLICATIONS.md**](APPLICATIONS.md) | **Software Ecosystem** | Deep-dive into all 15 native desktop apps (Dual-Twin Studio, Copilot, Terminal, IDE, etc.). |
| [**API_REFERENCE.md**](API_REFERENCE.md) | **REST & WebSockets** | Endpoint schemas, request/response structures, and WebSocket framing definitions. |
| [**BENCHMARKS.md**](BENCHMARKS.md) | **Performance Metrics** | Cold-boot latency, memory footprints, FPS stability, and VirtualBox hypervisor comparison. |
| [**QUICKSTART.md**](QUICKSTART.md) | **Deployment Guide** | Turnkey host launcher instructions and VirtualBox provisioning walkthrough. |
| [**BUILDROOT_REQUIREMENTS.md**](BUILDROOT_REQUIREMENTS.md) | **Toolchain Specs** | Kernel configurations and embedded Buildroot packaging requirements. |
| [**VIRTUALBOX_SETUP_GUIDE.md**](VIRTUALBOX_SETUP_GUIDE.md) | **Virtualization Specs** | VBoxManage scripting, display controller flags, and storage overlay configurations. |

---

## Visual Architecture Gallery

All captures are preserved in high-resolution inside [`docs/screenshots/`](screenshots/):

1. **`01_dual_twin_studio_orchestrator.png`** – Live 5-Core Multi-Agent Topology & Consensus Console.
2. **`02_latex_studio_academic_editor.png`** – Academic LaTeX Editor with split-pane live math formulas and native PDF compiler.
3. **`03_fullstack_web_app_browser.png`** – Real-time Node.js HTTP backend running live on port 3000 inside the desktop browser.
4. **`04_aura_copilot_ai_assistant.png`** – Neural Copilot with isolated command execution and self-healing recovery.
5. **`05_desktop_environment_overview.png`** – Windows 11 Acrylic Desktop Compositor with 48px translucent dock.
6. **`06_interactive_terminal_pty.png`** – Full-duplex VT100 interactive pseudoterminal running real compilers (`gcc`, `python`).
7. **`07_task_manager_telemetry.png`** – Real-time hardware telemetry (CPU, RAM, Disks) with process tree monitors.
8. **`08_file_explorer_storage.png`** – Sandboxed filesystem browser with two-stage trash recovery and downloads.
9. **`09_uefi_bootloader_sequence.png`** – Multi-stage ACPI hardware probing diagnostic bootloader sequence.
10. **`10_system_settings_control_panel.png`** – Desktop personalization, wallpaper engines, and network management.
