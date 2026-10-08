import { store } from '../shell/store.js';

export class TelemetryChart {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.maxSamples = options.maxSamples || 60;
    this.buffer = new Array(this.maxSamples).fill(0);
    this.maxVal = options.maxVal || 100;
    this.unit = options.unit || '%';
    this.hoverIdx = -1;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    store.on('themeChanged', () => this.render());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const stepX = this.w / (this.maxSamples - 1);
      this.hoverIdx = Math.max(0, Math.min(this.maxSamples - 1, Math.round(x / stepX)));
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverIdx = -1;
      this.render();
    });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.w = rect.width;
    this.h = rect.height;
    this.render();
  }

  push(val) {
    this.buffer.shift();
    this.buffer.push(val);
    this.render();
  }

  render() {
    if (!this.ctx || !this.w || !this.h) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    // Faint gridlines at 25%, 50%, 75%
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [0.25, 0.50, 0.75].forEach(pct => {
      const y = Math.round(h * (1 - pct)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    });

    if (this.buffer.length < 2) return;

    const latest = this.buffer[this.buffer.length - 1];
    const theme = store.state.currentTheme || { accent: '#00F2FE', dim: 'rgba(0, 242, 254, 0.08)' };
    let strokeColor = theme.accent;
    let fillColor = theme.dim || 'rgba(0, 242, 254, 0.08)';

    if (latest >= 90) {
      strokeColor = '#FF5C6C';
      fillColor = 'rgba(255, 92, 108, 0.08)';
    } else if (latest >= 70) {
      strokeColor = '#F2B441';
      fillColor = 'rgba(242, 180, 65, 0.08)';
    }

    const stepX = w / (this.maxSamples - 1);

    // Line Path
    ctx.beginPath();
    this.buffer.forEach((v, i) => {
      const norm = Math.max(0, Math.min(1, v / this.maxVal));
      const y = h - (norm * (h - 6)) - 3;
      const x = i * stepX;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Hover crosshair
    if (this.hoverIdx >= 0 && this.hoverIdx < this.buffer.length) {
      const hVal = this.buffer[this.hoverIdx];
      const hNorm = Math.max(0, Math.min(1, hVal / this.maxVal));
      const hX = this.hoverIdx * stepX;
      const hY = h - (hNorm * (h - 6)) - 3;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(hX, hY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
  }
}
