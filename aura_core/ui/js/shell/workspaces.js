/**
 * AURA SHELL - Workspaces Controller (1-5)
 * Handles workspace switching, active states, and pager synchronization.
 */

import { store } from './store.js';

export class WorkspacesController {
  constructor(wm) {
    this.wm = wm;
    this.currentWs = 1;
    this.init();
  }

  init() {
    store.on('switchWorkspace', (ws) => this.switchWorkspace(ws));

    // Bind Workspace pager buttons in topbar
    document.querySelectorAll('.ws-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = parseInt(btn.getAttribute('data-ws'), 10);
        this.switchWorkspace(ws);
      });
    });

    store.on('windowsChanged', () => this.updateOccupiedState());
  }

  switchWorkspace(wsNum) {
    if (wsNum < 1 || wsNum > 5) return;
    this.currentWs = wsNum;
    store.state.activeWorkspace = wsNum;

    // Update Topbar UI
    document.querySelectorAll('.ws-btn').forEach(btn => {
      const ws = parseInt(btn.getAttribute('data-ws'), 10);
      btn.classList.toggle('active', ws === wsNum);
    });

    // Notify Window Manager
    this.wm.setWorkspace(wsNum);
    this.updateOccupiedState();
    store.emit('workspaceChanged', wsNum);
  }

  updateOccupiedState() {
    const list = this.wm.getWindowsList();
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    list.forEach(w => {
      if (counts[w.ws] !== undefined) counts[w.ws]++;
    });

    document.querySelectorAll('.ws-btn').forEach(btn => {
      const ws = parseInt(btn.getAttribute('data-ws'), 10);
      btn.classList.toggle('occupied', counts[ws] > 0 && ws !== this.currentWs);
    });
  }
}
