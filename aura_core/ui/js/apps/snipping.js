/**
 * AURA-OS Snipping Tool (Screenshot Capture)
 * Uses getDisplayMedia for authentic display capture, triggers 120ms screen flash,
 * 300ms fly-to-corner animation, and saves to Pictures/Screenshots via /api/capture/screenshot.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const SnippingApp = {
  id: 'snipping',
  name: 'Snipping Tool',
  icon: 'camera',
  defaultWidth: 420,
  defaultHeight: 280,

  mount(el, ctx) {
    el.innerHTML = `
      <div style="padding:20px; display:flex; flex-direction:column; gap:16px; height:100%; justify-content:center; align-items:center; text-align:center;">
        <svg width="40" height="40" style="color:var(--accent);"><use href="#icon-camera"></use></svg>
        <div>
          <div style="font-size:14px; font-weight:600; color:var(--text-0);">Screen Capture & Annotation</div>
          <div style="font-size:11.5px; color:var(--text-2); margin-top:4px;">
            Captures current display stream and stores PNG to Pictures/Screenshots.
          </div>
        </div>
        <button class="btn-glass" id="snip-capture-btn" style="padding:8px 20px; background:var(--accent); color:var(--accent-text-dark); font-weight:600;">
          <svg width="14" height="14"><use href="#icon-camera"></use></svg>
          <span>Capture Screen (Ctrl+Shift+S)</span>
        </button>
      </div>
    `;

    const captureBtn = el.querySelector('#snip-capture-btn');

    const capture = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        track.stop();

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx2 = canvas.getContext('2d');
        ctx2.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');

        // Trigger Screen Flash Animation
        const flash = document.getElementById('screenshot-flash-overlay');
        if (flash) {
          flash.style.opacity = '0.7';
          setTimeout(() => flash.style.opacity = '0', 120);
        }

        // Trigger Fly to Corner Animation
        const thumb = document.createElement('img');
        thumb.src = dataUrl;
        thumb.id = 'screenshot-fly-thumb';
        thumb.style.width = '300px';
        thumb.style.left = '50%';
        thumb.style.top = '50%';
        thumb.style.transform = 'translate(-50%, -50%) scale(1)';
        document.body.appendChild(thumb);

        setTimeout(() => {
          thumb.style.left = 'calc(100vw - 120px)';
          thumb.style.top = 'calc(100vh - 100px)';
          thumb.style.transform = 'scale(0.3)';
          thumb.style.opacity = '0';
          setTimeout(() => thumb.remove(), 350);
        }, 300);

        // Upload to /api/capture/screenshot
        const res = await api.post('/api/capture/screenshot', { image: dataUrl });
        if (res.ok && res.data) {
          window.dispatchEvent(new CustomEvent('aura-notify', {
            detail: {
              title: 'Screenshot Captured',
              message: `Saved to ${res.data.relative_path}`,
              icon: 'camera',
              type: 'ok',
              actions: [
                { label: 'Open in Photos', action: () => {
                  window.dispatchEvent(new CustomEvent('aura-open-app', { detail: { appId: 'photos', params: { file: res.data.path } } }));
                }}
              ]
            }
          }));
        }
      } catch (err) {
        console.warn('Screenshot canceled or denied:', err);
      }
    };

    captureBtn.addEventListener('click', capture);

    return { unmount: () => {} };
  }
};
