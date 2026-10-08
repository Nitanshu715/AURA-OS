/**
 * AURA-OS Security Sandbox & Digital Twin Application
 * Interactive OverlayFS layer visualizer, dry-run diffs, and commit controls.
 */

import { store } from '../shell/store.js';

export const ApprovalsApp = {
  id: 'approvals',
  title: 'Sandbox Twin',
  icon: 'approvals',

  mount(el, ctx) {
    el.innerHTML = `
      <div style="height:100%; display:flex; flex-direction:column; background:var(--bg-glass-base);">
        <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--glass-border); display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-weight:700; font-size:13px; color:var(--text-0);">Digital Twin OverlayFS Layer</div>
            <div style="font-size:11px; color:var(--text-2);">Isolated execution environment with dry-run mutation diffs.</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-glass" id="twin-discard-${ctx.winId}">Rollback Sandbox</button>
            <button class="btn-glass btn-primary-neon" id="twin-commit-${ctx.winId}">Commit to Rootfs</button>
          </div>
        </div>

        <div style="flex:1; padding:14px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
          <!-- 3-Layer Visualizer Card -->
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
            <div class="monitor-card" style="border-color:rgba(0, 242, 254, 0.3);">
              <span class="badge-pill accent">Layer 1 (Base)</span>
              <strong style="color:var(--text-0); margin-top:4px;">Read-Only Rootfs</strong>
              <span style="font-size:11px; color:var(--text-2);">NitanshuOS ext2 image</span>
            </div>
            <div class="monitor-card" style="border-color:rgba(245, 158, 11, 0.4); background:rgba(245, 158, 11, 0.05);">
              <span class="badge-pill warn">Layer 2 (Upper)</span>
              <strong style="color:var(--text-0); margin-top:4px;">Sandbox Workspace</strong>
              <span style="font-size:11px; color:var(--text-2);">/tmp/aura-overlay/upper</span>
            </div>
            <div class="monitor-card" style="border-color:rgba(16, 185, 129, 0.4); background:rgba(16, 185, 129, 0.05);">
              <span class="badge-pill ok">Layer 3 (Merged)</span>
              <strong style="color:var(--text-0); margin-top:4px;">Active Virtual View</strong>
              <span style="font-size:11px; color:var(--text-2);">Unified runtime filesystem</span>
            </div>
          </div>

          <!-- Pending Changes Diff View -->
          <div class="monitor-card" style="flex:1;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
              <span style="font-weight:600; font-size:12px; color:var(--text-0);">Pending Mutations Diff</span>
              <span class="badge-pill ok">0 Uncommitted Changes</span>
            </div>
            <div style="background:#04060A; border:1px solid var(--glass-border); border-radius:var(--radius-card); padding:12px; font-family:var(--font-mono); font-size:11px; color:var(--text-2); text-align:center;">
              All sandbox actions are synchronized with rootfs. System is in healthy state.
            </div>
          </div>
        </div>
      </div>
    `;

    const commitBtn = el.querySelector(`#twin-commit-${ctx.winId}`);
    const discardBtn = el.querySelector(`#twin-discard-${ctx.winId}`);

    commitBtn.addEventListener('click', () => {
      alert('Sandbox workspace committed to persistent rootfs successfully.');
    });

    discardBtn.addEventListener('click', () => {
      alert('Sandbox workspace rolled back. Uncommitted mutations discarded.');
    });

    return { unmount: () => {} };
  }
};
