# AURA-OS Applications & Subsystem Ecosystem

AURA-OS includes 14 integrated system applications and productivity modules, all engineered without third-party web frameworks:

## Application Matrix

| Application | Identifier | Launch Command / Shortcut | Description & Core Features |
| :--- | :--- | :--- | :--- |
| **Interactive Terminal** | `terminal` | `Ctrl+Alt+T`, Start Menu | VT100/ANSI compliant PTY console. Supports gcc, g++, python, javac compilation and POSIX shell utilities. Includes automated HTTP fallback. |
| **Multi-Tab Web Browser** | `browser` | Start Menu, Taskbar | Multi-tab browsing with per-tab history stacks, forward/back navigation, and dynamic reverse proxy engine bypassing CORS/X-Frame-Options. |
| **Task Manager & Monitor** | `monitor` | Tray Equalizer, Start Menu | Real-time CPU, RAM, and Disk telemetry graphs, process list inspect, and process signal termination (SIGTERM, SIGKILL). |
| **Hierarchical File Explorer**| `files` | Desktop Icon, Start Menu | Tree directory navigation, file upload/download, folder creation, rename, and two-stage trash recovery. |
| **Monaco Code Studio** | `editor` | Start Menu | Full-featured code editor with syntax highlighting, line numbering, multi-file editing, and direct save integration. |
| **Paint Studio** | `paint` | Start Menu | HTML5 2D Canvas drawing tool with brushes, color picker, geometric primitives, and PNG export. |
| **Media Player** | `media` | Start Menu | Audio and video player supporting HTTP 206 Partial Content range requests for seamless timeline seeking. |
| **Clock, Calendar & Schedules**| `calendar`| Tray Clock, Start Menu | Dynamic interactive monthly calendar with persistent local event schedules and reminders store. |
| **System Settings** | `settings` | Start Menu | Desktop customization: wallpaper canvas select, dark/light theme switching, network Wi-Fi configuration, and password management. |
| **Snipping Tool** | `snipping` | Start Menu | Desktop screenshot capture utility with visual screen flash feedback and instant download to `~/Pictures/Screenshots/`. |
| **Calculator** | `calculator`| Start Menu | Standard and scientific math evaluation engine with memory registers. |
| **System Audit Logs** | `logs` | Start Menu | Live audit inspector tailing categorized system events (KERNEL, AUTH, APP, FS, NET) from `~/aura_audit.log`. |
| **Quick Settings Center** | `quick_settings`| System Tray Icons | Translucent flyout panel managing master audio volume, Wi-Fi connectivity, and battery telemetry. |
| **Diagnostic Bootloader** | `boot` | OS Cold Start | 2.8s multi-stage UEFI hardware probing sequence with real-time ACPI discovery and memory mapping. |
