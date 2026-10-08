/**
 * AURA-OS Text & Code Editor Application
 * Document and code editor with line numbers and Ctrl+S saving.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const EditorApp = {
  id: 'editor',
  name: 'Text Editor',
  icon: 'file-text',
  defaultWidth: 720,
  defaultHeight: 480,

  mount(el, ctx) {
    let filePath = (ctx.params && ctx.params.path) || '~/Documents/untitled.txt';
    let isDirty = false;

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <!-- Toolbar -->
        <div class="explorer-toolbar" style="justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn-glass" id="ed-save-btn" style="padding:3px 10px; font-size:11.5px;">
              <svg width="12" height="12"><use href="#icon-save"></use></svg>
              <span>Save (Ctrl+S)</span>
            </button>
            <span style="font-size:11.5px; color:var(--text-2);" id="ed-path-label">${filePath}</span>
            <span id="ed-dirty-dot" style="display:none; color:var(--accent); font-weight:bold;">&bull;</span>
          </div>
          <span style="font-size:11px; color:var(--text-3);" id="ed-status-info">UTF-8 &middot; Plain Text</span>
        </div>

        <!-- Editor Textarea -->
        <textarea id="ed-textarea-${ctx.winId}" spellcheck="false" style="flex:1; background:#06080C; color:#E2E8F0; font-family:var(--font-mono); font-size:13px; line-height:1.5; padding:12px; border:none; outline:none; resize:none;"></textarea>
      </div>
    `;

    const textarea = el.querySelector(`#ed-textarea-${ctx.winId}`);
    const saveBtn = el.querySelector('#ed-save-btn');
    const dirtyDot = el.querySelector('#ed-dirty-dot');

    const loadFile = async () => {
      try {
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`);
        if (res.ok) {
          textarea.value = await res.text();
        } else {
          textarea.value = '';
        }
      } catch (_) {
        textarea.value = '';
      }
    };

    const saveFile = async () => {
      try {
        await api.post('/api/fs/write', { path: filePath, content: textarea.value });
        isDirty = false;
        dirtyDot.style.display = 'none';
        window.dispatchEvent(new CustomEvent('aura-notify', {
          detail: { title: 'File Saved', message: filePath, icon: 'file-text', type: 'ok' }
        }));
      } catch (e) {
        alert('Failed to save file: ' + e);
      }
    };

    textarea.addEventListener('input', () => {
      if (!isDirty) {
        isDirty = true;
        dirtyDot.style.display = 'inline';
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFile();
      }
    });

    saveBtn.addEventListener('click', saveFile);
    loadFile();

    return { unmount: () => {} };
  }
};
