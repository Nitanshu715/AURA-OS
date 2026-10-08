/**
 * AURA SHELL - Application Launcher (Ctrl+Space)
 * Fast modal launcher with categorized apps, system actions, memory recall, and natural-language agent fallback.
 */

import { store } from './store.js';

export class Launcher {
  constructor(wm, appsRegistry) {
    this.wm = wm;
    this.appsRegistry = appsRegistry;
    this.overlayEl = document.getElementById('launcher-overlay');
    this.inputEl = document.getElementById('launcher-input');
    this.resultsEl = document.getElementById('launcher-results-list');
    this.selectedIndex = 0;
    this.items = [];

    this.init();
  }

  init() {
    this.bindGlobalShortcuts();

    this.overlayEl?.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.close();
    });

    this.inputEl?.addEventListener('input', (e) => {
      this.filter(e.target.value);
    });

    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
        this.renderList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.execute();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });
  }

  bindGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+Space -> Open Launcher
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.overlayEl.classList.add('open');
    this.inputEl.value = '';
    this.filter('');
    this.selectedIndex = 0;
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close() {
    this.overlayEl.classList.remove('open');
  }

  isOpen() {
    return this.overlayEl.classList.contains('open');
  }

  filter(query) {
    const q = query.toLowerCase().trim();
    this.items = [];

    // 1. App Entries
    Object.keys(this.appsRegistry).forEach(appId => {
      const app = this.appsRegistry[appId];
      if (!q || app.title.toLowerCase().includes(q) || appId.includes(q)) {
        this.items.push({
          type: 'app',
          group: 'Applications',
          id: appId,
          title: app.title,
          desc: `Launch ${app.title} application`,
          icon: app.icon
        });
      }
    });

    // 2. Actions
    const actions = [
      { id: 'act_status', title: 'Check System Telemetry', cmd: 'status', group: 'Actions', icon: 'monitor' },
      { id: 'act_kernel', title: 'Probe Kernel: $ uname -a', cmd: '$ uname -a', group: 'Actions', icon: 'terminal' },
      { id: 'act_approvals', title: 'Review Pending Approvals', cmd: 'approvals', group: 'Actions', icon: 'approvals' }
    ];

    actions.forEach(a => {
      if (!q || a.title.toLowerCase().includes(q)) {
        this.items.push({
          type: 'action',
          group: 'Actions',
          id: a.id,
          title: a.title,
          cmd: a.cmd,
          icon: a.icon
        });
      }
    });

    // 3. Fallback: Natural language intent if no match or free text
    if (q.length > 0) {
      this.items.unshift({
        type: 'agent_intent',
        group: 'Agent Intent',
        id: 'agent_ask',
        title: `Ask agent: "${query}"`,
        prompt: query,
        icon: 'agent'
      });
    }

    this.selectedIndex = 0;
    this.renderList();
  }

  renderList() {
    if (!this.resultsEl) return;
    this.resultsEl.innerHTML = '';

    let currentGroup = '';
    this.items.forEach((item, idx) => {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        const groupEl = document.createElement('div');
        groupEl.className = 'launcher-group-title';
        groupEl.textContent = currentGroup;
        this.resultsEl.appendChild(groupEl);
      }

      const el = document.createElement('div');
      el.className = `launcher-item ${idx === this.selectedIndex ? 'active' : ''}`;
      el.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="launcher-item-icon" width="14" height="14"><use href="#icon-${item.icon}"></use></svg>
          <span>${item.title}</span>
        </div>
        <kbd style="font-size:9px;">↵</kbd>
      `;

      el.addEventListener('click', () => {
        this.selectedIndex = idx;
        this.execute();
      });

      this.resultsEl.appendChild(el);
    });
  }

  execute() {
    const item = this.items[this.selectedIndex];
    if (!item) return;

    this.close();

    if (item.type === 'app') {
      this.wm.createWindow(item.id);
    } else if (item.type === 'agent_intent') {
      const win = this.wm.createWindow('agent');
      if (win && win.appInstance && win.appInstance.sendPrompt) {
        win.appInstance.sendPrompt(item.prompt);
      }
    } else if (item.type === 'action') {
      if (item.cmd === 'approvals') {
        this.wm.createWindow('approvals');
      } else {
        const win = this.wm.createWindow('agent');
        if (win && win.appInstance && win.appInstance.sendPrompt) {
          win.appInstance.sendPrompt(item.cmd);
        }
      }
    }
  }
}
