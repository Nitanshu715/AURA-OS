/**
 * AURA-OS System Menu (Apple / Start Menu Style)
 * Quick access to About AURA-OS, App Store, Settings, Restart, and Workspace layouts.
 */

export class SystemMenu {
  constructor(wm) {
    this.wm = wm;
    this.menuEl = document.getElementById('system-menu');
    this.btnEl = document.getElementById('aura-system-trigger');
    this.init();
  }

  init() {
    this.btnEl?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    window.addEventListener('click', (e) => {
      if (this.isOpen() && !e.target.closest('#system-menu') && !e.target.closest('#aura-system-trigger')) {
        this.close();
      }
    });

    this.bindItems();
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.menuEl?.classList.add('open');
  }

  close() {
    this.menuEl?.classList.remove('open');
  }

  isOpen() {
    return this.menuEl?.classList.contains('open');
  }

  bindItems() {
    this.menuEl?.querySelectorAll('.system-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.getAttribute('data-action');
        this.close();

        if (action === 'about') {
          this.wm.createWindow('monitor', { title: 'About AURA-OS' });
        } else if (action === 'settings') {
          this.wm.createWindow('settings');
        } else if (action === 'models') {
          this.wm.createWindow('models');
        } else if (action === 'new_agent') {
          this.wm.createWindow('agent');
        } else if (action === 'new_term') {
          this.wm.createWindow('terminal');
        } else if (action === 'restart') {
          location.reload();
        }
      });
    });
  }
}
