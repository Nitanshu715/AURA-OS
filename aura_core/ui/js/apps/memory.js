/**
 * AURA-OS Memory DB Management Application
 * Inspects and manages key-value records in the SQLite memory daemon.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const MemoryApp = {
  id: 'memory',
  name: 'Memory DB',
  icon: 'memory',
  defaultWidth: 780,
  defaultHeight: 480,

  mount(el, ctx) {
    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <div class="explorer-toolbar">
          <input type="text" id="mem-search" placeholder="Filter memory keys..." class="explorer-address-bar" style="width:240px;">
          <button class="btn-glass" id="mem-refresh-btn"><svg width="12" height="12"><use href="#icon-rotate-cw"></use></svg><span>Refresh</span></button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:12px;" id="mem-content-${ctx.winId}">
          <div style="color:var(--text-2);">Reading SQLite database...</div>
        </div>
      </div>
    `;

    const content = el.querySelector(`#mem-content-${ctx.winId}`);
    const search = el.querySelector('#mem-search');

    const loadMemory = async () => {
      try {
        const res = await api.get('/api/knowledge');
        const items = Array.isArray(res) ? res : (res.data || []);
        if (items.length === 0) {
          content.innerHTML = `<div style="color:var(--text-3); padding:24px; text-align:center;">No memory records found in aura_memory.db.</div>`;
          return;
        }

        content.innerHTML = `
          <table class="file-table" style="font-family:var(--font-mono); font-size:12px;">
            <thead>
              <tr>
                <th style="width:25%;">Key</th>
                <th style="width:55%;">Value / Content</th>
                <th style="width:20%;">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(m => `
                <tr class="file-row">
                  <td style="color:var(--accent); font-weight:600;">${m.key || '--'}</td>
                  <td>${m.content || m.value || '--'}</td>
                  <td style="color:var(--text-2); font-size:11px;">${m.timestamp || '--'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (_) {
        content.innerHTML = `<div style="color:var(--err); padding:16px;">Failed to read memory DB.</div>`;
      }
    };

    el.querySelector('#mem-refresh-btn').addEventListener('click', loadMemory);
    loadMemory();

    return { unmount: () => {} };
  }
};
