/**
 * AURA-OS Model Hub & App Store Application
 * Browse, select, and inspect local Ollama AI models.
 */

import { store } from '../shell/store.js';

export const ModelsApp = {
  id: 'models',
  title: 'Model Hub',
  icon: 'models',

  mount(el, ctx) {
    const models = [
      { id: 'llama3.2:1b', name: 'Llama 3.2 1B Instruct', size: '1.2 GB', type: 'General Reasoning', active: true },
      { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 Distill 1.5B', size: '1.6 GB', type: 'Chain-of-Thought', active: false },
      { id: 'qwen2.5-coder:1.5b', name: 'Qwen 2.5 Coder 1.5B', size: '1.4 GB', type: 'Code & Shell Specialist', active: false },
      { id: 'phi-3:mini', name: 'Microsoft Phi-3 Mini', size: '2.1 GB', type: 'Fast Compact Agent', active: false }
    ];

    const cardsHtml = models.map(m => `
      <div class="monitor-card" style="border-color:${m.active ? 'var(--accent)' : 'var(--glass-border)'};">
        <div style="display:flex; align-items:flex-start; justify-content:space-between;">
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--text-0);">${m.name}</div>
            <div style="font-size:11px; color:var(--text-2); margin-top:2px;">${m.type} &middot; ${m.size}</div>
          </div>
          <span class="badge-pill ${m.active ? 'ok' : ''}">${m.active ? 'ACTIVE DEFAULT' : 'READY'}</span>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button class="btn-glass ${m.active ? 'btn-primary-neon' : ''}" style="font-size:11px; padding:3px 10px;">
            ${m.active ? 'In Use' : 'Switch Model'}
          </button>
        </div>
      </div>
    `).join('');

    el.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; background:var(--bg-glass-base);">
        <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--glass-border); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--text-0);">Local Ollama Inference Engine</div>
            <div style="font-size:11px; color:var(--text-2);">Manage and switch local model weights.</div>
          </div>
          <span class="badge-pill ok">Engine Ready (:11434)</span>
        </div>
        <div style="flex:1; padding:14px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
          ${cardsHtml}
        </div>
      </div>
    `;

    return { unmount: () => {} };
  }
};
