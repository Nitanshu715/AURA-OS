/**
 * AURA-OS Windows 11 Acrylic Start Menu Controller
 * Search, pinned apps, recommended recent files, user profile, and system power actions.
 * 100% Zero Fake Data.
 */

import { store } from './store.js';
import { api } from './api.js';

export class StartMenuController {
  constructor(wm) {
    this.wm = wm;
    this.menuEl = document.getElementById('start-menu');
    this.searchEl = document.getElementById('start-search-input');
    this.pinnedGrid = document.getElementById('start-pinned-grid');
    this.recentList = document.getElementById('start-recent-list');
    this.powerBtn = document.getElementById('start-power-btn');

    this.isOpen = false;
    this.init();
  }

  init() {
    this.renderPinnedApps();
    this.renderRecentFiles();
    this.bindEvents();

    window.addEventListener('aura-toggle-startmenu', () => this.toggle());
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.menuEl) {
      this.menuEl.classList.toggle('open', this.isOpen);
      if (this.isOpen && this.searchEl) {
        setTimeout(() => this.searchEl.focus(), 100);
        this.renderRecentFiles();
      }
    }
  }

  close() {
    if (this.isOpen) {
      this.isOpen = false;
      if (this.menuEl) this.menuEl.classList.remove('open');
    }
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const startBtn = document.getElementById('start-btn');
      if (this.isOpen && this.menuEl && !this.menuEl.contains(e.target) && !startBtn.contains(e.target)) {
        this.close();
      }
    });

    if (this.searchEl) {
      this.searchEl.addEventListener('input', (e) => {
        this.handleSearch(e.target.value.trim());
      });
      this.searchEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = this.searchEl.value.trim();
          if (val) {
            // Open Agent Copilot with instruction if not an exact app
            this.wm.openApp('agent', { initialPrompt: val });
            this.close();
          }
        }
      });
    }

    if (this.powerBtn) {
      this.powerBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('aura-contextmenu', {
          detail: {
            x: this.powerBtn.getBoundingClientRect().left,
            y: this.powerBtn.getBoundingClientRect().top - 100,
            items: [
              { label: 'Lock Screen', icon: 'lock', action: () => window.dispatchEvent(new CustomEvent('aura-lock-screen')) },
              { label: 'Restart Guest', icon: 'rotate-cw', action: () => {
                if (confirm('Restart the AURA-OS guest system?')) {
                  window.location.reload();
                }
              }},
              { label: 'Shut Down Guest', icon: 'power', action: () => {
                if (confirm('Shut down the AURA-OS session?')) {
                  window.close();
                }
              }}
            ]
          }
        }));
      });
    }
  }

  renderPinnedApps() {
    if (!this.pinnedGrid) return;
    this.pinnedGrid.innerHTML = '';

    const apps = [
      { id: 'files', name: 'File Explorer', icon: 'folder', tileClass: 'tile-files' },
      { id: 'terminal', name: 'Terminal', icon: 'terminal', tileClass: 'tile-terminal' },
      { id: 'taskmgr', name: 'Task Manager', icon: 'monitor', tileClass: 'tile-taskmgr' },
      { id: 'browser', name: 'Browser', icon: 'globe', tileClass: 'tile-browser' },
      { id: 'snipping', name: 'Snipping Tool', icon: 'camera', tileClass: 'tile-snipping' },
      { id: 'recorder', name: 'Recorder', icon: 'video', tileClass: 'tile-recorder' },
      { id: 'photos', name: 'Photos', icon: 'image', tileClass: 'tile-photos' },
      { id: 'media', name: 'Media Player', icon: 'music', tileClass: 'tile-media' },
      { id: 'editor', name: 'Text Editor', icon: 'file-text', tileClass: 'tile-editor' },
      { id: 'agent', name: 'AURA Copilot', icon: 'agent', tileClass: 'tile-agent' },
      { id: 'memory', name: 'Memory DB', icon: 'memory', tileClass: 'tile-memory' },
      { id: 'settings', name: 'Settings', icon: 'settings', tileClass: 'tile-settings' }
    ];

    apps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'start-app-item';
      item.innerHTML = `
        <div class="start-app-tile">
          <svg><use href="#icon-${app.icon}"></use></svg>
        </div>
        <span class="start-app-name">${app.name}</span>
      `;
      const launchApp = (e) => {
        if (e) e.stopPropagation();
        this.wm.openApp(app.id);
        this.close();
      };
      item.addEventListener('pointerup', (e) => {
        if (e.button === 0) launchApp(e);
      });
      item.addEventListener('mouseup', (e) => {
        if (e.button === 0) launchApp(e);
      });
      item.addEventListener('touchend', launchApp);
      item.addEventListener('click', launchApp);
      this.pinnedGrid.appendChild(item);
    });
  }

  async renderRecentFiles() {
    if (!this.recentList) return;
    this.recentList.innerHTML = '';

    let recent = [];
    try {
      const res = await api.get('/api/fs/list?path=~/Documents');
      if (res.ok && res.data && res.data.items) {
        recent = res.data.items.slice(0, 4);
      }
    } catch (_) {}

    if (recent.length === 0) {
      this.recentList.innerHTML = `<div style="grid-column: span 2; font-size:11px; color:var(--text-3);">No recent documents.</div>`;
      return;
    }

    recent.forEach(file => {
      const el = document.createElement('div');
      el.className = 'start-recent-item';
      el.innerHTML = `
        <svg width="18" height="18" style="color:var(--text-1);"><use href="#icon-file-text"></use></svg>
        <div style="overflow:hidden;">
          <div style="font-size:12px; font-weight:500; color:var(--text-0); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
          <div style="font-size:10px; color:var(--text-2);">Documents &middot; ${Math.round(file.size_bytes / 1024)} KB</div>
        </div>
      `;
      const openRecent = (e) => {
        if (e) e.stopPropagation();
        this.wm.openApp('editor', { path: file.path });
        this.close();
      };
      el.addEventListener('pointerup', (e) => {
        if (e.button === 0) openRecent(e);
      });
      el.addEventListener('mouseup', (e) => {
        if (e.button === 0) openRecent(e);
      });
      el.addEventListener('touchend', openRecent);
      el.addEventListener('click', openRecent);
      this.recentList.appendChild(el);
    });
  }

  handleSearch(query) {
    if (!query) {
      this.renderPinnedApps();
      return;
    }
    // Filter matching apps
    const all = [
      { id: 'files', name: 'File Explorer', icon: 'folder' },
      { id: 'terminal', name: 'Terminal', icon: 'terminal' },
      { id: 'taskmgr', name: 'Task Manager', icon: 'monitor' },
      { id: 'browser', name: 'Browser', icon: 'globe' },
      { id: 'snipping', name: 'Snipping Tool', icon: 'camera' },
      { id: 'recorder', name: 'Screen Recorder', icon: 'video' },
      { id: 'photos', name: 'Photos', icon: 'image' },
      { id: 'media', name: 'Media Player', icon: 'music' },
      { id: 'editor', name: 'Text Editor', icon: 'file-text' },
      { id: 'agent', name: 'AURA Copilot', icon: 'agent' },
      { id: 'memory', name: 'Memory DB', icon: 'memory' },
      { id: 'settings', name: 'Settings', icon: 'settings' }
    ];

    const matched = all.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
    this.pinnedGrid.innerHTML = '';
    matched.forEach(app => {
      const item = document.createElement('div');
      item.className = 'start-app-item';
      item.innerHTML = `
        <div class="start-app-tile"><svg><use href="#icon-${app.icon}"></use></svg></div>
        <span class="start-app-name">${app.name}</span>
      `;
      item.addEventListener('click', () => {
        this.wm.openApp(app.id);
        this.close();
      });
      this.pinnedGrid.appendChild(item);
    });
  }
}
