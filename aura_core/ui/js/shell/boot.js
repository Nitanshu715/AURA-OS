/**
 * AURA-OS Boot Controller
 * The actual boot screen is now a self-contained inline HTML/CSS/JS block in index.html
 * that runs completely independently of the module system and fires its own 3.4-second
 * sequence with no ES module or async/await dependencies.
 *
 * This module only handles:
 *   - Waiting for the boot overlay to be removed from DOM (max 4.5s)
 *   - Then calling onComplete() to start the desktop shell
 *   - The lock screen logic remains here
 */

import { api } from './api.js';

export class BootController {
  constructor(onComplete) {
    this.lockOverlay = document.getElementById('lock-screen');
    this.onComplete  = onComplete;

    window.addEventListener('aura-lock-screen', () => this.showLockScreen());
    this._waitForBoot();
  }

  _waitForBoot() {
    const overlay = document.getElementById('aura-boot-overlay');
    if (!overlay) {
      // Boot overlay already gone (cached page, instant load)
      this.checkAuthOrProceed();
      return;
    }

    // Poll for removal — the inline script removes it at ~4450ms
    const check = () => {
      if (!document.getElementById('aura-boot-overlay')) {
        this.checkAuthOrProceed();
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }

  async checkAuthOrProceed() {
    try {
      const res = await api.get('/api/auth/status');
      if (res.ok && res.data && res.data.is_first_run) {
        this.showLockScreen(true);
      } else {
        if (this.lockOverlay) {
          this.lockOverlay.style.display = 'none';
          this.lockOverlay.style.pointerEvents = 'none';
        }
        this.onComplete();
      }
    } catch (_) {
      if (this.lockOverlay) {
        this.lockOverlay.style.display = 'none';
        this.lockOverlay.style.pointerEvents = 'none';
      }
      this.onComplete();
    }
  }

  showLockScreen(isFirstRun = false) {
    if (!this.lockOverlay) { this.onComplete(); return; }
    this.lockOverlay.style.display  = 'flex';
    this.lockOverlay.style.opacity  = '1';

    const pwdInput  = document.getElementById('lock-pwd-input');
    const unlockBtn = document.getElementById('lock-unlock-btn');
    const msgEl     = document.getElementById('lock-msg');

    if (msgEl) {
      msgEl.textContent = isFirstRun
        ? 'First Run: Enter a password to initialize your session.'
        : 'Enter password to unlock.';
    }

    const tryUnlock = async () => {
      const pwd = pwdInput ? pwdInput.value : '';
      const res = await api.post('/api/auth/login', { username: 'aura', password: pwd });
      if (res.ok) {
        if (res.data && res.data.token) api.setToken(res.data.token);
        this.lockOverlay.style.opacity = '0';
        setTimeout(() => {
          this.lockOverlay.style.display = 'none';
          this.onComplete();
        }, 200);
      } else {
        if (msgEl) msgEl.textContent = 'Invalid credentials. Please try again.';
      }
    };

    if (unlockBtn) unlockBtn.onclick = tryUnlock;
    if (pwdInput) {
      pwdInput.onkeydown = (e) => { if (e.key === 'Enter') tryUnlock(); };
      setTimeout(() => pwdInput.focus(), 100);
    }
  }
}
