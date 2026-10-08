/**
 * AURA-OS Floating Glass Dock Controller
 * macOS / Windows style bottom dock with hover magnification, active app indicators, and badges.
 */

import { store } from './store.js';

export class DockController {
  constructor(wm, appsRegistry) {
    this.wm = wm;
    this.appsRegistry = appsRegistry;
    this.container = document.getElementById('dock-container');
    this.dockItems = [
      { id: 'agent', title: 'Agent OS', icon: 'agent' },
      { id: 'terminal', title: 'Terminal', icon: 'terminal' },
      { id: 'monitor', title: 'System Monitor', icon: 'monitor' },
      { id: 'files', title: 'Files Explorer', icon: 'files' },
      { id: 'memory', title: 'Memory DB', icon: 'memory' },
      { id: 'approvals', title: 'Sandbox Twin', icon: 'approvals' },
      { id: 'code', title: 'Code Studio', icon: 'terminal' },
      { id: 'models', title: 'Model Hub', icon: 'models' },
      { id: 'settings', title: 'Settings', icon: 'settings' }
    ];

    this.init();
  }

  init() {
    this.render();
    store.on('windowsChanged', () => this.updateState());
    store.on('windowFocused', () => this.updateState());
    store.on('approvals', (list) => this.updateApprovalsBadge(list.length));
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    this.dockItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'dock-item';
      el.id = `dock-item-${item.id}`;
      el.setAttribute('data-app', item.id);

      el.innerHTML = `
        <svg><use href="#icon-${item.icon}"></use></svg>
        <span class="dock-tooltip">${item.title}</span>
        ${item.id === 'approvals' ? '<span class="dock-badge" id="dock-approvals-badge" style="display:none;">0</span>' : ''}
      `;

      el.addEventListener('click', () => {
        // If window exists on current workspace, focus it; else create it
        const list = this.wm.getWindowsList();
        const existing = list.find(w => w.appId === item.id && w.ws === store.state.activeWorkspace);
        if (existing) {
          this.wm.focusWindow(existing.id);
        } else {
          this.wm.createWindow(item.id);
        }
      });

      this.container.appendChild(el);
    });

    // Separator and Trash / Session Clear
    const sep = document.createElement('div');
    sep.className = 'dock-divider';
    this.container.appendChild(sep);

    const trash = document.createElement('div');
    trash.className = 'dock-item';
    trash.innerHTML = `
      <svg><use href="#icon-trash-2"></use></svg>
      <span class="dock-tooltip">Clear Transcript</span>
    `;
    trash.addEventListener('click', () => {
      store.emit('clearSession', true);
    });
    this.container.appendChild(trash);

    // Parabolic hover magnification with spring decay
    this.container.addEventListener('mousemove', (e) => {
      const mouseX = e.clientX;
      const items = this.container.querySelectorAll('.dock-item');
      items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const dist = Math.abs(mouseX - itemCenterX);
        const maxDist = 90;
        if (dist < maxDist) {
          const scale = 1.0 + 0.18 * Math.cos((dist / maxDist) * (Math.PI / 2));
          const translateY = -((scale - 1) * 16).toFixed(1);
          item.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY}px)`;
          item.style.zIndex = dist < 35 ? '20' : (dist < 70 ? '10' : '2');
        } else {
          item.style.transform = 'scale(1) translateY(0)';
          item.style.zIndex = '1';
        }
      });
    });

    this.container.addEventListener('mouseleave', () => {
      const items = this.container.querySelectorAll('.dock-item');
      items.forEach(item => {
        item.style.transform = 'scale(1) translateY(0)';
        item.style.zIndex = '1';
      });
    });

    this.updateState();
  }

  updateState() {
    const list = this.wm.getWindowsList();
    const currentWs = store.state.activeWorkspace;
    const runningAppIds = new Set(list.filter(w => w.ws === currentWs).map(w => w.appId));
    const focusedWin = list.find(w => w.focused);

    this.dockItems.forEach(item => {
      const el = document.getElementById(`dock-item-${item.id}`);
      if (!el) return;

      const isRunning = runningAppIds.has(item.id);
      const isFocused = (focusedWin && focusedWin.appId === item.id);

      el.classList.toggle('running', isRunning);
      el.classList.toggle('focused', isFocused);
    });
  }

  updateApprovalsBadge(count) {
    const badge = document.getElementById('dock-approvals-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }
}
