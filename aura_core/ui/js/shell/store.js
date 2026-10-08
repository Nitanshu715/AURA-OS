/**
 * AURA-OS Client State Store
 * Single source of truth for real system telemetry, processes, files, and theme.
 * 100% Zero Fake Data.
 */

import { api } from './api.js';

class OSStore {
  constructor() {
    this.state = {
      isGuest: false,
      isLinux: false,
      osName: 'Host Environment',
      kernelRelease: 'unknown',
      arch: 'x86_64',
      hostname: 'AURA-OS',
      bootTime: 0,
      uptimeSeconds: 0,
      cpuPercent: 0,
      perCorePercent: [],
      memory: { total_mb: 0, used_mb: 0, available_mb: 0, percent: 0 },
      disks: [],
      network: [],
      healthStatus: 'ok',
      healthChecks: [],
      processes: [],
      services: [],
      pinnedApps: ['files', 'terminal', 'taskmgr', 'browser', 'snipping', 'editor', 'agent', 'settings'],
      runningWindows: [],
      focusedWindowId: null,
      currentTheme: {
        id: 'cyan',
        name: 'Quantum Cyan',
        accent: '#2DD4E0',
        accentSecondary: '#4FACFE',
        dim: 'rgba(45, 212, 224, 0.12)',
        glow: 'rgba(45, 212, 224, 0.35)',
        textDark: '#021214'
      },
      wallpaper: 'topographic',
      reducedMotion: false,
      audioVisualizerGain: 0.0,
      dataSourcesLog: []
    };

    this.listeners = new Map();
    this.history = {
      cpu: new Array(60).fill(0),
      ram: new Array(60).fill(0),
      net: new Array(60).fill(0)
    };

    this.init();
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  logDataSource(endpoint, status, error = null) {
    this.state.dataSourcesLog.unshift({
      endpoint,
      status,
      error,
      timestamp: new Date().toLocaleTimeString()
    });
    if (this.state.dataSourcesLog.length > 50) this.state.dataSourcesLog.pop();
  }

  async init() {
    await this.fetchSysInfo();
    await this.fetchHealth();
    await this.fetchStats();
    await this.fetchSettings();

    // Start Real Telemetry Polling Intervals
    setInterval(() => this.fetchStats(), 1000);
    setInterval(() => this.fetchHealth(), 4000);
    setInterval(() => this.fetchDisks(), 5000);
  }

  async fetchSysInfo() {
    try {
      const res = await api.get('/api/sys/info');
      if (res.ok && res.data) {
        const d = res.data;
        this.state.isGuest = d.is_guest;
        this.state.isLinux = (d.platform === 'linux');
        this.state.osName = d.os_name;
        this.state.kernelRelease = d.kernel_release;
        this.state.arch = d.arch;
        this.state.hostname = d.hostname;
        this.state.bootTime = d.boot_time;
        this.state.uptimeSeconds = d.uptime_seconds;
        this.logDataSource('/api/sys/info', 'ok');
        this.emit('sysInfoChanged', this.state);
      }
    } catch (e) {
      this.logDataSource('/api/sys/info', 'error', str(e));
    }
  }

  async fetchStats() {
    try {
      const res = await api.get('/api/sys/stats');
      if (res.ok && res.data) {
        const d = res.data;
        this.state.cpuPercent = d.cpu_percent;
        this.state.perCorePercent = d.per_core_percent || [];
        this.state.memory = d.memory;
        this.state.loadAvg = d.load_avg;

        this.history.cpu.shift();
        this.history.cpu.push(d.cpu_percent);

        this.history.ram.shift();
        this.history.ram.push(d.memory.percent);

        this.logDataSource('/api/sys/stats', 'ok');
        this.emit('statsChanged', this.state);
      }
    } catch (e) {
      this.logDataSource('/api/sys/stats', 'error', str(e));
    }
  }

  async fetchHealth() {
    try {
      const res = await api.get('/api/sys/health');
      if (res.ok && res.data) {
        this.state.healthStatus = res.data.status;
        this.state.healthChecks = res.data.checks;
        this.logDataSource('/api/sys/health', 'ok');
        this.emit('healthChanged', this.state);
      }
    } catch (e) {
      this.logDataSource('/api/sys/health', 'error', str(e));
    }
  }

  async fetchDisks() {
    try {
      const res = await api.get('/api/sys/disks');
      if (res.ok && res.data) {
        this.state.disks = res.data;
        this.logDataSource('/api/sys/disks', 'ok');
        this.emit('disksChanged', this.state.disks);
      }
    } catch (e) {
      this.logDataSource('/api/sys/disks', 'error', str(e));
    }
  }

  async fetchSettings() {
    try {
      const res = await api.get('/api/settings');
      if (res.ok && res.data) {
        this.setTheme(res.data.theme_accent || 'cyan', false);
        this.state.wallpaper = res.data.wallpaper || 'topographic';
        this.state.reducedMotion = Boolean(res.data.reduced_motion);
        this.emit('settingsChanged', res.data);
      }
    } catch (_) {}
  }

  setTheme(themeKey, persist = true) {
    const themes = {
      cyan: { id: 'cyan', name: 'Quantum Cyan', accent: '#2DD4E0', accentSecondary: '#4FACFE', dim: 'rgba(45, 212, 224, 0.12)', glow: 'rgba(45, 212, 224, 0.35)', textDark: '#021214' },
      violet: { id: 'violet', name: 'Cyber Violet', accent: '#8B7CFF', accentSecondary: '#C084FC', dim: 'rgba(139, 124, 255, 0.12)', glow: 'rgba(139, 124, 255, 0.35)', textDark: '#07041D' },
      emerald: { id: 'emerald', name: 'Matrix Emerald', accent: '#3DDC97', accentSecondary: '#34D399', dim: 'rgba(61, 220, 151, 0.12)', glow: 'rgba(61, 220, 151, 0.35)', textDark: '#011A10' },
      amber: { id: 'amber', name: 'Solar Amber', accent: '#F2B441', accentSecondary: '#FBBF24', dim: 'rgba(242, 180, 65, 0.12)', glow: 'rgba(242, 180, 65, 0.35)', textDark: '#1A1001' },
      rose: { id: 'rose', name: 'Neon Magenta', accent: '#EC4899', accentSecondary: '#F43F5E', dim: 'rgba(236, 72, 153, 0.12)', glow: 'rgba(236, 72, 153, 0.35)', textDark: '#1C030E' }
    };

    const t = themes[themeKey] || themes.cyan;
    this.state.currentTheme = t;

    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-secondary', t.accentSecondary);
    root.style.setProperty('--accent-dim', t.dim);
    root.style.setProperty('--accent-glow', t.glow);
    root.style.setProperty('--accent-text-dark', t.textDark);

    if (persist) {
      api.post('/api/settings', { theme_accent: t.id }).catch(() => {});
    }

    this.emit('themeChanged', t);
  }

  setCustomWallpaper(url) {
    this.state.customWallpaperUrl = url;
    this.emit('wallpaperChanged', url);
  }
}

export const store = new OSStore();
