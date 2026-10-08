# Complete VirtualBox & Windows Shared Folder Configuration Guide

Follow these exact steps to connect your Windows workspace directly to VirtualBox with **live code synchronization** and proper **AURA-OS branding/logos**.

---

## 1. VirtualBox VM Settings Setup

Open **Oracle VM VirtualBox Manager**:

### Step 1: Shared Folder (Live Code Sync)
1. Select your VM -> Click **Settings** (Gear icon) -> Navigate to **Shared Folders**.
2. Click the **+** button (Add Shared Folder on the right).
3. Fill in the fields:
   - **Folder Path**: `D:\AURA-OS\aura_core` (or browse to your `aura_core` folder on Windows)
   - **Folder Name**: `aura_core` *(Must match exactly)*
   - **Read-only**: Unchecked (Leave blank so the VM can write files)
   - **Auto-mount**: Checked
   - **Mount point**: `/media/sf_aura_core` (or leave blank)
4. Click **OK**.

> **Result**: Every time you edit a file on Windows in VS Code / Antigravity, the changes are **immediately live** in VirtualBox without rebuilding or restarting the VM.

---

### Step 2: Port Forwarding (Accessing Desktop from Windows)
1. In VM Settings -> Navigate to **Network** -> **Adapter 1** (Attached to: NAT).
2. Click **Advanced** -> Click **Port Forwarding**.
3. Add the following rules:

| Name | Protocol | Host IP | Host Port | Guest IP | Guest Port | Purpose |
|---|---|---|---|---|---|---|
| **AURA-Web** | TCP | `127.0.0.1` | `8888` | (blank) | `8888` | Web Desktop UI & REST Gateway |
| **SSH-Sync** | TCP | `127.0.0.1` | `2222` | (blank) | `22` | SSH / SFTP Live Sync |
| **Ollama-LLM** | TCP | `127.0.0.1` | `11434` | (blank) | `11434` | Local Neural LLM Engine |

4. Click **OK**.

---

## 2. AURA-OS Logo Assets

The AURA-OS logo is located at:
- **Relative Web Path**: `assets/AURA_OS_Logo.png`
- **Full Path**: `D:\AURA-OS\aura_core\ui\assets\AURA_OS_Logo.png`

All logo locations are configured with responsive CSS containment and drop-shadows:
1. **Taskbar Start Button**: Center of the bottom taskbar (`30px` width, `filter: drop-shadow(...)`).
2. **Start Menu Header**: In the user profile pill (`38px` avatar).
3. **Boot & Splash Screen**: Center of the orbital boot spinner (`74px` luminous glowing orb).
4. **Window Titles & Taskbar Tabs**: High-DPI icon rendering.

---

## 3. Starting the VirtualBox OS

1. Start your VirtualBox VM.
2. The custom init daemon (`/etc/init.d/S99aura`) will:
   - Auto-mount `vboxsf aura_core` to `/media/sf_aura_core`.
   - Start `python3 server.py --host 0.0.0.0 --port 8888`.
3. Open your browser on Windows and navigate to:
   ```
   http://localhost:8888
   ```
4. You will see the AURA-OS boot screen and live interactive desktop.
