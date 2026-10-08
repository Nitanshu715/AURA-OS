/**
 * AURA-OS Glass Master Desktop Orchestrator
 * Bootstraps the Mac/Windows-inspired glass desktop environment, dock, wallpaper, and app suite.
 */

import { api } from './api.js';
import { store } from './shell/store.js';
import { WindowManager } from './shell/wm.js';
import { WorkspacesController } from './shell/workspaces.js';
import { TopbarController } from './shell/topbar.js';
import { DockController } from './shell/dock.js';
import { ControlCenter } from './shell/controlcenter.js';
import { SystemMenu } from './shell/systemmenu.js';
import { Launcher } from './shell/launcher.js';
import { ContextMenu } from './shell/contextmenu.js';
import { BootSequence } from './shell/boot.js';
import { AuroraWallpaper } from './viz/wallpaper.js';

// Import All 9 Desktop Apps
import { AgentApp } from './apps/agent.js';
import { TerminalApp } from './apps/terminal.js';
import { MonitorApp } from './apps/monitor.js';
import { FilesApp } from './apps/files.js';
import { MemoryApp } from './apps/memory.js';
import { ApprovalsApp } from './apps/approvals.js';
import { CodeApp } from './apps/code.js';
import { ModelsApp } from './apps/models.js';
import { SettingsApp } from './apps/settings.js';

const appsRegistry = {
  agent: AgentApp,
  terminal: TerminalApp,
  monitor: MonitorApp,
  files: FilesApp,
  memory: MemoryApp,
  approvals: ApprovalsApp,
  code: CodeApp,
  models: ModelsApp,
  settings: SettingsApp
};

class AuraGlassOS {
  constructor() {
    this.appsRegistry = appsRegistry;
    this.wm = null;
    this.workspaces = null;
    this.topbar = null;
    this.dock = null;
    this.controlCenter = null;
    this.systemMenu = null;
    this.launcher = null;
    this.contextMenu = null;
    this.wallpaper = null;

    this.init();
  }

  async init() {
    // 1. Dynamic Aurora Particle Wallpaper
    const wallCanvas = document.getElementById('wallpaper-canvas');
    if (wallCanvas) {
      this.wallpaper = new AuroraWallpaper(wallCanvas);
      window.auraWallpaper = this.wallpaper;
    }

    // 2. Fetch Initial Telemetry
    const initialTelemetry = await api.getTelemetry();
    store.updateTelemetry(initialTelemetry);

    // 3. Window Manager
    const wsContainer = document.getElementById('workspaces-view');
    this.wm = new WindowManager(wsContainer, this.appsRegistry);
    window.auraWM = this.wm;

    // 4. Shell Subsystems
    this.workspaces = new WorkspacesController(this.wm);
    this.launcher = new Launcher(this.wm, this.appsRegistry);
    window.auraLauncher = this.launcher;

    this.topbar = new TopbarController(this.wm, this.launcher);
    this.dock = new DockController(this.wm, this.appsRegistry);
    this.controlCenter = new ControlCenter();
    this.systemMenu = new SystemMenu(this.wm);
    this.contextMenu = new ContextMenu(this.wm);

    // 5. Authentic Boot Sequence
    const boot = new BootSequence(() => {
      this.onDesktopReady();
    });
    boot.run();

    // 6. Polling loop
    this.startTelemetryLoop();
  }

  onDesktopReady() {
    if (this.wm.windows.size === 0) {
      // Default desktop layout with 3 interactive windows
      this.wm.createWindow('agent', { workspace: 1 });
      this.wm.createWindow('terminal', { workspace: 1 });
      this.wm.createWindow('monitor', { workspace: 1 });
    }
  }

  startTelemetryLoop() {
    const poll = async () => {
      const data = await api.getTelemetry();
      store.updateTelemetry(data);
    };
    setInterval(poll, 1000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.auraOS = new AuraGlassOS();
});
