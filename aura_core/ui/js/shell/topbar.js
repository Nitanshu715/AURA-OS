/**
 * AURA-OS Top Glass Bar & Dynamic Status Island Controller
 * High-performance 60fps status island and tray telemetry synchronization.
 */

import { store } from './store.js';

export class TopbarController {
  constructor(wm, launcher) {
    this.wm = wm;
    this.launcher = launcher;
    this.islandCanvas = document.getElementById('island-spectrum-canvas');
    this.islandCtx = this.islandCanvas ? this.islandCanvas.getContext('2d') : null;
    this.numBars = 12;
    this.bars = new Float32Array(this.numBars).fill(0.1);

    this.init();
  }

  init() {
    this.startClock();
    this.initDynamicIsland();

    // Topbar focused app synchronization
    store.on('windowFocused', (win) => {
      const titleEl = document.getElementById('island-app-title');
      const iconEl = document.getElementById('island-app-icon');
      if (win) {
        if (titleEl) titleEl.textContent = win.title;
        if (iconEl) iconEl.innerHTML = `<use href="#icon-${win.appId}"></use>`;
      } else {
        if (titleEl) titleEl.textContent = 'Aura Core';
        if (iconEl) iconEl.innerHTML = `<use href="#icon-aura"></use>`;
      }
    });

    store.on('telemetry', (state) => this.renderTelemetry(state));
    store.on('agentState', (st) => {
      const island = document.getElementById('dynamic-status-island');
      if (island) {
        island.classList.toggle('running', st === 'running');
      }
    });
  }

  startClock() {
    const clockEl = document.getElementById('topbar-clock');
    const update = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    update();
    setInterval(update, 1000);
  }

  initDynamicIsland() {
    if (!this.islandCanvas || !this.islandCtx) return;

    this.islandCanvas.width = 50;
    this.islandCanvas.height = 14;

    const render = (now) => {
      const t = now * 0.004;
      const ctx = this.islandCtx;
      ctx.clearRect(0, 0, 50, 14);

      const isRunning = (store.state.agentState === 'running');
      const intensity = isRunning ? 0.8 : 0.25;

      for (let i = 0; i < this.numBars; i++) {
        const target = Math.sin(t + i * 0.4) * 0.3 + Math.random() * intensity + 0.15;
        this.bars[i] += (target - this.bars[i]) * 0.25;

        const barH = Math.max(2, this.bars[i] * 12);
        const x = i * 4;
        const y = 14 - barH;

        ctx.fillStyle = isRunning ? '#00F2FE' : '#8B7CFF';
        ctx.fillRect(x, y, 2, barH);
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);

    // Clicking dynamic island opens or focuses Agent window
    document.getElementById('dynamic-status-island')?.addEventListener('click', () => {
      this.wm.createWindow('agent');
    });
  }

  renderTelemetry(state) {
    const isoEl = document.getElementById('tray-isolation-text');
    const isoDot = document.getElementById('tray-isolation-dot');
    if (isoEl && isoDot) {
      if (state.isolationSupported) {
        isoEl.textContent = 'OverlayFS';
        isoDot.className = 'status-dot ok';
      } else {
        isoEl.textContent = 'Host Mode';
        isoDot.className = 'status-dot warn';
      }
    }

    const engEl = document.getElementById('tray-engine-text');
    if (engEl) engEl.textContent = state.modelName;

    const cpuEl = document.getElementById('tray-cpu-val');
    if (cpuEl) cpuEl.textContent = `${state.cpuPercent}%`;

    const memEl = document.getElementById('tray-mem-val');
    if (memEl) memEl.textContent = `${state.memory.percent || 0}%`;
  }
}
