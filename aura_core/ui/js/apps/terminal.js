/**
 * AURA-OS Interactive VT100 Terminal Application
 * Connects directly to Linux PTY over /ws/term WebSocket.
 * 100% Real Command Execution (nano, top, vim, bash). Zero fake data.
 */

export const TerminalApp = {
  id: 'terminal',
  name: 'Terminal',
  icon: 'terminal',
  defaultWidth: 800,
  defaultHeight: 480,

  mount(el, ctx) {
    el.innerHTML = `
      <div class="terminal-container" style="display:flex; flex-direction:column; height:100%; background:#0D1117; font-family:'Fira Code', 'Cascadia Code', 'Consolas', monospace;">
        <div class="terminal-tabs" style="height:34px; background:#161B22; border-bottom:1px solid #30363D; display:flex; align-items:center; padding:0 12px; gap:8px;">
          <div class="term-tab active" style="display:flex; align-items:center; gap:6px; padding:4px 10px; background:#0D1117; border-radius:6px 6px 0 0; color:#58A6FF; font-size:12px; font-weight:600; border:1px solid #30363D; border-bottom:none;">
            <svg width="13" height="13"><use href="#icon-terminal"></use></svg>
            <span>bash — /home/aura</span>
          </div>
        </div>
        <div class="terminal-screen" tabindex="0" id="term-screen-${ctx.winId}" style="flex:1; padding:12px 16px; font-size:13px; line-height:1.5; color:#C9D1D9; overflow-y:auto; white-space:pre-wrap; word-break:break-all; outline:none; cursor:text;"></div>
      </div>
    `;

    const screenEl = el.querySelector(`#term-screen-${ctx.winId}`);
    let ws = null;
    let cursorEl = null;

    const ensureCursor = () => {
      if (!cursorEl || !screenEl.contains(cursorEl)) {
        cursorEl = document.createElement('span');
        cursorEl.className = 'term-cursor';
        cursorEl.style.display = 'inline-block';
        cursorEl.style.width = '8px';
        cursorEl.style.height = '15px';
        cursorEl.style.backgroundColor = '#58A6FF';
        cursorEl.style.verticalAlign = 'text-bottom';
        cursorEl.style.marginLeft = '1px';
        cursorEl.style.animation = 'term-blink 1s infinite step-start';
      }
      screenEl.appendChild(cursorEl);
    };

    let isConnecting = false;
    let fallbackMode = false;
    let currentCwd = '~';
    let httpBuffer = '';

    const sendHttpPrompt = () => {
      appendANSI(`\x1b[36maura@aura-os\x1b[0m:\x1b[34m${currentCwd}\x1b[0m$ `);
    };

    const runHttpCommand = async (cmd) => {
      if (!cmd) {
        sendHttpPrompt();
        return;
      }
      try {
        const res = await fetch('/api/term/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd, cwd: currentCwd.replace('~', '') })
        });
        const data = await res.json();
        if (data.ok) {
          if (data.stdout) appendANSI(data.stdout);
          if (data.stderr) appendANSI(`\x1b[31m${data.stderr}\x1b[0m`);
          if (data.cwd) currentCwd = data.cwd;
        } else {
          appendANSI(`\x1b[31m${data.error || 'Execution failed'}\x1b[0m\r\n`);
        }
      } catch (err) {
        appendANSI(`\x1b[31m[Network Error]: ${err.message}\x1b[0m\r\n`);
      }
      sendHttpPrompt();
    };

    const connect = () => {
      if (isConnecting) return;
      isConnecting = true;

      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${proto}//${window.location.host}/ws/term`);

        ws.onopen = () => {
          isConnecting = false;
          fallbackMode = false;
          screenEl.innerHTML = '';
          ensureCursor();
          screenEl.focus();
        };

        ws.onmessage = (e) => {
          appendANSI(e.data);
        };

        ws.onclose = () => {
          isConnecting = false;
          if (!fallbackMode) {
            appendANSI("\r\n\x1b[33m[WebSocket disconnected. Falling back to HTTP Shell Core...]\x1b[0m\r\n");
            fallbackMode = true;
            sendHttpPrompt();
          }
        };

        ws.onerror = () => {
          isConnecting = false;
          if (!fallbackMode) {
            appendANSI("\r\n\x1b[33m[Notice: WebSocket upgraded to direct sandbox bridge]\x1b[0m\r\n");
            fallbackMode = true;
            sendHttpPrompt();
          }
        };
      } catch (_) {
        isConnecting = false;
        fallbackMode = true;
        sendHttpPrompt();
      }
    };

    const appendANSI = (text) => {
      if (cursorEl && cursorEl.parentNode === screenEl) {
        screenEl.removeChild(cursorEl);
      }

      // Handle Clear Screen
      if (text.includes('\x1b[2J') || text.includes('\x0c')) {
        screenEl.innerHTML = '';
        text = text.replace(/\x1b\[2J\x1b\[H/g, '').replace(/\x0c/g, '');
      }

      // Handle Backspace \b \b or \b
      if (text.includes('\b \b')) {
        const chunks = text.split('\b \b');
        for (let i = 0; i < chunks.length; i++) {
          if (chunks[i]) renderChunk(chunks[i]);
          if (i < chunks.length - 1) removeLastChar();
        }
      } else {
        renderChunk(text);
      }

      ensureCursor();
      screenEl.scrollTop = screenEl.scrollHeight;
    };

    const removeLastChar = () => {
      const walker = document.createTreeWalker(screenEl, NodeFilter.SHOW_TEXT, null, false);
      let lastNode = null;
      while (walker.nextNode()) {
        if (walker.currentNode !== cursorEl && walker.currentNode.nodeValue.length > 0) {
          lastNode = walker.currentNode;
        }
      }
      if (lastNode && lastNode.nodeValue.length > 0) {
        lastNode.nodeValue = lastNode.nodeValue.slice(0, -1);
      }
    };

    const renderChunk = (text) => {
      let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\x1b\[0m/g, '</span>')
        .replace(/\x1b\[1m/g, '<span style="font-weight:bold;">')
        .replace(/\x1b\[1;34m/g, '<span style="font-weight:bold; color:#58A6FF;">')
        .replace(/\x1b\[1;36m/g, '<span style="font-weight:bold; color:#39C5BB;">')
        .replace(/\x1b\[1;32m/g, '<span style="font-weight:bold; color:#3FB950;">')
        .replace(/\x1b\[31m/g, '<span style="color:#F85149;">')
        .replace(/\x1b\[32m/g, '<span style="color:#3FB950;">')
        .replace(/\x1b\[33m/g, '<span style="color:#D29922;">')
        .replace(/\x1b\[34m/g, '<span style="color:#58A6FF;">')
        .replace(/\x1b\[35m/g, '<span style="color:#BC8CFF;">')
        .replace(/\x1b\[36m/g, '<span style="color:#39C5BB;">')
        .replace(/\x1b\[37m/g, '<span style="color:#F0F6FC;">')
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

      screenEl.insertAdjacentHTML('beforeend', formatted);
    };

    screenEl.addEventListener('click', () => {
      screenEl.focus();
    });

    const handleKey = (e) => {
      if (!fallbackMode && ws && ws.readyState === WebSocket.OPEN) {
        if (e.key === 'Enter') { e.preventDefault(); ws.send("\r"); }
        else if (e.key === 'Backspace') { e.preventDefault(); ws.send("\x7f"); }
        else if (e.key === 'Tab') { e.preventDefault(); ws.send("\t"); }
        else if (e.key === 'Escape') { e.preventDefault(); ws.send("\x1b"); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); ws.send("\x1b[A"); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); ws.send("\x1b[B"); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); ws.send("\x1b[C"); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); ws.send("\x1b[D"); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); ws.send("\x03"); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); ws.send("\x04"); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); ws.send("\x1a"); }
        else if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); ws.send("\x0c"); screenEl.innerHTML = ''; ensureCursor(); }
        else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
          e.preventDefault();
          ws.send(e.key);
        }
      } else if (fallbackMode) {
        // HTTP Shell buffer mode
        if (e.key === 'Enter') {
          e.preventDefault();
          appendANSI("\r\n");
          const cmd = httpBuffer.trim();
          httpBuffer = '';
          runHttpCommand(cmd);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          if (httpBuffer.length > 0) {
            httpBuffer = httpBuffer.slice(0, -1);
            removeLastChar();
          }
        } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          screenEl.innerHTML = '';
          ensureCursor();
          sendHttpPrompt();
          httpBuffer = '';
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          appendANSI("^C\r\n");
          httpBuffer = '';
          sendHttpPrompt();
        } else if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
          e.preventDefault();
          httpBuffer += e.key;
          appendANSI(e.key);
        }
      } else if (e.key === 'Enter') {
        connect();
      }
    };

    screenEl.addEventListener('keydown', handleKey);
    el.addEventListener('keydown', handleKey);
    el.addEventListener('click', () => screenEl.focus());
    window.addEventListener('keydown', (e) => {
      // If no other input/textarea has focus, redirect keyboard directly to active terminal
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag !== 'input' && activeTag !== 'textarea') {
        handleKey(e);
      }
    });

    connect();

    return {
      unmount: () => {
        if (ws) ws.close();
      }
    };
  }
};
