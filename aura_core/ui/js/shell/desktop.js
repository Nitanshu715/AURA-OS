/**
 * AURA-OS Desktop Surface Controller
 * Light-Blue Executive wallpaper canvas, custom photo wallpaper support, vibrant icons, and selection.
 * 100% Zero Fake Data.
 */

import { store } from './store.js';
import { api } from './api.js';

export class DesktopController {
  constructor(wm) {
    this.wm = wm;
    this.surface = document.getElementById('desktop-surface');
    this.canvas = document.getElementById('wallpaper-canvas');
    this.iconsContainer = document.getElementById('desktop-icons-container');
    this.marquee = document.getElementById('marquee-box');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.selectedIcons = new Set();
    this.dragStart = null;
    this.animFrame = null;
    this.auroraPhase = 0;
    this.wallpaperImageObj = null;

    this.init();
  }

  init() {
    this.initWallpaper();
    this.renderDesktopIcons();
    this.bindMarqueeSelection();
    this.bindContextMenu();

    store.on('settingsChanged', () => this.drawWallpaper());
    store.on('themeChanged', () => this.drawWallpaper());
    store.on('wallpaperChanged', (url) => this.loadCustomWallpaper(url));
  }

  loadCustomWallpaper(url) {
    if (!url) {
      this.wallpaperImageObj = null;
      this.drawWallpaper();
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.wallpaperImageObj = img;
      this.drawWallpaper();
    };
    img.src = url;
  }

  initWallpaper() {
    if (!this.canvas) return;
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.drawWallpaper();
    };
    window.addEventListener('resize', resize);
    resize();

    // Subtle serene light flow animation
    const loop = () => {
      if (!this.wallpaperImageObj) {
        this.auroraPhase += 0.003;
        this.drawWallpaper();
      }
      this.animFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  drawWallpaper() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const theme = store.state.currentTheme;

    // If a custom image wallpaper is active, draw it stretched/covered
    if (this.wallpaperImageObj) {
      const img = this.wallpaperImageObj;
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;
      let drawW, drawH, drawX, drawY;

      if (canvasRatio > imgRatio) {
        drawW = w;
        drawH = w / imgRatio;
        drawX = 0;
        drawY = (h - drawH) / 2;
      } else {
        drawH = h;
        drawW = h * imgRatio;
        drawX = (w - drawW) / 2;
        drawY = 0;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      return;
    }

    const mode = store.state.wallpaper || 'aurora';

    if (mode === 'aurora' || mode === 'light') {
      // Professional Light Blue & Frosted White Sky Palette
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#E0F2FE');
      bgGrad.addColorStop(0.35, '#BAE6FD');
      bgGrad.addColorStop(0.7, '#E0E7FF');
      bgGrad.addColorStop(1, '#F0FDFA');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Ribbon 1: Luminous Sky Azure
      const p = this.auroraPhase;
      const grad1 = ctx.createLinearGradient(0, h * 0.1, w, h * 0.9);
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      grad1.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
      grad1.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, h * 0.35 + Math.sin(p) * 50);
      ctx.bezierCurveTo(
        w * 0.35, h * 0.15 + Math.cos(p * 1.3) * 60,
        w * 0.65, h * 0.6 + Math.sin(p * 0.9) * 70,
        w, h * 0.3 + Math.cos(p) * 50
      );
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = grad1;
      ctx.fill();
      ctx.restore();

      // Ribbon 2: Pure White Frosted Glow
      const grad2 = ctx.createRadialGradient(w * 0.5, h * 0.25, 40, w * 0.5, h * 0.35, w * 0.65);
      grad2.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      grad2.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
      grad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'topographic') {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.06)';
      ctx.lineWidth = 1;
      for (let r = 80; r < Math.max(w, h); r += 50) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.05) {
          const distort = Math.sin(a * 4 + r * 0.02 + this.auroraPhase * 0.4) * 16 + Math.cos(a * 2) * 10;
          const x = w * 0.5 + Math.cos(a) * (r + distort);
          const y = h * 0.45 + Math.sin(a) * (r + distort);
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.2, 50, w * 0.5, h * 0.2, w * 0.6);
      grad.addColorStop(0, 'rgba(2, 132, 199, 0.1)');
      grad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'brand') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, '#E0F2FE');
      grad.addColorStop(1, '#BAE6FD');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  async renderDesktopIcons() {
    if (!this.iconsContainer) return;
    this.iconsContainer.innerHTML = '';

    const systemIcons = [
      { id: 'this_pc', name: 'This PC', icon: 'monitor', tileClass: 'tile-this-pc', action: () => this.wm.openApp('files', { path: '/' }) },
      { id: 'home', name: 'User Home', icon: 'home', tileClass: 'tile-files', action: () => this.wm.openApp('files', { path: '~' }) },
      { id: 'documents', name: 'Documents', icon: 'file-text', tileClass: 'tile-editor', action: () => this.wm.openApp('files', { path: '~/Documents' }) },
      { id: 'downloads', name: 'Downloads', icon: 'download', tileClass: 'tile-memory', action: () => this.wm.openApp('files', { path: '~/Downloads' }) },
      { id: 'browser_icon', name: 'Browser', icon: 'globe', tileClass: 'tile-browser', action: () => this.wm.openApp('browser') },
      { id: 'pictures', name: 'Pictures', icon: 'image', tileClass: 'tile-photos', action: () => this.wm.openApp('photos') },
      { id: 'terminal_icon', name: 'Terminal', icon: 'terminal', tileClass: 'tile-terminal', action: () => this.wm.openApp('terminal') },
      { id: 'trash_icon', name: 'Recycle Bin', icon: 'trash-2', tileClass: 'tile-trash', action: () => this.wm.openApp('files', { path: '~/.Trash' }) }
    ];

    let userDesktopFiles = [];
    try {
      const res = await api.get('/api/fs/list?path=~/Desktop');
      if (res.ok && res.data && res.data.items) {
        userDesktopFiles = res.data.items;
      }
    } catch (_) {}

    const allIcons = [...systemIcons];
    userDesktopFiles.forEach(file => {
      allIcons.push({
        id: `file_${file.name}`,
        name: file.name,
        icon: file.is_dir ? 'folder' : 'file-text',
        tileClass: file.is_dir ? 'tile-files' : 'tile-editor',
        action: () => {
          if (file.is_dir) this.wm.openApp('files', { path: file.path });
          else if (file.name.match(/\.(png|jpe?g|webp|gif|svg|bmp)$/i)) this.wm.openApp('photos', { path: file.path });
          else this.wm.openApp('editor', { path: file.path });
        }
      });
    });

    allIcons.forEach(item => {
      const el = document.createElement('div');
      el.className = 'desktop-icon';
      el.id = `desktop-icon-${item.id}`;
      el.innerHTML = `
        <div class="desktop-icon-tile">
          <svg><use href="#icon-${item.icon}"></use></svg>
        </div>
        <span class="desktop-icon-label">${item.name}</span>
      `;

      let lastTriggerTime = 0;
      const triggerAction = (e) => {
        const now = Date.now();
        if (now - lastTriggerTime < 300) return;
        lastTriggerTime = now;
        if (e) e.stopPropagation();
        if (!e || (!e.ctrlKey && !e.shiftKey)) {
          this.clearSelection();
        }
        this.selectIcon(el);
        item.action();
      };

      el.addEventListener('pointerup', (e) => {
        if (e.button === 0) triggerAction(e);
      });

      el.addEventListener('mouseup', (e) => {
        if (e.button === 0) triggerAction(e);
      });

      el.addEventListener('touchend', (e) => {
        triggerAction(e);
      });

      el.addEventListener('click', (e) => {
        triggerAction(e);
      });

      el.addEventListener('dblclick', (e) => {
        triggerAction(e);
      });

      this.iconsContainer.appendChild(el);
    });
  }

  selectIcon(el) {
    el.classList.add('selected');
    this.selectedIcons.add(el);
  }

  clearSelection() {
    this.selectedIcons.forEach(el => el.classList.remove('selected'));
    this.selectedIcons.clear();
  }

  bindMarqueeSelection() {
    if (!this.surface || !this.marquee) return;

    this.surface.addEventListener('mousedown', (e) => {
      if (e.target !== this.surface && e.target !== this.canvas && e.target !== this.iconsContainer) return;
      this.clearSelection();
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.marquee.style.display = 'block';
      this.marquee.style.left = `${e.clientX}px`;
      this.marquee.style.top = `${e.clientY}px`;
      this.marquee.style.width = '0px';
      this.marquee.style.height = '0px';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.dragStart) return;
      const x = Math.min(e.clientX, this.dragStart.x);
      const y = Math.min(e.clientY, this.dragStart.y);
      const w = Math.abs(e.clientX - this.dragStart.x);
      const h = Math.abs(e.clientY - this.dragStart.y);

      this.marquee.style.left = `${x}px`;
      this.marquee.style.top = `${y}px`;
      this.marquee.style.width = `${w}px`;
      this.marquee.style.height = `${h}px`;

      const icons = this.iconsContainer.querySelectorAll('.desktop-icon');
      icons.forEach(icon => {
        const r = icon.getBoundingClientRect();
        if (r.left < x + w && r.right > x && r.top < y + h && r.bottom > y) {
          this.selectIcon(icon);
        } else if (!e.ctrlKey) {
          icon.classList.remove('selected');
          this.selectedIcons.delete(icon);
        }
      });
    });

    window.addEventListener('mouseup', () => {
      if (this.dragStart) {
        this.dragStart = null;
        this.marquee.style.display = 'none';
      }
    });
  }

  bindContextMenu() {
    this.surface.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('aura-contextmenu', {
        detail: {
          x: e.clientX,
          y: e.clientY,
          items: [
            {
              label: 'View',
              icon: 'grid',
              children: [
                { label: 'Large Icons', icon: 'grid', action: () => {} },
                { label: 'Medium Icons', icon: 'grid', action: () => {} },
                { label: 'Auto Arrange', icon: 'check', action: () => {} }
              ]
            },
            {
              label: 'Sort by',
              icon: 'list',
              children: [
                { label: 'Name', icon: 'check', action: () => this.renderDesktopIcons() },
                { label: 'Size', icon: 'file', action: () => this.renderDesktopIcons() },
                { label: 'Date Modified', icon: 'clock', action: () => this.renderDesktopIcons() }
              ]
            },
            {
              label: 'Refresh',
              icon: 'rotate-cw',
              action: () => this.renderDesktopIcons()
            },
            { separator: true },
            {
              label: 'New',
              icon: 'plus',
              children: [
                {
                  label: 'New Folder',
                  icon: 'folder',
                  action: async () => {
                    await api.post('/api/fs/mkdir', { path: '~/Desktop/New Folder' });
                    this.renderDesktopIcons();
                  }
                },
                {
                  label: 'C++ Source (.cpp)',
                  icon: 'code',
                  action: async () => {
                    const cppTemplate = '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++ on AURA-OS!" << std::endl;\n    return 0;\n}\n';
                    await api.post('/api/fs/write', { path: '~/Desktop/main.cpp', content: cppTemplate });
                    this.renderDesktopIcons();
                  }
                },
                {
                  label: 'Java Class (.java)',
                  icon: 'code',
                  action: async () => {
                    const javaTemplate = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java on AURA-OS!");\n    }\n}\n';
                    await api.post('/api/fs/write', { path: '~/Desktop/Main.java', content: javaTemplate });
                    this.renderDesktopIcons();
                  }
                },
                {
                  label: 'Python Script (.py)',
                  icon: 'terminal',
                  action: async () => {
                    const pyTemplate = 'print("Hello from Python on AURA-OS!")\n';
                    await api.post('/api/fs/write', { path: '~/Desktop/script.py', content: pyTemplate });
                    this.renderDesktopIcons();
                  }
                },
                {
                  label: 'Text Document (.txt)',
                  icon: 'file-text',
                  action: async () => {
                    await api.post('/api/fs/write', { path: '~/Desktop/New Document.txt', content: '' });
                    this.renderDesktopIcons();
                  }
                }
              ]
            },
            { separator: true },
            { label: 'Open Terminal Here', icon: 'terminal', action: () => this.wm.openApp('terminal') },
            { label: 'Display Settings', icon: 'settings', action: () => this.wm.openApp('settings') }
          ]
        }
      }));
    });
  }
}
