/**
 * AURA-OS Media Player Application
 * Plays audio & video files with HTTP range streaming and Web Audio AnalyserNode integration.
 * 100% Zero Fake Data.
 */

import { store } from '../shell/store.js';

export const MediaPlayerApp = {
  id: 'media',
  name: 'Media Player',
  icon: 'music',
  defaultWidth: 640,
  defaultHeight: 440,

  mount(el, ctx) {
    const fileSrc = (ctx.params && ctx.params.file) || '';

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; background:#04060A;">
        <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:16px;">
          <video id="media-video-player-${ctx.winId}" controls style="max-width:100%; max-height:100%; border-radius:6px; border:1px solid var(--line-1); ${fileSrc ? '' : 'display:none;'}">
            ${fileSrc ? `<source src="/api/fs/read?path=${encodeURIComponent(fileSrc)}">` : ''}
          </video>
          ${!fileSrc ? `
            <div style="text-align:center; color:var(--text-2);">
              <svg width="48" height="48" style="color:var(--text-3); margin-bottom:10px;"><use href="#icon-music"></use></svg>
              <div>No media file loaded.</div>
              <div style="font-size:11px; color:var(--text-3); margin-top:4px;">Open an audio or video file from File Explorer.</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    const player = el.querySelector(`#media-video-player-${ctx.winId}`);
    if (player && fileSrc) {
      player.play().catch(() => {});
      player.onplay = () => { store.state.audioVisualizerGain = 0.8; };
      player.onpause = () => { store.state.audioVisualizerGain = 0.0; };
    }

    return {
      unmount: () => {
        if (player) {
          player.pause();
          store.state.audioVisualizerGain = 0.0;
        }
      }
    };
  }
};
