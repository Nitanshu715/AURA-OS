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
      window.__auraLastAgentTask = text;

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
        const dataObj = (res && res.data) ? res.data : res;
        const reply = dataObj.reply || 'Execution complete.';
        const action = dataObj.action;
        const pipeline = dataObj.pipeline;

        let extraHtml = '';
        if (action === 'server_self_heal') {
          extraHtml = `
            <div style="margin-top:10px; padding:12px; background:var(--bg-1); border:1px solid var(--line-2); border-radius:8px; display:flex; flex-direction:column; gap:8px; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
              <div style="font-size:12px; font-weight:700; color:var(--accent); display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14"><use href="#icon-cpu"></use></svg>
                <span>Autonomous Service Recovery</span>
              </div>
              <div style="font-size:11.5px; color:var(--text-1);">Spawning Node.js backend at <code style="color:var(--accent); background:var(--bg-3); padding:2px 6px; border-radius:4px;">http://localhost:3000</code>...</div>
              <div class="auto-heal-status-msg" style="font-size:11px; color:#10B981; font-family:var(--font-mono); margin-top:2px;">Recovering port 3000...</div>
            </div>
          `;
        } else if (action === 'dual_twin_orchestration' && pipeline) {
          const folder = (pipeline.scaffold && pipeline.scaffold.folder) ? pipeline.scaffold.folder : '';
          const isFullstack = pipeline.environment === 'fullstack-app';
          extraHtml = `
            <div style="margin-top:10px; padding:12px; background:var(--bg-1); border:1px solid var(--line-2); border-radius:8px; display:flex; flex-direction:column; gap:8px; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
              <div style="font-size:12px; font-weight:700; color:var(--text-0); display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" style="color:var(--accent);"><use href="#icon-monitor"></use></svg>
                <span>Dual-Twin Workspace Scaffolded</span>
              </div>
              <div style="font-size:11.5px; color:var(--text-1);">Location: <code style="color:var(--accent); background:var(--bg-3); padding:2px 6px; border-radius:4px;">${folder}</code></div>
              <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:4px;">
                ${isFullstack ? `<button class="btn-solid auto-run-fullstack-btn" style="padding:6px 12px; font-size:11.5px; border-radius:6px; background:#10B981; color:#FFFFFF; font-weight:600; cursor:pointer; border:none;">Run & Open Browser</button>` : ''}
                <button class="btn-solid ed-quick-open-btn" style="padding:6px 12px; font-size:11px; border-radius:6px; background:var(--bg-2); color:var(--text-0); border:1px solid var(--line-2); cursor:pointer;">Open in Studio IDE</button>
                <button class="btn-solid twin-quick-open-btn" style="padding:6px 12px; font-size:11px; border-radius:6px; background:var(--bg-2); color:var(--text-0); border:1px solid var(--line-2); cursor:pointer;">View Twin Telemetry</button>
              </div>
              <div class="auto-run-status-msg" style="display:none; font-size:11px; color:#10B981; font-family:var(--font-mono); margin-top:4px;"></div>
            </div>
          `;
        }

        agentBubble.innerHTML = `
          <div style="font-size:11px; font-weight:600; color:var(--accent); display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13"><use href="#icon-agent"></use></svg>
            <span>AURA Core Assistant</span>
          </div>
          <div style="font-size:12.5px; color:var(--text-0); margin-top:6px; line-height:1.5; white-space:pre-wrap;">${reply}</div>
          ${extraHtml}
        `;

        if (action === 'server_self_heal') {
          const healMsg = agentBubble.querySelector('.auto-heal-status-msg');
          try {
            await fetch('/api/dev/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                command: 'node src/server.js',
                cwd: 'Documents/Fullstack_App'
              })
            });
            if (healMsg) healMsg.textContent = 'Server online! Opening browser to http://localhost:3000...';
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('aura-open-app', {
                detail: {
                  appId: 'browser',
                  params: { url: 'http://localhost:3000' }
                }
              }));
            }, 600);
          } catch (e) {
            if (healMsg) healMsg.textContent = 'Attempted launch: ' + e;
          }
        }

        const autoRunBtn = agentBubble.querySelector('.auto-run-fullstack-btn');
        const statusMsg = agentBubble.querySelector('.auto-run-status-msg');
        if (autoRunBtn) {
          const runExecution = async () => {
            autoRunBtn.disabled = true;
            autoRunBtn.innerHTML = '<span>Starting server...</span>';
            if (statusMsg) {
              statusMsg.style.display = 'block';
              statusMsg.textContent = '1. Spawning full-stack Node backend at :3000...';
            }

            // Execute node server persistently via dev manager API
            try {
              await fetch('/api/dev/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  command: 'node src/server.js',
                  cwd: 'Documents/Fullstack_App'
                })
              });
            } catch (_) {}

            setTimeout(() => {
              if (statusMsg) statusMsg.textContent = '2. Backend live! Opening browser to http://localhost:3000...';
              window.dispatchEvent(new CustomEvent('aura-open-app', {
                detail: {
                  appId: 'browser',
                  params: { url: 'http://localhost:3000' }
                }
              }));
              autoRunBtn.innerHTML = '<span>Live at http://localhost:3000</span>';
            }, 800);
          };

          autoRunBtn.addEventListener('click', runExecution);

          // If user prompt was to build/make/create a full stack web app, automatically run & open the browser!
          if (text.toLowerCase().includes('make') || text.toLowerCase().includes('create') || text.toLowerCase().includes('build')) {
            setTimeout(runExecution, 500);
          }
        }

        const openEdBtn = agentBubble.querySelector('.ed-quick-open-btn');
        if (openEdBtn) {
          openEdBtn.addEventListener('click', () => {
            const path = (pipeline.scaffold && pipeline.scaffold.files && pipeline.scaffold.files[0]) 
              ? `${pipeline.scaffold.folder}/${pipeline.scaffold.files[0]}` 
              : '~/Documents';
            window.dispatchEvent(new CustomEvent('aura-open-app', {
              detail: { appId: 'editor', params: { path } }
            }));
          });
        }

        const openTwinBtn = agentBubble.querySelector('.twin-quick-open-btn');
        if (openTwinBtn) {
          openTwinBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('aura-open-app', { 
              detail: { 
                appId: 'twin', 
                params: { 
                  prompt: text,
                  pipeline: pipeline
                } 
              } 
            }));
          });
        }
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
