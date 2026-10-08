/**
 * AURA-OS Screen Recorder Application
 * Streams chunked MediaRecorder video to /api/capture/recording.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const RecorderApp = {
  id: 'recorder',
  name: 'Screen Recorder',
  icon: 'video',
  defaultWidth: 420,
  defaultHeight: 280,

  mount(el, ctx) {
    let mediaRecorder = null;
    let recId = `rec_${Date.now()}`;
    let isRecording = false;

    el.innerHTML = `
      <div style="padding:20px; display:flex; flex-direction:column; gap:16px; height:100%; justify-content:center; align-items:center; text-align:center;">
        <svg width="40" height="40" style="color:var(--err);"><use href="#icon-video"></use></svg>
        <div>
          <div style="font-size:14px; font-weight:600; color:var(--text-0);" id="rec-title">Screen Video Recording</div>
          <div style="font-size:11.5px; color:var(--text-2); margin-top:4px;" id="rec-subtitle">
            Streams video to Videos/Recordings/Recording_YYYY-MM-DD_HH-MM-SS.webm.
          </div>
        </div>
        <button class="btn-glass" id="rec-toggle-btn" style="padding:8px 24px; background:var(--err); color:#fff; font-weight:600;">
          <svg width="14" height="14"><use href="#icon-video"></use></svg>
          <span id="rec-btn-text">Start Recording</span>
        </button>
      </div>
    `;

    const toggleBtn = el.querySelector('#rec-toggle-btn');
    const btnText = el.querySelector('#rec-btn-text');
    const titleEl = el.querySelector('#rec-title');

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        recId = `rec_${Date.now()}`;
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8,opus' });

        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0) {
            await fetch(`/api/capture/recording/${recId}/chunk`, {
              method: 'POST',
              body: e.data
            });
          }
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const res = await api.post(`/api/capture/recording/${recId}/finish`, {});
          if (res.ok && res.data) {
            window.dispatchEvent(new CustomEvent('aura-notify', {
              detail: {
                title: 'Screen Recording Saved',
                message: `Saved to ${res.data.relative_path}`,
                icon: 'video',
                type: 'ok',
                actions: [
                  { label: 'Open in Media Player', action: () => {
                    window.dispatchEvent(new CustomEvent('aura-open-app', { detail: { appId: 'media', params: { file: res.data.path } } }));
                  }}
                ]
              }
            }));
          }
          isRecording = false;
          btnText.textContent = 'Start Recording';
          toggleBtn.style.background = 'var(--err)';
          titleEl.textContent = 'Screen Video Recording';
        };

        mediaRecorder.start(2000); // 2s chunking
        isRecording = true;
        btnText.textContent = 'Stop Recording';
        toggleBtn.style.background = 'var(--warn)';
        titleEl.textContent = 'Recording in progress...';
      } catch (err) {
        console.warn('Recording canceled:', err);
      }
    };

    toggleBtn.addEventListener('click', () => {
      if (!isRecording) {
        startRecording();
      } else if (mediaRecorder) {
        mediaRecorder.stop();
      }
    });

    return {
      unmount: () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }
    };
  }
};
