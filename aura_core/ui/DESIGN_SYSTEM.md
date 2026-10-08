# AURA-OS Glass Desktop Design System Specification

## 1. Concept: "Aura Glass Desktop"
AURA-OS is an agentic operating system desktop client combining the sleek polish of macOS, the fluent acrylic materials of Windows 11, and the sharp density of Warp and Bloomberg Terminal.
- **Visual Personality:** Translucent frosted acrylic glass (`backdrop-filter: blur(24px)`), vibrant neon accent glow, macOS traffic lights, centered floating dock, interactive aurora constellation wallpaper.
- **Strict Rule:** **ZERO EMOJIS.** All indicators use normalized inline SVG icons with 1.5px stroke width or technical badges (`[SYS]`, `[KERN]`, `[ISOL]`, `[MEM]`, `[AGENT]`, `[OK]`).

---

## 2. Desktop Shell Architecture
1. **Interactive Aurora Constellation Wallpaper:**
   - 50 dynamic glowing particle constellation nodes with proximity-based line connections.
   - Dual moving Aurora light orbs (Cyan/Blue & Violet/Pink) drifting smoothly across the viewport.
2. **Top Glass Menu Bar (32px):**
   - AURA Start / System Menu button (About, App Store, Preferences, Restart)
   - Workspace pills (Desk 1, Desk 2, Desk 3, Desk 4)
   - Focused window title
   - Live 60fps Neural Signal Spectrum equalizer
   - Isolation state pill (OverlayFS vs Host)
   - AI Engine model pill (`llama3.2:1b`)
   - Control Center quick settings flyout trigger
   - Live Clock & Calendar pill
   - Notification Bell with badge counter
3. **Centered Floating Glass Dock (Bottom):**
   - macOS / iPadOS inspired floating frosted dock with hover scale magnification and reflection.
   - 9 Built-in Applications:
     - **Aura Copilot** (`Agent`)
     - **Terminal** (`Warp Shell`)
     - **System Monitor** (`Telemetry & Spectrum`)
     - **Files Explorer** (`Finder`)
     - **Memory DB** (`SQLite Knowledge`)
     - **Sandbox Twin** (`OverlayFS Manager`)
     - **Code Studio** (`Scratchpad Runner`)
     - **Model Hub** (`Ollama Weights`)
     - **Settings** (`System Preferences`)
4. **Window Chrome:**
   - macOS colored traffic light buttons (Close `#ff5f56`, Minimize `#ffbd2e`, Maximize `#27c93f`)
   - Rounded 10px glass window frames with glowing focus borders.
   - Tiling binary-split layout with floating mode toggle.

---

## 3. Dynamic Accent Themes (Control Center)
- **Cyan Aurora (Default):** `#00F2FE` (Glow: `rgba(0, 242, 254, 0.3)`)
- **Cyber Violet:** `#8B7CFF` (Glow: `rgba(139, 124, 255, 0.3)`)
- **Matrix Emerald:** `#10B981` (Glow: `rgba(16, 185, 129, 0.3)`)
- **Solar Amber:** `#F59E0B` (Glow: `rgba(245, 158, 11, 0.3)`)
- **Neon Rose:** `#EC4899` (Glow: `rgba(236, 72, 153, 0.3)`)
