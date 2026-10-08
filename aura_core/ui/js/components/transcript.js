/**
 * AURA-OS Transcript Block Renderer (Pass 2)
 * High-craft structured block units with subsystem color-role stripes,
 * unified diffs with persistent commits, and line numbers.
 */

export class TranscriptRenderer {
  constructor(containerElement) {
    this.container = containerElement;
  }

  clear() {
    this.container.innerHTML = '';
  }

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Render User Intent Block (Neutral left stripe)
   */
  appendIntent(text) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = document.createElement('div');
    el.className = 'transcript-block block-intent';
    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>User Intent</span>
        </div>
        <span class="block-timestamp">${timeStr}</span>
      </div>
      <div class="block-body" style="font-family: var(--font-mono); font-size: var(--text-base);">${this.escapeHtml(text)}</div>
    `;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  /**
   * Render Agent Plan Checklist (Violet left stripe)
   */
  appendPlan(title, steps = []) {
    const el = document.createElement('div');
    el.className = 'transcript-block block-plan';

    const stepsHtml = steps.map((s, idx) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid var(--line-1);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="tech-tag tag-agent">${idx + 1}</span>
          <span style="font-size:var(--text-xs); color:var(--text-1);">${this.escapeHtml(s.label)}</span>
        </div>
        <span class="data-mono" style="font-size:11px; color:var(--text-3);">${s.time || 'pending'}</span>
      </div>
    `).join('');

    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          <span>Agent Plan &middot; ${this.escapeHtml(title)}</span>
        </div>
        <span class="tech-tag tag-agent">[AGENT]</span>
      </div>
      <div class="block-body">${stepsHtml}</div>
    `;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  /**
   * Render Tool Execution Block (Cyan left stripe)
   */
  appendToolCall(toolName, outputText, exitCode = 0, durationMs = 0) {
    const el = document.createElement('div');
    el.className = 'transcript-block block-tool';
    const isSuccess = (exitCode === 0);
    const statusTag = isSuccess 
      ? `<span class="tech-tag tag-persist">OK (0)</span>` 
      : `<span class="tech-tag tag-danger">EXIT ${exitCode}</span>`;

    const lines = (outputText || '(no output)').split('\n');
    const tableRows = lines.map((line, i) => `
      <tr>
        <td class="line-num">${i + 1}</td>
        <td class="line-content">${this.escapeHtml(line)}</td>
      </tr>
    `).join('');

    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="4 17 10 11 4 5"></polyline>
            <line x1="12" y1="19" x2="20" y2="19"></line>
          </svg>
          <span class="data-mono" style="font-size:var(--text-xs); color:var(--c-system-text);">tool.${this.escapeHtml(toolName)}</span>
        </div>
        <div class="block-header-right">
          <span class="data-mono" style="font-size:11px; color:var(--text-3);">${durationMs}ms</span>
          ${statusTag}
        </div>
      </div>
      <div class="diff-view-wrap">
        <table class="code-table">
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  /**
   * Render Unified Sandbox Diff Block with mutation approvals (Amber left stripe)
   */
  appendSandboxDiff(filePath, diffLines = [], riskLevel = 'LOW') {
    const el = document.createElement('div');
    el.className = 'transcript-block block-diff';

    const riskBadge = riskLevel === 'HIGH' 
      ? `<span class="tech-tag tag-danger">RISK: HIGH</span>` 
      : `<span class="tech-tag tag-sandbox">RISK: ${riskLevel}</span>`;

    let addCount = 0;
    let remCount = 0;

    const diffHtml = diffLines.map(line => {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        addCount++;
        return `<div class="diff-row diff-add">${this.escapeHtml(line)}</div>`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        remCount++;
        return `<div class="diff-row diff-remove">${this.escapeHtml(line)}</div>`;
      } else if (line.startsWith('@@')) {
        return `<div class="diff-row diff-hunk">${this.escapeHtml(line)}</div>`;
      }
      return `<div class="diff-row diff-context">${this.escapeHtml(line)}</div>`;
    }).join('');

    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span class="data-mono" style="font-size:var(--text-xs); color:var(--text-0);">${this.escapeHtml(filePath)}</span>
          <span class="data-mono" style="font-size:11px; color:var(--c-persist-text);">+${addCount}</span>
          <span class="data-mono" style="font-size:11px; color:var(--c-danger-text);">-${remCount}</span>
        </div>
        <div class="block-header-right">
          ${riskBadge}
        </div>
      </div>
      <div class="diff-view-wrap">${diffHtml}</div>
      <div class="diff-approval-bar">
        <span style="font-size:var(--text-xs); color:var(--text-2);">Isolated in OverlayFS Sandbox Workspace</span>
        <div style="display:flex; gap:8px;">
          <button class="btn-ghost discard-action-btn" style="padding: 2px 10px; font-size: 12px; border-radius: 4px; border: 1px solid var(--line-2); background: transparent; color: var(--text-1); cursor: pointer;">Discard</button>
          <button class="approve-action-btn" style="padding: 2px 12px; font-size: 12px; font-weight: 600; border-radius: 4px; border: none; background: var(--c-system); color: var(--c-system-solid-text); cursor: pointer;">Approve and persist</button>
        </div>
      </div>
    `;

    el.querySelector('.approve-action-btn')?.addEventListener('click', () => {
      const bar = el.querySelector('.diff-approval-bar');
      if (bar) bar.innerHTML = `<span class="tech-tag tag-persist">[COMMITTED] Upper layer mutations merged into rootfs.</span>`;
    });

    el.querySelector('.discard-action-btn')?.addEventListener('click', () => {
      const bar = el.querySelector('.diff-approval-bar');
      if (bar) bar.innerHTML = `<span class="tech-tag tag-sandbox">[DISCARDED] OverlayFS upper layer cleared.</span>`;
    });

    this.container.appendChild(el);
    this.scrollToBottom();
  }

  /**
   * Render Slim Memory Event (Magenta left stripe)
   */
  appendMemory(key, value) {
    const el = document.createElement('div');
    el.className = 'transcript-block block-memory';
    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <span>Memory Persisted</span>
        </div>
        <span class="tech-tag tag-memory">[MEM]</span>
      </div>
      <div class="block-body" style="font-size:var(--text-sm);">
        Remembered <strong style="color:var(--text-0);">${this.escapeHtml(key)}</strong> = <span class="data-mono" style="color:var(--c-memory-text);">${this.escapeHtml(value)}</span>
      </div>
    `;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  /**
   * Render Agent Natural Language Response (Violet left stripe)
   */
  appendResponse(text) {
    const el = document.createElement('div');
    el.className = 'transcript-block block-response';
    const formatted = this.formatMarkdown(text);

    el.innerHTML = `
      <div class="block-header">
        <div class="block-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="12 8 8 12 12 16 16 12 12 8"></polygon>
          </svg>
          <span>Agent Response</span>
        </div>
        <span class="tech-tag tag-agent">[AGENT]</span>
      </div>
      <div class="block-body">${formatted}</div>
    `;
    this.container.appendChild(el);
    this.scrollToBottom();
  }

  formatMarkdown(str) {
    if (!str) return '';
    let out = this.escapeHtml(str);

    out = out.replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-0); padding:8px 12px; border:1px solid var(--line-1); border-radius:4px; margin:6px 0; overflow-x:auto;"><code class="data-mono" style="font-size:12px; color:var(--text-1);">$1</code></pre>');
    out = out.replace(/`([^`]+)`/g, '<code class="data-mono" style="background:var(--bg-2); padding:1px 4px; border-radius:3px; color:var(--c-system-text); font-size:12px;">$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-0); font-weight:600;">$1</strong>');
    out = out.replace(/^- (.*)$/gim, '<li style="margin-bottom:2px;">$1</li>');
    out = out.replace(/(<li>.*<\/li>)/s, '<ul style="padding-left:18px; margin:4px 0;">$1</ul>');
    out = out.replace(/\n\n/g, '</p><p style="margin-top:6px;">');
    return `<p>${out}</p>`;
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
