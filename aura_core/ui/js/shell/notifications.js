/**
 * AURA-OS Notifications Controller
 * Toast alerts, notification sound triggers, and Notification Center panel.
 * 100% Zero Fake Data.
 */

export class NotificationsController {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.init();
  }

  init() {
    window.addEventListener('aura-notify', (e) => {
      this.showToast(e.detail);
    });

    // Listen to real WebSocket events
    this.connectEventsWS();
  }

  showToast({ title, message, icon = 'bell', type = 'info', actions = [] }) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'os-toast';
    toast.innerHTML = `
      <svg width="20" height="20" style="color:var(--${type === 'err' ? 'err' : (type === 'warn' ? 'warn' : 'accent')}); flex-shrink:0;">
        <use href="#icon-${icon}"></use>
      </svg>
      <div style="flex:1; overflow:hidden;">
        <div style="font-size:12px; font-weight:600; color:var(--text-0);">${title}</div>
        <div style="font-size:11px; color:var(--text-1); margin-top:2px; line-height:1.35;">${message}</div>
        ${actions.length > 0 ? `
          <div style="display:flex; gap:6px; margin-top:8px;">
            ${actions.map((a, i) => `<button class="btn-glass" data-act="${i}" style="padding:2px 8px; font-size:10.5px;">${a.label}</button>`).join('')}
          </div>
        ` : ''}
      </div>
      <button class="explorer-nav-btn close-toast" style="width:18px; height:18px; font-size:10px;">&#10005;</button>
    `;

    toast.querySelector('.close-toast').addEventListener('click', () => toast.remove());

    actions.forEach((a, i) => {
      const btn = toast.querySelector(`[data-act="${i}"]`);
      if (btn) btn.addEventListener('click', () => { a.action(); toast.remove(); });
    });

    this.container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 6000);
  }

  connectEventsWS() {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/events`);
      ws.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);
          this.showToast({
            title: ev.type,
            message: JSON.stringify(ev.payload),
            icon: 'bell'
          });
        } catch (_) {}
      };
    } catch (_) {}
  }
}
