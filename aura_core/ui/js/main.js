/**
 * AURA-OS Real Desktop Shell Bootloader
 * Initializes Windows 11-style desktop environment and registers all built-in apps.
 * 100% Zero Fake Data.
 */

import { store } from './shell/store.js';
import { WindowManager } from './shell/wm.js';
import { DesktopController } from './shell/desktop.js';
import { TaskbarController } from './shell/taskbar.js';
import { StartMenuController } from './shell/startmenu.js';
import { NotificationsController } from './shell/notifications.js';
import { ContextMenuController } from './shell/contextmenu.js';
import { BootController } from './shell/boot.js';

// Applications
import { FilesApp } from './apps/files.js';
import { TerminalApp } from './apps/terminal.js';
import { TaskManagerApp } from './apps/taskmgr.js';
import { BrowserApp } from './apps/browser.js';
import { SnippingApp } from './apps/snipping.js';
import { RecorderApp } from './apps/recorder.js';
import { PhotosApp } from './apps/photos.js';
import { MediaPlayerApp } from './apps/media.js';
import { EditorApp } from './apps/editor.js';
import { AgentApp } from './apps/agent.js';
import { MemoryApp } from './apps/memory.js';
import { SettingsApp } from './apps/settings.js';

const appsRegistry = {
  files: FilesApp,
  terminal: TerminalApp,
  taskmgr: TaskManagerApp,
  browser: BrowserApp,
  snipping: SnippingApp,
  recorder: RecorderApp,
  photos: PhotosApp,
  media: MediaPlayerApp,
  editor: EditorApp,
  agent: AgentApp,
  memory: MemoryApp,
  settings: SettingsApp
};

document.addEventListener('DOMContentLoaded', () => {
  const wm = new WindowManager(appsRegistry);
  const desktop = new DesktopController(wm);
  const taskbar = new TaskbarController(wm);
  const startMenu = new StartMenuController(wm);
  const notifications = new NotificationsController();
  const contextMenu = new ContextMenuController();

  window.addEventListener('aura-open-app', (e) => {
    wm.openApp(e.detail.appId, e.detail.params || {});
  });

  new BootController(() => {
    // Open native Terminal window so desktop apps are immediately active and interactive
    setTimeout(() => {
      wm.openApp('terminal');
    }, 300);
  });
});
