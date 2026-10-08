/**
 * AURA-OS Command Palette & Color Legend Component (Pass 2)
 * Fuzzy command execution and subsystem color meaning guide.
 */

export class CommandPalette {
  constructor(options = {}) {
    this.modalEl = document.getElementById('palette-modal');
    this.inputEl = document.getElementById('palette-search-field');
    this.listEl = document.getElementById('palette-items-list');
    this.onSelect = options.onSelect || (() => {});
    this.selectedIndex = 0;

    this.commands = [
      { id: 'status', label: 'Inspect System Telemetry & Namespaces', category: 'System', tagClass: 'tag-system', shortcut: 'Ctrl+1', icon: 'activity' },
      { id: 'memory', label: 'View Knowledge Base Daemon Store', category: 'Memory', tagClass: 'tag-memory', shortcut: 'Ctrl+2', icon: 'database' },
      { id: 'sandbox', label: 'Inspect Digital Twin OverlayFS', category: 'Sandbox', tagClass: 'tag-sandbox', shortcut: 'Ctrl+3', icon: 'box' },
      { id: 'exec_uname', label: 'Kernel Architecture Probe: $ uname -a', category: 'Shell', tagClass: 'tag-system', shortcut: '$', icon: 'terminal' },
      { id: 'exec_ps', label: 'List Active System Processes: $ ps aux', category: 'Shell', tagClass: 'tag-system', shortcut: '$', icon: 'terminal' },
      { id: 'exec_df', label: 'Inspect Filesystem Usage: $ df -h', category: 'Shell', tagClass: 'tag-system', shortcut: '$', icon: 'terminal' },
      { id: 'clear_session', label: 'Clear Session Transcript', category: 'Workspace', tagClass: 'tag-agent', shortcut: 'Ctrl+L', icon: 'trash-2' },
      { id: 'toggle_inspector', label: 'Toggle Inspector Sidebar', category: 'View', tagClass: 'tag-system', shortcut: 'Ctrl+B', icon: 'sidebar' }
    ];

    this.filtered = [...this.commands];
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    this.modalEl?.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    this.inputEl?.addEventListener('input', (e) => {
      this.filter(e.target.value);
    });

    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filtered.length - 1);
        this.render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.execute();
      }
    });
  }

  open() {
    this.modalEl.classList.add('open');
    this.inputEl.value = '';
    this.filtered = [...this.commands];
    this.selectedIndex = 0;
    this.render();
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close() {
    this.modalEl.classList.remove('open');
  }

  isOpen() {
    return this.modalEl.classList.contains('open');
  }

  filter(q) {
    const query = q.toLowerCase().trim();
    if (!query) {
      this.filtered = [...this.commands];
    } else {
      this.filtered = this.commands.filter(c =>
        c.label.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    }
    this.selectedIndex = 0;
    this.render();
  }

  render() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (this.filtered.length === 0) {
      this.listEl.innerHTML = `<div style="padding:16px; font-size:12px; color:var(--text-3); text-align:center;">No matching commands found.</div>`;
      return;
    }

    this.filtered.forEach((cmd, idx) => {
      const el = document.createElement('div');
      el.className = `palette-entry ${idx === this.selectedIndex ? 'active' : ''}`;
      el.innerHTML = `
        <div class="palette-entry-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <use href="#icon-${cmd.icon}"></use>
          </svg>
          <span>${cmd.label}</span>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="tech-tag ${cmd.tagClass}">${cmd.category}</span>
          ${cmd.shortcut ? `<kbd>${cmd.shortcut}</kbd>` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        this.selectedIndex = idx;
        this.execute();
      });

      this.listEl.appendChild(el);
    });
  }

  execute() {
    const cmd = this.filtered[this.selectedIndex];
    if (cmd) {
      this.close();
      this.onSelect(cmd);
    }
  }
}
