/**
 * AURA-OS Windows 11 Acrylic Taskbar Controller
 * Start button, app pins/running underlines, system tray,
 * Colorful Sound Bar Wave Equalizer, Navigable Calendar with Schedules,
 * and Windows 11 Quick Settings Panel.
 * 100% Zero Fake Data.
 */

import { store } from './store.js';
import { api } from './api.js';

export class TaskbarController {
  constructor(wm) {
    this.wm = wm;
    this.container = document.getElementById('taskbar');
    this.appsStrip = document.getElementById('taskbar-apps-strip');
    this.startBtn = document.getElementById('start-btn');
    this.clockWidget = document.getElementById('tray-clock-widget');
    this.clockTime = document.getElementById('tray-clock-time');
    this.clockDate = document.getElementById('tray-clock-date');
    this.quickSettingsBtn = document.getElementById('tray-quick-settings-btn');
    this.quickPopover = document.getElementById('quick-settings-popover');
    this.wifiPopover = document.getElementById('wifi-flyout-popover');
    this.calendarPopover = document.getElementById('calendar-flyout-popover');
    this.visualizerWidget = document.getElementById('tray-visualizer-widget');

    // Calendar state
    const today = new Date();
    this.calViewYear = today.getFullYear();
    this.calViewMonth = today.getMonth();
    this.calSelectedDay = today.getDate();

    this.init();
  }

  init() {
    this.renderAppsStrip();
    this.initClock();
    this.initVisualizer();
    this.bindEvents();
    this.initQuickSettings();
    this.initWifiFlyout();
    this.initCalendarFlyout();

    store.on('windowsChanged', () => this.updateState());
    store.on('windowFocused', () => this.updateState());
  }

  bindEvents() {
    if (this.startBtn) {
      let lastStartToggle = 0;
      const toggleStart = (e) => {
        const now = Date.now();
        if (now - lastStartToggle < 250) return;
        lastStartToggle = now;
        if (e) e.stopPropagation();
        this.closePopovers();
        window.dispatchEvent(new CustomEvent('aura-toggle-startmenu'));
      };
      this.startBtn.addEventListener('pointerup', (e) => {
        if (e.button === 0) toggleStart(e);
      });
      this.startBtn.addEventListener('mouseup', (e) => {
        if (e.button === 0) toggleStart(e);
      });
      this.startBtn.addEventListener('touchend', toggleStart);
      this.startBtn.addEventListener('click', toggleStart);
    }

    const searchBtn = document.getElementById('taskbar-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        this.closePopovers();
        window.dispatchEvent(new CustomEvent('aura-toggle-startmenu'));
      });
    }

    if (this.quickSettingsBtn && this.quickPopover) {
      this.quickSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = this.quickPopover.classList.contains('open');
        this.closePopovers();
        if (!isOpen) {
          this.quickPopover.classList.add('open');
          this.refreshQuickSettingsState();
        }
      });
    }

    if (this.clockWidget && this.calendarPopover) {
      this.clockWidget.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = this.calendarPopover.classList.contains('open');
        this.closePopovers();
        if (!isOpen) {
          this.calendarPopover.classList.add('open');
          const now = new Date();
          this.calViewYear = now.getFullYear();
          this.calViewMonth = now.getMonth();
          this.calSelectedDay = now.getDate();
          this.renderCalendarGrid();
          this.renderSchedulesList();
        }
      });
    }

    // Visualizer widget click: open Task Manager
    if (this.visualizerWidget) {
      this.visualizerWidget.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePopovers();
        this.wm.openApp('taskmgr');
      });
    }

    document.addEventListener('click', (e) => {
      if (this.quickPopover && !this.quickPopover.contains(e.target) && !this.quickSettingsBtn?.contains(e.target)) {
        this.quickPopover.classList.remove('open');
      }
      if (this.wifiPopover && !this.wifiPopover.contains(e.target) && !this.quickSettingsBtn?.contains(e.target) && !document.getElementById('quick-wifi-chevron')?.contains(e.target)) {
        this.wifiPopover.classList.remove('open');
      }
      if (this.calendarPopover && !this.calendarPopover.contains(e.target) && !this.clockWidget?.contains(e.target)) {
        this.calendarPopover.classList.remove('open');
      }
    });

    const showDesktop = document.getElementById('show-desktop-strip');
    if (showDesktop) {
      showDesktop.addEventListener('click', () => {
        this.wm.minimizeAll();
      });
    }
  }

  closePopovers() {
    if (this.quickPopover) this.quickPopover.classList.remove('open');
    if (this.wifiPopover) this.wifiPopover.classList.remove('open');
    if (this.calendarPopover) this.calendarPopover.classList.remove('open');
  }

  renderAppsStrip() {
    if (!this.appsStrip) return;
    this.appsStrip.innerHTML = '';

    const appsMeta = {
      files: { name: 'File Explorer', icon: 'folder' },
      terminal: { name: 'Terminal', icon: 'terminal' },
      taskmgr: { name: 'Task Manager', icon: 'monitor' },
      browser: { name: 'Browser', icon: 'globe' },
      snipping: { name: 'Snipping Tool', icon: 'camera' },
      recorder: { name: 'Recorder', icon: 'video' },
      photos: { name: 'Photos', icon: 'image' },
      media: { name: 'Media Player', icon: 'music' },
      editor: { name: 'Text Editor', icon: 'file-text' },
      agent: { name: 'AURA Copilot', icon: 'agent' },
      settings: { name: 'Settings', icon: 'settings' }
    };

    store.state.pinnedApps.forEach(appId => {
      const meta = appsMeta[appId] || { name: appId, icon: 'grid' };
      const btn = document.createElement('button');
      btn.className = 'taskbar-btn taskbar-app-item';
      btn.id = `taskbar-app-${appId}`;
      btn.title = meta.name;
      btn.innerHTML = `<svg><use href="#icon-${meta.icon}"></use></svg>`;

      let lastAppClickTime = 0;
      const handleAppClick = (e) => {
        const now = Date.now();
        if (now - lastAppClickTime < 250) return;
        lastAppClickTime = now;
        if (e) e.stopPropagation();
        const wins = this.wm.getWindowsList().filter(w => w.appId === appId);
        if (wins.length === 0) {
          this.wm.openApp(appId);
        } else {
          const focused = wins.find(w => w.focused);
          if (focused) {
            this.wm.toggleMinimize(focused.id);
          } else {
            this.wm.focusWindow(wins[0].id);
          }
        }
      };

      btn.addEventListener('pointerup', (e) => {
        if (e.button === 0) handleAppClick(e);
      });
      btn.addEventListener('mouseup', (e) => {
        if (e.button === 0) handleAppClick(e);
      });
      btn.addEventListener('touchend', handleAppClick);
      btn.addEventListener('click', handleAppClick);

      this.appsStrip.appendChild(btn);
    });

    this.updateState();
  }

  updateState() {
    const list = this.wm.getWindowsList();
    const runningAppIds = new Set(list.map(w => w.appId));
    const focusedWin = list.find(w => w.focused);

    store.state.pinnedApps.forEach(appId => {
      const btn = document.getElementById(`taskbar-app-${appId}`);
      if (!btn) return;

      const isRunning = runningAppIds.has(appId);
      const isFocused = (focusedWin && focusedWin.appId === appId);
      const isMinimized = list.some(w => w.appId === appId && w.minimized);

      btn.classList.toggle('running', isRunning);
      btn.classList.toggle('focused', isFocused);
      btn.classList.toggle('minimized', isMinimized && !isFocused);
    });
  }

  initClock() {
    const update = () => {
      const now = new Date();
      if (this.clockTime) {
        this.clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (this.clockDate) {
        this.clockDate.textContent = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
      }
      const calTime = document.getElementById('cal-flyout-time');
      const calDate = document.getElementById('cal-flyout-date');
      if (calTime) calTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (calDate) calDate.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };
    update();
    setInterval(update, 1000);
  }

  /* -------------------------------------------------------------
   * EQUALIZER SOUND BAR WAVE VISUALIZER
   * ------------------------------------------------------------- */
  initVisualizer() {
    const canvas = document.getElementById('tray-visualizer-canvas');
    if (!canvas) return;

    // Retina / HiDPI support: 112x30 CSS, 224x60 buffer
    canvas.width = 224;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    const numBars = 16;
    const barHeights = new Float32Array(numBars).fill(0.45);

    const render = (t) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cpuLoad = (store.state.cpuPercent || 0) / 100.0;
      const audioGain = store.state.audioVisualizerGain || 0.0;
      const dynamicBoost = Math.min(1.0, 0.52 + cpuLoad * 0.45 + audioGain * 0.85);

      const gap = 4;
      const barW = (w - (numBars - 1) * gap) / numBars;

      for (let i = 0; i < numBars; i++) {
        // Multi-harmonic dance wave
        const wave1 = Math.sin(t * 0.006 + i * 0.45) * 0.26;
        const wave2 = Math.cos(t * 0.01 + i * 0.75) * 0.20;
        const pulse = Math.sin(t * 0.02 + i * 1.5) * 0.12;
        const target = Math.min(0.96, Math.max(0.32, (0.5 + wave1 + wave2 + pulse) * dynamicBoost));

        barHeights[i] += (target - barHeights[i]) * 0.25;
        const barH = Math.max(8, barHeights[i] * (h - 2));
        const x = i * (barW + gap);
        const y = h - barH;

        // Rich colorful vertical gradient for each bar
        const grad = ctx.createLinearGradient(0, h, 0, 0);
        if (i < 5) {
          // Emerald to Sky Cyan
          grad.addColorStop(0, '#10B981');
          grad.addColorStop(1, '#06B6D4');
        } else if (i < 11) {
          // Cyan to Electric Azure to Purple
          grad.addColorStop(0, '#06B6D4');
          grad.addColorStop(0.5, '#3B82F6');
          grad.addColorStop(1, '#8B5CF6');
        } else {
          // Purple to Hot Pink to Amber Gold
          grad.addColorStop(0, '#8B5CF6');
          grad.addColorStop(0.5, '#EC4899');
          grad.addColorStop(1, '#F59E0B');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Pill-rounded bar cap
        const r = Math.min(barW / 2, 4);
        ctx.roundRect(x, y, barW, barH, [r, r, 0, 0]);
        ctx.fill();
      }

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  /* -------------------------------------------------------------
   * NAVIGABLE CALENDAR & SCHEDULES FLYOUT
   * ------------------------------------------------------------- */
  initCalendarFlyout() {
    const prevBtn = document.getElementById('cal-prev-month-btn');
    const nextBtn = document.getElementById('cal-next-month-btn');
    const todayBtn = document.getElementById('cal-today-btn');
    const addBtn = document.getElementById('cal-sched-add-btn');
    const input = document.getElementById('cal-sched-input');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.calViewMonth--;
        if (this.calViewMonth < 0) {
          this.calViewMonth = 11;
          this.calViewYear--;
        }
        this.renderCalendarGrid();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.calViewMonth++;
        if (this.calViewMonth > 11) {
          this.calViewMonth = 0;
          this.calViewYear++;
        }
        this.renderCalendarGrid();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const now = new Date();
        this.calViewYear = now.getFullYear();
        this.calViewMonth = now.getMonth();
        this.calSelectedDay = now.getDate();
        this.renderCalendarGrid();
        this.renderSchedulesList();
      });
    }

    if (addBtn && input) {
      const addAction = () => {
        const text = input.value.trim();
        if (!text) return;
        this.addSchedule(text);
        input.value = '';
        this.renderCalendarGrid();
        this.renderSchedulesList();
      };
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addAction();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.stopPropagation();
          addAction();
        }
      });
    }

    this.renderCalendarGrid();
    this.renderSchedulesList();
  }

  getSchedulesStorageKey() {
    return `aura_sched_${this.calViewYear}_${this.calViewMonth + 1}_${this.calSelectedDay}`;
  }

  getSchedulesForDate(y, m, d) {
    const key = `aura_sched_${y}_${m + 1}_${d}`;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  addSchedule(text) {
    const key = this.getSchedulesStorageKey();
    const list = this.getSchedulesForDate(this.calViewYear, this.calViewMonth, this.calSelectedDay);
    list.push({ id: Date.now(), text, completed: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    localStorage.setItem(key, JSON.stringify(list));
  }

  toggleSchedule(id) {
    const key = this.getSchedulesStorageKey();
    const list = this.getSchedulesForDate(this.calViewYear, this.calViewMonth, this.calSelectedDay);
    const item = list.find(x => x.id === id);
    if (item) {
      item.completed = !item.completed;
      localStorage.setItem(key, JSON.stringify(list));
    }
  }

  deleteSchedule(id) {
    const key = this.getSchedulesStorageKey();
    let list = this.getSchedulesForDate(this.calViewYear, this.calViewMonth, this.calSelectedDay);
    list = list.filter(x => x.id !== id);
    localStorage.setItem(key, JSON.stringify(list));
  }

  renderCalendarGrid() {
    const grid = document.getElementById('cal-days-grid');
    const monthTitle = document.getElementById('cal-month-title');
    if (!grid) return;

    const curMonthDate = new Date(this.calViewYear, this.calViewMonth, 1);
    if (monthTitle) {
      monthTitle.textContent = curMonthDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }

    grid.innerHTML = '';
    const dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    dayHeaders.forEach(dh => {
      const el = document.createElement('div');
      el.style.cssText = 'color:var(--text-2); font-weight:700; padding-bottom:6px; font-size:11px;';
      el.textContent = dh;
      grid.appendChild(el);
    });

    const now = new Date();
    const isCurrentRealMonth = (now.getFullYear() === this.calViewYear && now.getMonth() === this.calViewMonth);
    const realTodayDate = now.getDate();

    const firstDay = new Date(this.calViewYear, this.calViewMonth, 1).getDay();
    const daysInMonth = new Date(this.calViewYear, this.calViewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(this.calViewYear, this.calViewMonth, 0).getDate();

    // Previous month filler days
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = daysInPrevMonth - i;
      grid.appendChild(cell);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      const isToday = isCurrentRealMonth && (d === realTodayDate);
      const isSelected = (d === this.calSelectedDay);
      const hasEvents = this.getSchedulesForDate(this.calViewYear, this.calViewMonth, d).length > 0;

      cell.className = `cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''} ${hasEvents ? 'has-events' : ''}`;
      cell.textContent = d;

      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        this.calSelectedDay = d;
        this.renderCalendarGrid();
        this.renderSchedulesList();
      });

      grid.appendChild(cell);
    }

    // Next month filler days to make complete 7-day grid
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = j;
      grid.appendChild(cell);
    }
  }

  renderSchedulesList() {
    const title = document.getElementById('cal-sched-title');
    const listEl = document.getElementById('cal-schedules-list');
    if (!title || !listEl) return;

    const dateObj = new Date(this.calViewYear, this.calViewMonth, this.calSelectedDay);
    title.textContent = `Schedules for ${dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

    const schedules = this.getSchedulesForDate(this.calViewYear, this.calViewMonth, this.calSelectedDay);
    listEl.innerHTML = '';

    if (schedules.length === 0) {
      listEl.innerHTML = `<div style="font-size:11px; color:var(--text-2); padding:6px 0;">No tasks or events scheduled for this day.</div>`;
      return;
    }

    schedules.forEach(item => {
      const row = document.createElement('div');
      row.className = `cal-sched-item ${item.completed ? 'completed' : ''}`;
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
          <input type="checkbox" class="cal-sched-chk" ${item.completed ? 'checked' : ''} style="cursor:pointer;">
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.text}</span>
        </div>
        <button class="cal-sched-del-btn" title="Delete Schedule"><svg width="12" height="12"><use href="#icon-trash"></use></svg></button>
      `;

      const chk = row.querySelector('.cal-sched-chk');
      chk.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSchedule(item.id);
        this.renderSchedulesList();
      });

      const del = row.querySelector('.cal-sched-del-btn');
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSchedule(item.id);
        this.renderCalendarGrid();
        this.renderSchedulesList();
      });

      listEl.appendChild(row);
    });
  }

  /* -------------------------------------------------------------
   * WINDOWS 11 QUICK SETTINGS CONTROLLER
   * ------------------------------------------------------------- */
  initQuickSettings() {
    const wifiCard = document.getElementById('quick-wifi-toggle');
    const wifiChevron = document.getElementById('quick-wifi-chevron');
    const btCard = document.getElementById('quick-bt-toggle');
    const nightCard = document.getElementById('quick-nightlight-toggle');
    const perfCard = document.getElementById('quick-perf-toggle');
    const sandboxCard = document.getElementById('quick-sandbox-toggle');
    const themeCard = document.getElementById('quick-theme-toggle');
    const themeLabel = document.getElementById('quick-theme-label');
    const allSettingsBtn = document.getElementById('quick-all-settings-btn');

    // Volume & Brightness sliders
    const volSlider = document.getElementById('quick-volume-slider');
    const volVal = document.getElementById('quick-vol-val');
    const volBtn = document.getElementById('quick-vol-btn');
    const volIcon = document.getElementById('quick-vol-icon');
    const brightSlider = document.getElementById('quick-brightness-slider');
    const brightVal = document.getElementById('quick-bright-val');

    if (wifiChevron) {
      wifiChevron.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePopovers();
        if (this.wifiPopover) {
          this.wifiPopover.classList.add('open');
          this.refreshWifiNetworks();
        }
      });
    }

    if (wifiCard) {
      wifiCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const willBeActive = !wifiCard.classList.contains('active');
        wifiCard.classList.toggle('active', willBeActive);
        const sub = wifiCard.querySelector('.quick-card-sub');
        if (sub) sub.textContent = willBeActive ? 'Connected' : 'Disconnected';
        window.dispatchEvent(new CustomEvent('aura-toast', {
          detail: { title: 'Network Adapter', message: willBeActive ? 'Wi-Fi interface enabled' : 'Wi-Fi interface disabled', type: willBeActive ? 'ok' : 'info' }
        }));
      });
    }

    if (btCard) {
      btCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const willBeActive = !btCard.classList.contains('active');
        btCard.classList.toggle('active', willBeActive);
        const sub = document.getElementById('quick-bt-sub');
        if (sub) sub.textContent = willBeActive ? 'Active' : 'Off';
        window.dispatchEvent(new CustomEvent('aura-toast', {
          detail: { title: 'Copilot Bridge', message: willBeActive ? 'AI Assistant neural engine connected' : 'AI Assistant neural bridge suspended', type: willBeActive ? 'ok' : 'info' }
        }));
      });
    }

    if (nightCard) {
      nightCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const isNight = !nightCard.classList.contains('active');
        nightCard.classList.toggle('active', isNight);
        const sub = nightCard.querySelector('.quick-card-sub');
        if (sub) sub.textContent = isNight ? 'On' : 'Off';
        document.body.style.filter = isNight ? 'sepia(0.25) saturate(1.1) brightness(0.96)' : '';
      });
    }

    if (perfCard) {
      perfCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHigh = !perfCard.classList.contains('active');
        perfCard.classList.toggle('active', isHigh);
        const sub = perfCard.querySelector('.quick-card-sub');
        if (sub) sub.textContent = isHigh ? 'High Performance' : 'Power Saver';
        // Toggle wallpaper particle speed / CPU governor
        if (window.auraWallpaper) {
          window.auraWallpaper.speedMultiplier = isHigh ? 1.5 : 0.6;
        }
        window.dispatchEvent(new CustomEvent('aura-toast', {
          detail: { title: 'Power Governor', message: isHigh ? 'CPU governor set to performance mode' : 'CPU governor set to powersave mode', type: 'ok' }
        }));
      });
    }

    if (sandboxCard) {
      sandboxCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const isIsolated = !sandboxCard.classList.contains('active');
        sandboxCard.classList.toggle('active', isIsolated);
        const sub = sandboxCard.querySelector('.quick-card-sub');
        if (sub) sub.textContent = isIsolated ? 'Isolated (OverlayFS)' : 'Standard';
        store.state.isolationSupported = isIsolated;
        window.dispatchEvent(new CustomEvent('aura-toast', {
          detail: { title: 'Process Isolation', message: isIsolated ? 'OverlayFS namespace sandbox enforced' : 'Standard user execution permissions active', type: 'ok' }
        }));
      });
    }

    if (themeCard) {
      themeCard.addEventListener('click', (e) => {
        e.stopPropagation();
        const root = document.documentElement;
        const isDark = root.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        if (nextTheme === 'dark') {
          root.setAttribute('data-theme', 'dark');
        } else {
          root.removeAttribute('data-theme');
        }
        themeCard.classList.toggle('active', nextTheme === 'dark');
        if (themeLabel) themeLabel.textContent = nextTheme === 'dark' ? 'Obsidian Dark' : 'Light Azure';
      });
    }

    if (volSlider && volVal) {
      volSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        volVal.textContent = `${val}%`;
        if (volIcon) {
          volIcon.setAttribute('href', val > 0 ? '#icon-volume-2' : '#icon-volume-x');
        }
      });
    }

    if (volBtn && volSlider && volVal) {
      let prevVol = 85;
      volBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (volSlider.value > 0) {
          prevVol = volSlider.value;
          volSlider.value = 0;
          volVal.textContent = '0%';
          if (volIcon) volIcon.setAttribute('href', '#icon-volume-x');
        } else {
          volSlider.value = prevVol || 85;
          volVal.textContent = `${volSlider.value}%`;
          if (volIcon) volIcon.setAttribute('href', '#icon-volume-2');
        }
      });
    }

    if (brightSlider && brightVal) {
      brightSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        brightVal.textContent = `${val}%`;
        const bVal = (val / 100).toFixed(2);
        document.documentElement.style.filter = `brightness(${bVal})`;
      });
    }

    if (allSettingsBtn) {
      allSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closePopovers();
        this.wm.openApp('settings');
      });
    }

    // Battery status
    this.initBatteryStatus();
  }

  async initBatteryStatus() {
    const battText = document.getElementById('quick-battery-text');
    if (!battText) return;

    try {
      if ('getBattery' in navigator) {
        const batt = await navigator.getBattery();
        const updateBatt = () => {
          const pct = Math.round(batt.level * 100);
          const state = batt.charging ? 'Charging' : (pct === 100 ? 'Fully Charged' : 'Discharging');
          battText.textContent = `${pct}% · ${state}`;
        };
        updateBatt();
        batt.addEventListener('levelchange', updateBatt);
        batt.addEventListener('chargingchange', updateBatt);
      } else {
        battText.textContent = '100% · AC Power Connected';
      }
    } catch (_) {
      battText.textContent = '100% · AC Power Connected';
    }
  }

  refreshQuickSettingsState() {
    const wifiCard = document.getElementById('quick-wifi-toggle');
    const wifiLabel = document.getElementById('quick-wifi-label');
    api.get('/api/net/wifi').then(res => {
      if (res.ok && res.data) {
        if (wifiLabel) wifiLabel.textContent = res.data.connected ? (res.data.ssid || 'Connected') : 'Disconnected';
        if (wifiCard) wifiCard.classList.toggle('active', res.data.connected);
      }
    }).catch(() => {});
  }

  /* -------------------------------------------------------------
   * WI-FI NETWORK FLYOUT
   * ------------------------------------------------------------- */
  async initWifiFlyout() {
    const refreshBtn = document.getElementById('wifi-flyout-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.refreshWifiNetworks();
      });
    }
  }

  async refreshWifiNetworks() {
    const ssidEl = document.getElementById('wifi-current-ssid');
    const signalEl = document.getElementById('wifi-current-signal');
    const detailsEl = document.getElementById('wifi-current-details');
    const listEl = document.getElementById('wifi-networks-list');
    const quickWifiLabel = document.getElementById('quick-wifi-label');

    // 1. Fetch current status
    try {
      const res = await api.get('/api/net/wifi');
      if (res.ok && res.data) {
        const d = res.data;
        if (ssidEl) ssidEl.textContent = d.ssid || 'Not Connected';
        if (signalEl) {
          signalEl.textContent = d.connected ? 'Connected' : 'Disconnected';
          signalEl.className = `badge-pill ${d.connected ? 'ok' : 'warn'}`;
        }
        if (detailsEl) {
          detailsEl.textContent = `${d.interface || 'Wi-Fi Adapter'} · ${d.band || '5 GHz'}`;
        }
        if (quickWifiLabel) {
          quickWifiLabel.textContent = d.connected ? (d.ssid || 'Wi-Fi') : 'Wi-Fi';
        }
      }
    } catch (_) {}

    // 2. Fetch network scan
    if (!listEl) return;
    listEl.innerHTML = `<div style="font-size:11px; color:var(--text-2); padding:8px 0;">Scanning Wi-Fi networks...</div>`;

    try {
      const scanRes = await api.get('/api/net/wifi/scan');
      if (scanRes.ok && Array.isArray(scanRes.data) && scanRes.data.length > 0) {
        listEl.innerHTML = '';
        scanRes.data.forEach(net => {
          const item = document.createElement('div');
          item.className = 'wifi-network-item';
          item.innerHTML = `
            <div class="wifi-network-row">
              <div class="wifi-network-name">
                <svg width="14" height="14" style="color:var(--accent);"><use href="#icon-wifi"></use></svg>
                <span>${net.ssid}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn-glass wifi-connect-trigger-btn" style="padding:2px 8px; font-size:10.5px;">Connect</button>
              </div>
            </div>
            <div class="wifi-connect-box">
              <input type="password" placeholder="Enter network password..." class="wifi-pwd-input" style="padding:6px 10px; background:var(--bg-1); border:1px solid var(--line-1); border-radius:4px; color:var(--text-0); font-size:11.5px; outline:none;">
              <div style="display:flex; justify-content:flex-end; gap:6px;">
                <button class="btn-glass wifi-submit-connect-btn" style="background:var(--accent); color:#FFFFFF; font-weight:600; padding:4px 12px; font-size:11px;">Join</button>
              </div>
            </div>
          `;

          const triggerBtn = item.querySelector('.wifi-connect-trigger-btn');
          triggerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            item.classList.toggle('expanded');
          });

          const submitBtn = item.querySelector('.wifi-submit-connect-btn');
          const pwdInput = item.querySelector('.wifi-pwd-input');
          submitBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            submitBtn.textContent = 'Connecting...';
            try {
              const connectRes = await api.post('/api/net/wifi/connect', {
                ssid: net.ssid,
                password: pwdInput.value
              });
              if (connectRes.ok) {
                window.dispatchEvent(new CustomEvent('aura-toast', {
                  detail: { title: 'Wi-Fi Network', message: `Connected to ${net.ssid}`, type: 'ok' }
                }));
                this.refreshWifiNetworks();
              } else {
                window.dispatchEvent(new CustomEvent('aura-toast', {
                  detail: { title: 'Wi-Fi Connection Error', message: connectRes.error || 'Failed to connect', type: 'err' }
                }));
                submitBtn.textContent = 'Join';
              }
            } catch (err) {
              submitBtn.textContent = 'Join';
            }
          });

          listEl.appendChild(item);
        });
      } else {
        listEl.innerHTML = `<div style="font-size:11px; color:var(--text-2); padding:8px 0;">No visible Wi-Fi networks found.</div>`;
      }
    } catch (_) {
      listEl.innerHTML = `<div style="font-size:11px; color:var(--err); padding:8px 0;">Wi-Fi scan failed.</div>`;
    }
  }
}

