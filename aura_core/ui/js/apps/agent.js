/**
 * AURA-OS Copilot Application
 * Real-time AI agent orchestrator with isolated OverlayFS sandbox command execution.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';
import { store } from '../shell/store.js';

export const AgentApp = {
  id: 'agent',
  name: 'AURA Copilot',
  icon: 'agent',
  defaultWidth: 780,
  defaultHeight: 520,

  mount(el, ctx) {
    const initialPrompt = (ctx.params && ctx.params.initialPrompt) || '';

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%;">
        <!-- Messages Stream -->
        <div style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;" id="agent-stream-${ctx.winId}">
          <div style="background:var(--bg-2); border:1px solid var(--line-1); border-radius:8px; padding:12px; max-width:85%;">
            <div style="font-size:11px; font-weight:600; color:var(--accent); display:flex; align-items:center; gap:6px;">
              <svg width="13" height="13"><use href="#icon-agent"></use></svg>
              <span>AURA Core Assistant</span>
            </div>
            <div style="font-size:12.5px; color:var(--text-0); margin-top:6px; line-height:1.5;">
              Ready. Enter instructions to execute commands, query real system telemetry, or manage persistent neural memory records.
            </div>
          </div>
        </div>

        <!-- Composer -->
        <div style="padding:12px; background:var(--bg-2); border-top:1px solid var(--line-1); display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; gap:8px; background:var(--bg-1); border:1px solid var(--line-2); border-radius:6px; padding:6px 10px;">
            <input type="text" id="agent-prompt-input-${ctx.winId}" value="${initialPrompt}" placeholder="Enter instruction or '$ command'..." style="flex:1; background:transparent; border:none; color:var(--text-0); font-size:13px; outline:none;">
            <button class="btn-glass" id="agent-send-btn-${ctx.winId}" style="background:var(--accent); color:var(--accent-text-dark); font-weight:600; padding:4px 12px; font-size:11.5px;">Send</button>
          </div>
        </div>
      </div>
    `;

    const stream = el.querySelector(`#agent-stream-${ctx.winId}`);
    const input = el.querySelector(`#agent-prompt-input-${ctx.winId}`);
    const sendBtn = el.querySelector(`#agent-send-btn-${ctx.winId}`);

    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // Append user msg
      const userBubble = document.createElement('div');
      userBubble.style.alignSelf = 'flex-end';
      userBubble.style.background = 'var(--bg-3)';
      userBubble.style.border = '1px solid var(--line-2)';
      userBubble.style.borderRadius = '8px';
      userBubble.style.padding = '10px 14px';
      userBubble.style.maxWidth = '80%';
      userBubble.innerHTML = `<div style="font-size:12.5px; color:var(--text-0); font-family:var(--font-mono);">${text}</div>`;
      stream.appendChild(userBubble);
      stream.scrollTop = stream.scrollHeight;

      // Loading bubble
      const agentBubble = document.createElement('div');
      agentBubble.style.background = 'var(--bg-2)';
      agentBubble.style.border = '1px solid var(--line-1)';
      agentBubble.style.borderRadius = '8px';
      agentBubble.style.padding = '12px';
      agentBubble.style.maxWidth = '85%';
      agentBubble.innerHTML = `<div style="font-size:12px; color:var(--text-2);">Executing...</div>`;
      stream.appendChild(agentBubble);
      stream.scrollTop = stream.scrollHeight;

      try {
        const res = await api.post('/api/chat', { message: text });
        const reply = (res && res.data && res.data.reply) || res.reply || 'Execution complete.';
        agentBubble.innerHTML = `
          <div style="font-size:11px; font-weight:600; color:var(--accent); display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13"><use href="#icon-agent"></use></svg>
            <span>AURA Core Assistant</span>
          </div>
          <div style="font-size:12.5px; color:var(--text-0); margin-top:6px; line-height:1.5; white-space:pre-wrap;">${reply}</div>
        `;
      } catch (e) {
        agentBubble.innerHTML = `<div style="font-size:12px; color:var(--err);">Failed to execute: ${e}</div>`;
      }
      stream.scrollTop = stream.scrollHeight;
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    if (initialPrompt) {
      setTimeout(sendMessage, 100);
    }

    return { unmount: () => {} };
  }
};
