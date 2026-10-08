import { store } from '../shell/store.js';

export class AuroraWallpaper {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d', { alpha: false });
    this.particles = [];
    this.numParticles = 35; // Optimized count for 60fps
    this.animId = null;
    this.isEnabled = true;
    this.lastTime = performance.now();

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.spawnParticles();
    store.on('themeChanged', () => this.spawnParticles());
    this.start();
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  spawnParticles() {
    this.particles = [];
    const theme = store.state.currentTheme || { accent: '#00F2FE', accentSecondary: '#8B7CFF' };
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.5 + 0.8,
        color: i % 2 === 0 ? theme.accent : (theme.accentSecondary || '#8B7CFF')
      });
    }
  }

  start() {
    const loop = (now) => {
      if (this.isEnabled && this.ctx && this.w) {
        // Limit to 60fps delta
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.render(now * 0.001);
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  render(t) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const theme = store.state.currentTheme || { r: 0, g: 242, b: 254 };

    // 1. Dark Base Background
    ctx.fillStyle = '#06080F';
    ctx.fillRect(0, 0, w, h);

    // 2. Smooth Moving Aurora Lights (Dynamic Theme Palette)
    const cx1 = w * 0.3 + Math.sin(t * 0.4) * 120;
    const cy1 = h * 0.35 + Math.cos(t * 0.5) * 80;
    const grad1 = ctx.createRadialGradient(cx1, cy1, 10, cx1, cy1, w * 0.45);
    grad1.addColorStop(0, `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.12)`);
    grad1.addColorStop(0.6, `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.035)`);
    grad1.addColorStop(1, 'rgba(6, 8, 15, 0)');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const cx2 = w * 0.75 + Math.cos(t * 0.45) * 130;
    const cy2 = h * 0.65 + Math.sin(t * 0.55) * 90;
    const grad2 = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, w * 0.5);
    grad2.addColorStop(0, 'rgba(139, 124, 255, 0.08)');
    grad2.addColorStop(0.5, `rgba(${theme.r}, ${theme.g}, ${theme.b}, 0.03)`);
    grad2.addColorStop(1, 'rgba(6, 8, 15, 0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    // 3. Batched Particles (Zero heavy N^2 distance checks)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }
}
