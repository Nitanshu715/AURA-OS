/**
 * AURA-OS System Monitor Application
 * Live CPU & RAM sparklines, core telemetry cards, and 60fps audio/neural spectrum.
 */

import { store } from '../shell/store.js';
import { TelemetryChart } from '../viz/sparkline.js';
import { SignalSpectrum } from '../viz/spectrum.js';

export const MonitorApp = {
  id: 'monitor',
  title: 'System Monitor',
  icon: 'monitor',

  mount(el, ctx) {
    el.innerHTML = `
      <div class="monitor-grid">
        <!-- Neural Signal Spectrum Card (Span 2) - TOP -->
        <div class="monitor-card" style="grid-column: span 2;">
          <div class="monitor-card-header">
            <div>
              <span style="font-size:11px; font-weight:600; color:var(--text-2); text-transform:uppercase;">Neural Frequency Monitor</span>
              <div style="font-size:11px; color:var(--text-3);">Real-time AI core oscillation & signal spectrum</div>
            </div>
            <span class="badge-pill ok">44.1 kHz &middot; Active</span>
          </div>
          <canvas class="spectrum-vivid-canvas" id="mon-spec-chart-${ctx.winId}"></canvas>
        </div>

        <!-- CPU Card -->
        <div class="monitor-card">
          <div class="monitor-card-header">
            <div>
              <span style="font-size:11px; font-weight:600; color:var(--text-2); text-transform:uppercase;">CPU Load</span>
              <div class="font-mono" id="mon-cpu-num-${ctx.winId}" style="font-size:24px; font-weight:700; color:var(--text-0);">0%</div>
            </div>
            <span class="badge-pill accent">4 Cores Active</span>
          </div>
          <canvas class="monitor-spark-canvas" id="mon-cpu-chart-${ctx.winId}"></canvas>
        </div>

        <!-- RAM Card -->
        <div class="monitor-card">
          <div class="monitor-card-header">
            <div>
              <span style="font-size:11px; font-weight:600; color:var(--text-2); text-transform:uppercase;">Memory Usage</span>
              <div class="font-mono" id="mon-mem-num-${ctx.winId}" style="font-size:24px; font-weight:700; color:var(--text-0);">0%</div>
            </div>
            <span class="font-mono" id="mon-mem-sub-${ctx.winId}" style="font-size:11px; color:var(--text-3);">0 / 0 MB</span>
          </div>
          <canvas class="monitor-spark-canvas" id="mon-mem-chart-${ctx.winId}"></canvas>
        </div>

        <!-- Storage & Namespaces (Span 2) -->
        <div class="monitor-card" style="grid-column: span 2;">
          <div class="monitor-card-header">
            <span style="font-size:11px; font-weight:600; color:var(--text-2); text-transform:uppercase;">Storage & Isolation Topology</span>
            <span class="badge-pill ${store.state.isolationSupported ? 'ok' : 'warn'}">
              ${store.state.isolationSupported ? 'OverlayFS Sandbox' : 'Host Mode'}
            </span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:12px; margin-top:4px;">
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-2);">Rootfs Free</span>
                <span class="font-mono" id="mon-disk-val-${ctx.winId}">--</span>
              </div>
              <div style="width:100%; height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                <div id="mon-disk-bar-${ctx.winId}" style="height:100%; width:0%; background:var(--accent); transition:width 0.3s ease;"></div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--text-2);">Active Scope</span>
              <span class="font-mono" id="mon-scope-name-${ctx.winId}">${store.state.activeOsName}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const cpuChart = new TelemetryChart(el.querySelector(`#mon-cpu-chart-${ctx.winId}`), { maxVal: 100 });
    const memChart = new TelemetryChart(el.querySelector(`#mon-mem-chart-${ctx.winId}`), { maxVal: 100 });
    const spectrum = new SignalSpectrum(el.querySelector(`#mon-spec-chart-${ctx.winId}`), 40);

    const update = (state) => {
      const cpuNum = el.querySelector(`#mon-cpu-num-${ctx.winId}`);
      if (cpuNum) cpuNum.textContent = `${state.cpuPercent}%`;
      cpuChart.push(state.cpuPercent);

      const memNum = el.querySelector(`#mon-mem-num-${ctx.winId}`);
      const memSub = el.querySelector(`#mon-mem-sub-${ctx.winId}`);
      if (memNum) memNum.textContent = `${state.memory.percent || 0}%`;
      if (memSub) memSub.textContent = `${state.memory.used_mb || 0} / ${state.memory.total_mb || 0} MB`;
      memChart.push(state.memory.percent || 0);

      const diskVal = el.querySelector(`#mon-disk-val-${ctx.winId}`);
      const diskBar = el.querySelector(`#mon-disk-bar-${ctx.winId}`);
      if (diskVal) diskVal.textContent = `${state.disk.free_gb || 0} GB Free (${state.disk.percent || 0}%)`;
      if (diskBar) diskBar.style.width = `${state.disk.percent || 0}%`;

      const scopeName = el.querySelector(`#mon-scope-name-${ctx.winId}`);
      if (scopeName) scopeName.textContent = state.activeOsName;
    };

    update(store.state);
    store.on('telemetry', update);

    return { unmount: () => {} };
  }
};
