/**
 * AURA-OS Control Center & Quick Settings Controller
 * macOS / Windows style flyout with live toggles for isolation, theme accents, wallpaper, and models.
 */

import { store } from './store.js';

export class ControlCenter {
  constructor() {
    this.panelEl = document.getElementById('control-center-panel');
    this.init();
  }

  init() {
    // Toggle trigger in top bar
    document.getElementById('tray-cc-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    window.addEventListener('click', (e) => {
      if (this.isOpen() && !e.target.closest('#control-center-panel') && !e.target.closest('#tray-cc-toggle')) {
        this.close();
      }
    });

    this.bindControls();
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.panelEl?.classList.add('open');
  }

  close() {
    this.panelEl?.classList.remove('open');
  }

  isOpen() {
    return this.panelEl?.classList.contains('open');
  }

  bindControls() {
    // 1. Isolation Sandbox Toggle
    const isoToggle = document.getElementById('cc-isolation-toggle');
    isoToggle?.addEventListener('click', () => {
      store.state.isolationSupported = !store.state.isolationSupported;
      isoToggle.classList.toggle('active', store.state.isolationSupported);
      store.emit('telemetry', store.state);
    });

    // 2. Wallpaper Particles Toggle
    const wallToggle = document.getElementById('cc-wallpaper-toggle');
    wallToggle?.addEventListener('click', () => {
      if (window.auraWallpaper) {
        window.auraWallpaper.isEnabled = !window.auraWallpaper.isEnabled;
        wallToggle.classList.toggle('active', window.auraWallpaper.isEnabled);
      }
    });

    // 3. Theme Accent Color Swatches
    document.querySelectorAll('.theme-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        const glow = swatch.getAttribute('data-glow');
        if (color) {
          document.documentElement.style.setProperty('--accent', color);
          if (glow) document.documentElement.style.setProperty('--accent-glow', glow);
          document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        }
      });
    });
  }
}
