/**
 * AURA-OS Vivid 60fps Signal Spectrum Visualizer
 * High-performance canvas equalizer with peak-hold decay and baseline reflection.
 */

import { store } from '../shell/store.js';

export class SignalSpectrum {
  constructor(canvasEl, numBars = 28) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.numBars = numBars;
    this.bars = new Float32Array(numBars).fill(0.1);
    this.peaks = new Float32Array(numBars).fill(0.1);
    this.isPaused = false;
    this.animId = null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    });

    this.start();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width || 120;
    this.h = rect.height || 32;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);
    const loop = (now) => {
      if (!this.isPaused && this.ctx && this.w) {
        this.render(now * 0.003);
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render(t) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.clearRect(0, 0, w, h);

    const isRunning = (store.state.agentState === 'running');
    const intensity = isRunning ? 0.75 : 0.28;

    const barW = Math.max(2, (w / this.numBars) - 2);
    const gap = 2;
    const baselineY = h * 0.78;

    // Dynamic Theme Gradient
    const theme = store.state.currentTheme || { accent: '#00F2FE', accentSecondary: '#8B7CFF' };
    const grad = ctx.createLinearGradient(0, baselineY, 0, 2);
    grad.addColorStop(0, theme.accent);
    grad.addColorStop(1, theme.accentSecondary || '#8B7CFF');

    for (let i = 0; i < this.numBars; i++) {
      const target = Math.sin(t + i * 0.28) * 0.25 + Math.random() * intensity + 0.15;
      this.bars[i] += (target - this.bars[i]) * 0.22;

      if (this.bars[i] > this.peaks[i]) {
        this.peaks[i] = this.bars[i];
      } else {
        this.peaks[i] = Math.max(this.bars[i], this.peaks[i] - 0.008);
      }

      const x = i * (barW + gap);
      const barH = Math.max(2, this.bars[i] * (baselineY - 4));
      const y = baselineY - barH;

      // Bar
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH);

      // Peak Dot
      const peakY = baselineY - (this.peaks[i] * (baselineY - 4));
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, Math.max(1, peakY - 1.5), barW, 1.5);

      // Reflection
      ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
      ctx.fillRect(x, baselineY + 1, barW, barH * 0.35);
    }
  }
}
