/**
 * AURA-OS Windows Task Manager Clone
 * Tabs: Processes, Performance, Services, Network, Logs.
 * 100% Real metrics from /proc, /sys, and cgroups v2. Zero fake data.
 */

import { store } from '../shell/store.js';
import { api } from '../shell/api.js';

export const TaskManagerApp = {
  id: 'taskmgr',
  name: 'Task Manager',
  icon: 'monitor',
  defaultWidth: 840,
  defaultHeight: 540,

  mount(el, ctx) {
    let activeTab = 'processes';
    let selectedPid = null;
    let pollInterval = null;

    el.innerHTML = `
      <div class="taskmgr-layout">
        <!-- Top Tab Strip -->
        <div class="taskmgr-tabs-strip">
          <button class="taskmgr-tab-btn active" data-tab="processes">Processes</button>
          <button class="taskmgr-tab-btn" data-tab="performance">Performance</button>
          <button class="taskmgr-tab-btn" data-tab="services">Services</button>
          <button class="taskmgr-tab-btn" data-tab="logs">Event Logs</button>
          <button class="taskmgr-tab-btn" data-tab="flowmap">Architecture Flow Map</button>
        </div>

        <!-- Tab Body -->
        <div class="taskmgr-body" id="tm-body-${ctx.winId}">
          <!-- Dynamic Content Rendered Here -->
        </div>

        <!-- Action Bar -->
        <div class="taskmgr-actions-bar" id="tm-actions-${ctx.winId}">
          <button class="btn-glass" id="tm-end-task" style="display:none; color:var(--err); border-color:var(--err);">End Task (SIGTERM)</button>
          <button class="btn-glass" id="tm-refresh-btn"><svg width="12" height="12"><use href="#icon-rotate-cw"></use></svg><span>Refresh</span></button>
        </div>
      </div>
    `;

    const bodyEl = el.querySelector(`#tm-body-${ctx.winId}`);
    const endTaskBtn = el.querySelector('#tm-end-task');

    const renderProcesses = async () => {
      bodyEl.innerHTML = `
        <table class="file-table" style="font-family:var(--font-mono); font-size:11.5px;">
          <thead>
            <tr>
              <th style="width:25%;">Process Name</th>
              <th style="width:10%;">PID</th>
              <th style="width:10%;">State</th>
              <th style="width:15%;">Memory (RSS)</th>
              <th style="width:10%;">Threads</th>
              <th style="width:15%;">User</th>
              <th style="width:15%;">Cgroup</th>
            </tr>
          </thead>
          <tbody id="tm-proc-tbody">
            <tr><td colspan="7" style="padding:16px; color:var(--text-2);">Reading /proc metrics...</td></tr>
          </tbody>
        </table>
      `;

      try {
        const res = await api.get('/api/proc/list');
        if (res.ok && res.data) {
          const tbody = bodyEl.querySelector('#tm-proc-tbody');
          if (!tbody) return;
          tbody.innerHTML = '';
          res.data.forEach(p => {
            const row = document.createElement('tr');
            row.className = 'file-row';
            if (p.pid === selectedPid) row.classList.add('selected');

            row.innerHTML = `
              <td style="font-weight:600; color:var(--text-0);">${p.name}</td>
              <td>${p.pid}</td>
              <td><span class="badge-pill ${p.state === 'R' ? 'ok' : ''}" style="font-size:10px;">${p.state}</span></td>
              <td>${p.rss_mb} MB</td>
              <td>${p.threads}</td>
              <td>${p.user}</td>
              <td style="color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">${p.cgroup}</td>
            `;

            row.addEventListener('click', () => {
              bodyEl.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
              row.classList.add('selected');
              selectedPid = p.pid;
              endTaskBtn.style.display = 'inline-flex';
            });

            tbody.appendChild(row);
          });
        }
      } catch (_) {}
    };

    const renderPerformance = () => {
      const stats = store.state;
      bodyEl.innerHTML = `
        <div style="display:grid; grid-template-columns: 200px 1fr; gap:16px; height:100%;">
          <!-- Left Summary Tiles -->
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div class="settings-section-card" style="padding:10px;">
              <div style="font-size:11px; color:var(--text-2); font-weight:600;">CPU</div>
              <div style="font-size:22px; font-weight:700; color:var(--text-0);">${stats.cpuPercent}%</div>
              <div style="font-size:11px; color:var(--text-2);">${stats.osName}</div>
            </div>
            <div class="settings-section-card" style="padding:10px;">
              <div style="font-size:11px; color:var(--text-2); font-weight:600;">MEMORY</div>
              <div style="font-size:22px; font-weight:700; color:var(--text-0);">${stats.memory.percent || 0}%</div>
              <div style="font-size:11px; color:var(--text-2);">${stats.memory.used_mb || 0} / ${stats.memory.total_mb || 0} MB</div>
            </div>
          </div>

          <!-- Right Real-time Graph -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div class="settings-section-card" style="flex:1; display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-size:12px; font-weight:600; color:var(--text-0);">CPU Utilization (60 Seconds)</span>
                <span class="badge-pill accent">${stats.perCorePercent.length || 1} Cores</span>
              </div>
              <div style="flex:1; background:#06080C; border-radius:4px; border:1px solid var(--line-1); position:relative; overflow:hidden;">
                <canvas id="tm-perf-cpu-canvas" style="width:100%; height:100%;"></canvas>
              </div>
            </div>
          </div>
        </div>
      `;

      const cvs = bodyEl.querySelector('#tm-perf-cpu-canvas');
      if (cvs) {
        cvs.width = cvs.offsetWidth || 500;
        cvs.height = cvs.offsetHeight || 220;
        const ctx2 = cvs.getContext('2d');
        const history = store.history.cpu;
        const w = cvs.width;
        const h = cvs.height;

        ctx2.clearRect(0, 0, w, h);
        ctx2.strokeStyle = store.state.currentTheme.accent || '#2DD4E0';
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        const step = w / (history.length - 1);
        history.forEach((val, idx) => {
          const y = h - (val / 100.0) * (h - 10) - 5;
          if (idx === 0) ctx2.moveTo(0, y);
          else ctx2.lineTo(idx * step, y);
        });
        ctx2.stroke();
      }
    };

    const renderServices = async () => {
      bodyEl.innerHTML = `<div style="padding:12px; color:var(--text-2);">Querying service daemons...</div>`;
      try {
        const res = await api.get('/api/services');
        if (res.ok && res.data) {
          bodyEl.innerHTML = `
            <table class="file-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>PID</th>
                </tr>
              </thead>
              <tbody>
                ${res.data.map(s => `
                  <tr class="file-row">
                    <td style="font-weight:600; color:var(--text-0);">${s.name}</td>
                    <td>${s.description}</td>
                    <td><span class="badge-pill ${s.status === 'running' ? 'ok' : 'warn'}">${s.status}</span></td>
                    <td class="font-mono">${s.pid || '--'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      } catch (_) {}
    };

    const renderLogs = async () => {
      bodyEl.innerHTML = `<div style="padding:12px; color:var(--text-2);">Tailing system audit logs...</div>`;
      try {
        const res = await api.get('/api/logs/tail?source=aura_audit&lines=40');
        if (res.ok && res.data) {
          bodyEl.innerHTML = `
            <div style="font-family:var(--font-mono); font-size:11.5px; line-height:1.5; color:#CBD5E1; background:#06080C; padding:10px; height:100%; overflow-y:auto; border-radius:4px; border:1px solid var(--line-1);">
              ${res.data.map(l => `<div>${l}</div>`).join('')}
            </div>
          `;
        }
      } catch (_) {}
    };

    const renderFlowMap = () => {
      bodyEl.innerHTML = `
        <div class="flow-canvas-wrapper" style="height:100%; display:flex; flex-direction:column; background:#0F172A; user-select:none; overflow:hidden; position:relative;">
          <!-- Toolbar Controls -->
          <div style="height:38px; background:#0B0F19; border-bottom:1px solid #1E293B; display:flex; align-items:center; justify-content:space-between; padding:0 14px; z-index:10;">
            <div style="display:flex; align-items:center; gap:10px; font-family:var(--font-mono); font-size:11.5px;">
              <span style="color:#38BDF8; font-weight:700;">SYSTEM ARCHITECTURE MAP</span>
              <span style="color:#64748B;">|</span>
              <span style="color:#94A3B8;">Click + Drag to Pan &middot; Scroll to Zoom</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button id="flow-zoom-in" class="btn-glass" style="padding:2px 8px; font-size:11px; font-weight:700;">+</button>
              <button id="flow-zoom-out" class="btn-glass" style="padding:2px 8px; font-size:11px; font-weight:700;">-</button>
              <button id="flow-zoom-reset" class="btn-glass" style="padding:2px 8px; font-size:11px;">Reset</button>
            </div>
          </div>

          <!-- Pan/Zoom Infinite Canvas -->
          <div id="flow-viewport" style="flex:1; width:100%; height:100%; overflow:hidden; cursor:grab; position:relative; background-image: radial-gradient(#1E293B 1px, transparent 1px); background-size: 24px 24px;">
            <div id="flow-stage" style="position:absolute; top:0; left:0; transform-origin: 0 0; width:2200px; height:900px;">
              
              <!-- SVG Connector Lines -->
              <svg style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569"/>
                  </marker>
                  <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#38BDF8"/>
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#10B981"/>
                  </marker>
                  <marker id="arrow-pink" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 8 5 L 0 9 z" fill="#EC4899"/>
                  </marker>
                </defs>

                <!-- Layer 1 to 2 -->
                <path d="M 310 140 L 410 140" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
                <path d="M 310 320 L 410 320" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
                
                <!-- Layer 2 to 3 -->
                <path d="M 680 140 L 780 140" stroke="#10B981" stroke-width="2" fill="none" marker-end="url(#arrow-green)"/>
                <path d="M 680 320 L 780 230" stroke="#10B981" stroke-width="2" fill="none" marker-end="url(#arrow-green)"/>
                
                <!-- Layer 3 to 4 -->
                <path d="M 1060 140 L 1160 140" stroke="#38BDF8" stroke-width="2" fill="none" marker-end="url(#arrow-blue)"/>
                <path d="M 1060 250 L 1160 250" stroke="#38BDF8" stroke-width="2" fill="none" marker-end="url(#arrow-blue)"/>
                <path d="M 1060 360 L 1160 360" stroke="#38BDF8" stroke-width="2" fill="none" marker-end="url(#arrow-blue)"/>

                <!-- Layer 4 to 5 (Frontend Desktop & AI) -->
                <path d="M 1440 140 L 1540 140" stroke="#EC4899" stroke-width="2" fill="none" marker-end="url(#arrow-pink)"/>
                <path d="M 1440 250 L 1540 250" stroke="#EC4899" stroke-width="2" fill="none" marker-end="url(#arrow-pink)"/>
                <path d="M 1440 360 L 1540 360" stroke="#EC4899" stroke-width="2" fill="none" marker-end="url(#arrow-pink)"/>
              </svg>

              <!-- COLUMN 1: HOST & HYPERVISOR -->
              <div style="position:absolute; left:40px; top:40px; width:270px; font-family:var(--font-mono);">
                <div style="font-size:10px; font-weight:800; color:#F59E0B; letter-spacing:1px; margin-bottom:8px;">01 HYPERVISOR & HOST</div>
                
                <div style="background:#0F172A; border:1px solid #F59E0B; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">VirtualBox / QEMU VM</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">x86_64 Hardware Emulation</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; 2 Cores &middot; 2048 MB RAM<br>
                    &bull; VBoxSVGA Graphics<br>
                    &bull; NAT Adapter (Port 8888, 2222)
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #F59E0B; padding:12px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">Shared Folder / SSHFS</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Live Workspace Mirror</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Host: <code style="color:#F59E0B;">D:\\AURA-OS\\aura_core</code><br>
                    &bull; Guest: <code style="color:#F59E0B;">/media/sf_aura_core</code><br>
                    &bull; Zero sync build delay
                  </div>
                </div>
              </div>

              <!-- COLUMN 2: LINUX KERNEL & INIT -->
              <div style="position:absolute; left:410px; top:40px; width:270px; font-family:var(--font-mono);">
                <div style="font-size:10px; font-weight:800; color:#10B981; letter-spacing:1px; margin-bottom:8px;">02 KERNEL & SYSTEM INIT</div>
                
                <div style="background:#0F172A; border:1px solid #10B981; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">Linux 5.10 LTS Kernel</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">NitanshuOS Custom Build</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Cgroups v2 Resource Accounting<br>
                    &bull; OverlayFS Sandbox Drivers<br>
                    &bull; UNIX98 PTY Master/Slave Subsys
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #10B981; padding:12px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">/etc/init.d/S99aura</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Autonomous Boot Daemon</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Auto-mounts /aura_core<br>
                    &bull; Starts Python 3 Gateway<br>
                    &bull; Zero manual CLI execution
                  </div>
                </div>
              </div>

              <!-- COLUMN 3: AURA GATEWAY ENGINE -->
              <div style="position:absolute; left:780px; top:40px; width:280px; font-family:var(--font-mono);">
                <div style="font-size:10px; font-weight:800; color:#38BDF8; letter-spacing:1px; margin-bottom:8px;">03 AURA-OS CORE GATEWAY</div>
                
                <div style="background:#0F172A; border:1px solid #38BDF8; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">server.py (Port 8888)</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Pure Python HTTP & WS Server</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Non-blocking socket select()<br>
                    &bull; Multi-threaded client dispatcher<br>
                    &bull; Static UI and asset pipeline
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #38BDF8; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">/ws/term PTY Multiplexer</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">VT100 Terminal Bridge</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Bidirectional character stream<br>
                    &bull; Isolated /home/aura root<br>
                    &bull; Compilers (g++, javac, python)
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #38BDF8; padding:12px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">/ws/events & Telemetry</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Real-Time Event Bus</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; /proc memory & CPU stats<br>
                    &bull; Filesystem CRUD notifications<br>
                    &bull; Kernel ring buffer broadcaster
                  </div>
                </div>
              </div>

              <!-- COLUMN 4: SANDBOX & NEURAL MEMORY -->
              <div style="position:absolute; left:1160px; top:40px; width:280px; font-family:var(--font-mono);">
                <div style="font-size:10px; font-weight:800; color:#EC4899; letter-spacing:1px; margin-bottom:8px;">04 STORAGE & NEURAL AI</div>
                
                <div style="background:#0F172A; border:1px solid #EC4899; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">/home/aura Sandbox</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Isolated User Space</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Desktop, Docs, Pictures, Apps<br>
                    &bull; Strict boundary containment<br>
                    &bull; Safe disposable runtime
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #EC4899; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">ai_engine.py (Copilot)</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Multi-turn Neural Agent</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Context memory tracking<br>
                    &bull; Autonomous command synthesizer<br>
                    &bull; Zero fake execution replies
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #EC4899; padding:12px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">SQLite /var/lib/aura_memory.db</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Vector & Knowledge Store</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Semantic knowledge indexing<br>
                    &bull; System audit trails<br>
                    &bull; Command execution logs
                  </div>
                </div>
              </div>

              <!-- COLUMN 5: DESKTOP UI & APPS -->
              <div style="position:absolute; left:1540px; top:40px; width:280px; font-family:var(--font-mono);">
                <div style="font-size:10px; font-weight:800; color:#A855F7; letter-spacing:1px; margin-bottom:8px;">05 DESKTOP APPLICATIONS</div>
                
                <div style="background:#0F172A; border:1px solid #A855F7; padding:12px; margin-bottom:14px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">Interactive Apps Registry</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Single Page Desktop Shell</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Terminal (bash ANSI / VT100)<br>
                    &bull; File Explorer (XDG dirs)<br>
                    &bull; Task Manager (/proc metrics)<br>
                    &bull; Snipping Tool & Screen Recorder<br>
                    &bull; Photos & Media Player
                  </div>
                </div>

                <div style="background:#0F172A; border:1px solid #A855F7; padding:12px;">
                  <div style="color:#F8FAFC; font-weight:700; font-size:12px;">Window Manager (wm.js)</div>
                  <div style="color:#64748B; font-size:10px; margin-top:2px;">Desktop Compositor</div>
                  <div style="margin-top:8px; font-size:11px; color:#CBD5E1; border-top:1px solid #1E293B; padding-top:6px;">
                    &bull; Edge snapping & docking<br>
                    &bull; Alt+Tab switcher<br>
                    &bull; Smooth dragging & resizing
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;

      // Interactive Pan & Zoom logic
      const viewport = bodyEl.querySelector('#flow-viewport');
      const stage = bodyEl.querySelector('#flow-stage');
      let isPanning = false;
      let startX = 0, startY = 0;
      let panX = 20, panY = 20;
      let zoom = 1.0;

      const updateTransform = () => {
        stage.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
      };

      updateTransform();

      viewport.addEventListener('mousedown', (e) => {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        viewport.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        updateTransform();
      });

      window.addEventListener('mouseup', () => {
        isPanning = false;
        if (viewport) viewport.style.cursor = 'grab';
      });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        zoom = Math.min(Math.max(0.4, zoom * factor), 2.2);
        updateTransform();
      });

      bodyEl.querySelector('#flow-zoom-in')?.addEventListener('click', () => {
        zoom = Math.min(2.2, zoom * 1.15);
        updateTransform();
      });

      bodyEl.querySelector('#flow-zoom-out')?.addEventListener('click', () => {
        zoom = Math.max(0.4, zoom * 0.85);
        updateTransform();
      });

      bodyEl.querySelector('#flow-zoom-reset')?.addEventListener('click', () => {
        zoom = 1.0;
        panX = 20;
        panY = 20;
        updateTransform();
      });
    };

    const switchTab = (tab) => {
      activeTab = tab;
      selectedPid = null;
      endTaskBtn.style.display = 'none';
      el.querySelectorAll('.taskmgr-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
      });

      if (tab === 'processes') renderProcesses();
      else if (tab === 'performance') renderPerformance();
      else if (tab === 'services') renderServices();
      else if (tab === 'logs') renderLogs();
      else if (tab === 'flowmap') renderFlowMap();
    };

    el.querySelectorAll('.taskmgr-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
    });

    el.querySelector('#tm-refresh-btn').addEventListener('click', () => switchTab(activeTab));

    endTaskBtn.addEventListener('click', async () => {
      if (selectedPid) {
        await api.post(`/api/proc/${selectedPid}/signal`, { signal: 'TERM' });
        renderProcesses();
      }
    });

    switchTab('processes');
    pollInterval = setInterval(() => {
      if (activeTab === 'processes') renderProcesses();
      else if (activeTab === 'performance') renderPerformance();
      else if (activeTab === 'logs') renderLogs();
    }, 2000);

    return {
      unmount: () => {
        if (pollInterval) clearInterval(pollInterval);
      }
    };
  }
};
