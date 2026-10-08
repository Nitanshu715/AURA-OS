/**
 * AURA-OS Inspector Component (Pass 2)
 * Manages Telemetry, Sandbox, and Memory tabs with hairline dividers,
 * 56px sparkline charts with delta calculations, and 72px signal monitor.
 */

import { TelemetryChart } from '../viz/sparkline.js';
import { SignalVisualizer } from '../viz/spectrum.js';

export class Inspector {
  constructor(api, onRunCommand = () => {}) {
    this.api = api;
    this.onRunCommand = onRunCommand;
    this.activeTab = 'telemetry';
    this.previousCpu = 0;
    this.previousRam = 0;

    // Visualizer instances
    this.cpuChart = null;
    this.ramChart = null;
    this.signal = null;

    this.init();
  }

  init() {
    this.bindTabEvents();
    this.initCharts();
  }

  bindTabEvents() {
    const tabs = document.querySelectorAll('.inspector-nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });

    // Memory filter
    const memFilter = document.getElementById('inspector-memory-filter');
    memFilter?.addEventListener('input', (e) => {
      this.filterMemory(e.target.value);
    });

    // Pause signal monitor
    const pauseBtn = document.getElementById('signal-pause-btn');
    pauseBtn?.addEventListener('click', () => {
      if (this.signal) {
        const isPaused = this.signal.togglePause();
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
      }
    });
  }

  initCharts() {
    const cpuCanvas = document.getElementById('cpu-chart-canvas');
    const cpuValEl = document.getElementById('cpu-hero-val');
    if (cpuCanvas) {
      this.cpuChart = new TelemetryChart(cpuCanvas, cpuValEl, { maxVal: 100, unit: '%' });
    }

    const ramCanvas = document.getElementById('ram-chart-canvas');
    const ramValEl = document.getElementById('ram-hero-val');
    if (ramCanvas) {
      this.ramChart = new TelemetryChart(ramCanvas, ramValEl, { maxVal: 100, unit: '%' });
    }

    const sigCanvas = document.getElementById('signal-chart-canvas');
    if (sigCanvas) {
      this.signal = new SignalVisualizer(sigCanvas, 32);
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.inspector-nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.inspector-body').forEach(b => {
      b.classList.toggle('active', b.id === `tab-${tabId}`);
    });

    if (tabId === 'memory') {
      this.refreshMemory();
    }
  }

  updateTelemetry(data) {
    if (!data) return;

    // CPU
    const cpuVal = Math.round(data.cpu_percent || 0);
    const cpuDelta = cpuVal - this.previousCpu;
    this.previousCpu = cpuVal;
    const cpuDeltaEl = document.getElementById('cpu-delta-val');
    if (cpuDeltaEl) {
      cpuDeltaEl.textContent = cpuDelta >= 0 ? `+${cpuDelta}% vs 10s` : `${cpuDelta}% vs 10s`;
    }
    if (this.cpuChart) this.cpuChart.push(cpuVal);

    // RAM
    const ram = data.memory || {};
    const ramPct = Math.round(ram.percent || 0);
    const ramDelta = ramPct - this.previousRam;
    this.previousRam = ramPct;
    const ramDeltaEl = document.getElementById('ram-delta-val');
    if (ramDeltaEl) {
      ramDeltaEl.textContent = `${ram.used_mb || 0} / ${ram.total_mb || 0} MB`;
    }
    if (this.ramChart) this.ramChart.push(ramPct);

    // Disk
    const disk = data.disk || {};
    const diskValEl = document.getElementById('fact-disk-val');
    const diskBarEl = document.getElementById('fact-disk-bar');
    if (diskValEl) {
      diskValEl.textContent = `${disk.free_gb || 0} GB Free (${disk.percent || 0}%)`;
    }
    if (diskBarEl) {
      diskBarEl.style.width = `${disk.percent || 0}%`;
    }

    // Kernel & Arch
    const kernelEl = document.getElementById('fact-kernel-val');
    if (kernelEl && data.os_name) kernelEl.textContent = data.os_name;

    const archEl = document.getElementById('fact-arch-val');
    if (archEl && data.cpu_arch) archEl.textContent = data.cpu_arch;

    // Namespaces (6 tags: PID, MNT, NET, IPC, UTS, USER)
    const nsContainer = document.getElementById('fact-namespaces-list');
    if (nsContainer) {
      const activeNs = new Set(data.namespaces || []);
      const standardList = ['pid', 'mnt', 'net', 'ipc', 'uts', 'user'];
      nsContainer.innerHTML = standardList.map(ns => {
        const isActive = activeNs.has(ns);
        const dotClass = isActive ? 'dot-persist' : 'dot-sandbox';
        return `
          <span class="tech-tag" style="font-size:10px;">
            <span class="status-dot ${dotClass}"></span>
            ${ns.toUpperCase()}
          </span>
        `;
      }).join('');
    }

    // Top Bar Chip Updates
    const isolChipVal = document.getElementById('chip-isolation-val');
    const isolChipDot = document.getElementById('chip-isolation-dot');
    if (isolChipVal && isolChipDot) {
      if (data.isolation_supported) {
        isolChipVal.textContent = 'OverlayFS (active)';
        isolChipDot.className = 'status-dot dot-persist';
      } else {
        isolChipVal.textContent = 'Host mode (not isolated)';
        isolChipDot.className = 'status-dot dot-sandbox';
      }
    }

    const uptimeEl = document.getElementById('chip-uptime-val');
    if (uptimeEl && data.uptime_seconds) {
      const up = Math.floor(data.uptime_seconds % 86400);
      const h = Math.floor(up / 3600).toString().padStart(2, '0');
      const m = Math.floor((up % 3600) / 60).toString().padStart(2, '0');
      uptimeEl.textContent = `${h}:${m}h`;
    }

    // Status bar latency / uptime
    const statUptime = document.getElementById('status-uptime-val');
    if (statUptime && data.uptime_seconds) {
      const up = Math.floor(data.uptime_seconds % 86400);
      const h = Math.floor(up / 3600).toString().padStart(2, '0');
      const m = Math.floor((up % 3600) / 60).toString().padStart(2, '0');
      const s = Math.floor(up % 60).toString().padStart(2, '0');
      statUptime.textContent = `${h}:${m}:${s}`;
    }
  }

  async refreshMemory() {
    const list = await this.api.getKnowledge();
    const tbody = document.getElementById('memory-table-rows');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-3); padding:16px;">No records stored.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => `
      <tr>
        <td><span class="tech-tag tag-memory">${r.category || 'user'}</span></td>
        <td class="data-mono" style="color:var(--text-0);">${r.key}</td>
        <td class="data-mono" style="color:var(--text-1);">${r.value}</td>
      </tr>
    `).join('');
  }

  filterMemory(query) {
    const q = query.toLowerCase().trim();
    const rows = document.querySelectorAll('#memory-table-rows tr');
    rows.forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
}
