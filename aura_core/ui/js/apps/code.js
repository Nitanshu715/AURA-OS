/**
 * AURA-OS Code Studio Application
 * Live scratchpad code editor with syntax highlighting and sandbox execution console.
 */

import { api } from '../api.js';
import { store } from '../shell/store.js';

export const CodeApp = {
  id: 'code',
  title: 'Code Studio',
  icon: 'terminal',

  mount(el, ctx) {
    const sampleScript = `#!/usr/bin/env python3
# AURA-OS Sandbox Execution Test Script
import os, sys, platform, time

print("=" * 45)
print("  AURA-OS SANDBOX WORKSPACE RUNNER")
print("=" * 45)
print(f"Platform : {platform.platform()}")
print(f"Machine  : {platform.machine()}")
print(f"Python   : {platform.python_version()}")
print(f"Time     : {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("[+] Sandbox digital twin overlay check: PASS")
`;

    el.innerHTML = `
      <div class="code-studio-layout">
        <!-- Editor Pane -->
        <div class="code-editor-pane">
          <div class="code-editor-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="font-mono" style="font-size:12px; font-weight:600; color:var(--text-0);">sandbox_test.py</span>
              <span class="badge-pill ok">Python 3</span>
            </div>
            <button class="btn-glass btn-primary-neon" id="run-code-btn-${ctx.winId}" style="padding:2px 10px; font-size:11px;">
              <span>Run in Sandbox</span>
              <kbd style="background:rgba(0,0,0,0.2); border:none; color:#000;">↵</kbd>
            </button>
          </div>
          <textarea class="code-textarea" id="code-text-${ctx.winId}">${sampleScript}</textarea>
        </div>

        <!-- Output Console Pane -->
        <div style="background:#04060A; display:flex; flex-direction:column; padding:10px; font-family:var(--font-mono); font-size:11px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--glass-border); padding-bottom:6px; margin-bottom:8px;">
            <span style="color:var(--text-2); font-weight:600;">Execution Output</span>
            <span class="badge-pill" id="code-status-${ctx.winId}">Idle</span>
          </div>
          <pre id="code-output-${ctx.winId}" style="flex:1; overflow-y:auto; color:var(--text-1); white-space:pre-wrap; word-break:break-all;">Click 'Run in Sandbox' to execute script inside isolated environment.</pre>
        </div>
      </div>
    `;

    const codeText = el.querySelector(`#code-text-${ctx.winId}`);
    const runBtn = el.querySelector(`#run-code-btn-${ctx.winId}`);
    const outputPre = el.querySelector(`#code-output-${ctx.winId}`);
    const statusBadge = el.querySelector(`#code-status-${ctx.winId}`);

    runBtn.addEventListener('click', async () => {
      statusBadge.textContent = 'Running...';
      statusBadge.className = 'badge-pill warn';
      store.setAgentState('running');

      const res = await api.sendInstruction(`$ python -c "${codeText.value.replace(/"/g, '\\"')}"`);
      
      store.setAgentState('idle');
      statusBadge.textContent = 'Exit 0 (Done)';
      statusBadge.className = 'badge-pill ok';
      outputPre.textContent = res.reply || 'Execution finished with no output.';
    });

    return { unmount: () => {} };
  }
};
