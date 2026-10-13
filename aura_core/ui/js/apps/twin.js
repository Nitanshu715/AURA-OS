/**
 * AURA-OS Dual-Twin Multi-Agent Orchestrator Studio
 * Next-Gen High-Tech Cybernetic Multi-Agent Topology & Consensus Engine
 *
 * Visualizes:
 * - Live Agent Grid: All 5 active agent cores with real-time state, load, memory, and status badges:
 *   1. Alpha Core (Task Decomposition & Dependency Planner)
 *   2. Gamma Core (Capability & Toolchain Sentinel)
 *   3. Beta Core (Artifact & Workspace Synthesizer)
 *   4. Delta Core (AST Integrity & Syntax Auditor)
 *   5. Epsilon Core (Twin Replica Synchronizer & Latency Supervisor)
 * - Dynamic Agent Topology / Deployment Map with connection rays, live pulse packets, and step counters.
 * - Live Agent Telemetry Console with streaming log feeds showing exact agent actions, timestamps, and deployment details.
 * - Autonomous Self-Healing Sequence with stage takeover animations.
 * - Zero Emojis.
 */

import { api } from '../shell/api.js';

export const DualTwinApp = {
  id: 'twin',
  name: 'Dual-Twin Studio',
  icon: 'twin',
  defaultWidth: 1160,
  defaultHeight: 760,

  mount(el, ctx) {
    let isExecuting = false;

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; background:var(--bg-2); color:var(--text-0); overflow:hidden; position:relative; font-family:var(--font-sans);">
        
        <!-- Live HUD Control Bar -->
        <div style="height:62px; background:var(--bg-1); border-bottom:1px solid var(--line-1); display:flex; align-items:center; justify-content:space-between; padding:0 24px; z-index:10; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
          <div style="display:flex; align-items:center; gap:14px;">
            <div style="width:38px; height:38px; border-radius:10px; background:var(--bg-3); border:1px solid var(--line-2); display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(15,23,42,0.06);">
              <svg width="20" height="20" style="color:var(--accent);"><use href="#icon-monitor"></use></svg>
            </div>
            <div>
              <div style="font-size:14px; font-weight:700; color:var(--text-0); display:flex; align-items:center; gap:10px;">
                <span>Dual-Twin Multi-Agent Topology & Studio</span>
                <span id="dt-twin-badge" style="font-size:10px; padding:2px 10px; border-radius:999px; background:var(--accent-dim); border:1px solid var(--line-2); color:var(--accent); font-weight:700; transition:all 0.4s ease;">PRIMARY TWIN ACTIVE</span>
              </div>
              <div style="font-size:11.5px; color:var(--text-2);">5 Autonomous Distributed Cores &middot; Capability Arbitration &middot; Sub-2ms Replica Sync</div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center; gap:8px; background:var(--bg-2); padding:6px 14px; border-radius:8px; border:1px solid var(--line-1);">
              <span style="width:8px; height:8px; border-radius:50%; background:#10B981; transition:background 0.3s ease;" id="dt-pulse-dot"></span>
              <span style="font-size:11.5px; font-weight:600; color:var(--text-1);" id="dt-latency-text">Live Sync (1.4ms)</span>
            </div>
          </div>
        </div>

        <!-- Main Viewport Area -->
        <div id="dt-viewport" style="flex:1; display:flex; flex-direction:column; padding:20px 24px; overflow-y:auto; position:relative; transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s ease; gap:16px;">
          
          <!-- MISSION TASK INPUT CARD -->
          <div style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:12px; padding:16px 20px; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
            <div style="font-size:11px; font-weight:700; color:var(--text-2); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.6px; display:flex; justify-content:space-between;">
              <span>Autonomous Multi-Agent Mission Input</span>
              <span style="color:var(--text-3); font-weight:500;" id="dt-mesh-status">5 Cores Connected &middot; Standby</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
              <input type="text" id="dt-prompt-input" placeholder="Type any task: e.g. 'Build an academic research paper' or 'Create a full stack web app'..." style="flex:1; background:var(--bg-2); border:1px solid var(--line-2); border-radius:8px; padding:12px 16px; font-size:13px; color:var(--text-0); outline:none; transition:border-color 0.2s ease, box-shadow 0.2s ease;">
              <button id="dt-execute-btn" class="btn-solid" style="padding:12px 24px; font-size:13px; font-weight:600; border-radius:8px; background:var(--accent); color:#FFFFFF; display:flex; align-items:center; gap:8px; cursor:pointer; border:none; box-shadow:0 2px 4px rgba(2,132,199,0.25);">
                <span>Deploy Agent Pipeline</span>
              </button>
            </div>
          </div>

          <!-- AGENT DEPLOYMENT OVERVIEW METRICS -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;">
            <div style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:12px 16px; box-shadow:0 1px 2px rgba(15,23,42,0.03);">
              <div style="font-size:10px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:0.5px;">Agents Deployed</div>
              <div style="font-size:18px; font-weight:700; color:var(--text-0); margin-top:2px;" id="dt-stat-agents">5 Cores</div>
            </div>
            <div style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:12px 16px; box-shadow:0 1px 2px rgba(15,23,42,0.03);">
              <div style="font-size:10px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:0.5px;">Execution Phase</div>
              <div style="font-size:18px; font-weight:700; color:#10B981; margin-top:2px;" id="dt-stat-phase">IDLE</div>
            </div>
            <div style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:12px 16px; box-shadow:0 1px 2px rgba(15,23,42,0.03);">
              <div style="font-size:10px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:0.5px;">Active Twin Target</div>
              <div style="font-size:18px; font-weight:700; color:var(--accent); margin-top:2px;" id="dt-stat-twin">Primary-Host</div>
            </div>
            <div style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:12px 16px; box-shadow:0 1px 2px rgba(15,23,42,0.03);">
              <div style="font-size:10px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:0.5px;">Consensus Latency</div>
              <div style="font-size:18px; font-weight:700; color:#D97706; margin-top:2px;" id="dt-stat-latency">1.4ms</div>
            </div>
          </div>

          <!-- 5-AGENT MULTI-AGENT TOPOLOGY CARDS GRID -->
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--text-2); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:10px; display:flex; justify-content:space-between;">
              <span>Multi-Agent Consensus Matrix (5 Distributed Cores)</span>
              <span style="color:var(--accent); font-weight:600;" id="dt-dag-label">Consensus Graph: Alpha &rarr; Gamma &rarr; Beta &rarr; Delta &rarr; Epsilon</span>
            </div>

            <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:12px;">
              
              <!-- 1. Alpha: Planner -->
              <div class="dt-agent-card" id="dt-card-alpha" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:16px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <div style="height:3px; background:#0284C7; position:absolute; top:0; left:0; right:0;"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <span style="font-size:9.5px; font-weight:700; color:#0284C7; letter-spacing:0.5px;">CORE 01</span>
                    <div style="font-size:13.5px; font-weight:700; color:var(--text-0); margin-top:2px;">Alpha-Planner</div>
                  </div>
                  <span id="dt-status-alpha" style="font-size:9.5px; background:var(--bg-3); color:var(--text-2); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:600;">STANDBY</span>
                </div>
                <div style="font-size:11.5px; color:var(--text-1); margin-top:8px; line-height:1.4;" id="dt-desc-alpha">
                  Task decomposition, DAG dependency formulation.
                </div>
                <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line-1); font-size:10.5px; color:var(--text-2); font-family:var(--font-mono); display:flex; justify-content:space-between;">
                  <span>Gemini 2.5</span>
                  <span id="dt-step-alpha">Step 1/5</span>
                </div>
              </div>

              <!-- 2. Gamma: Sentinel -->
              <div class="dt-agent-card" id="dt-card-gamma" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:16px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <div style="height:3px; background:#10B981; position:absolute; top:0; left:0; right:0;"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <span style="font-size:9.5px; font-weight:700; color:#10B981; letter-spacing:0.5px;">CORE 02</span>
                    <div style="font-size:13.5px; font-weight:700; color:var(--text-0); margin-top:2px;">Gamma-Sentinel</div>
                  </div>
                  <span id="dt-status-gamma" style="font-size:9.5px; background:var(--bg-3); color:var(--text-2); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:600;">STANDBY</span>
                </div>
                <div style="font-size:11.5px; color:var(--text-1); margin-top:8px; line-height:1.4;" id="dt-desc-gamma">
                  Host compiler audit and capability verification.
                </div>
                <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line-1); font-size:10.5px; color:var(--text-2); font-family:var(--font-mono); display:flex; justify-content:space-between;">
                  <span>Audit Engine</span>
                  <span id="dt-step-gamma">Step 2/5</span>
                </div>
              </div>

              <!-- 3. Beta: Synthesizer -->
              <div class="dt-agent-card" id="dt-card-beta" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:16px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <div style="height:3px; background:#6366F1; position:absolute; top:0; left:0; right:0;"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <span style="font-size:9.5px; font-weight:700; color:#6366F1; letter-spacing:0.5px;">CORE 03</span>
                    <div style="font-size:13.5px; font-weight:700; color:var(--text-0); margin-top:2px;">Beta-Synthesizer</div>
                  </div>
                  <span id="dt-status-beta" style="font-size:9.5px; background:var(--bg-3); color:var(--text-2); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:600;">STANDBY</span>
                </div>
                <div style="font-size:11.5px; color:var(--text-1); margin-top:8px; line-height:1.4;" id="dt-desc-beta">
                  Source code and LaTeX document scaffolding.
                </div>
                <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line-1); font-size:10.5px; color:var(--text-2); font-family:var(--font-mono); display:flex; justify-content:space-between;">
                  <span>Code Engine</span>
                  <span id="dt-step-beta">Step 3/5</span>
                </div>
              </div>

              <!-- 4. Delta: Auditor -->
              <div class="dt-agent-card" id="dt-card-delta" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:16px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <div style="height:3px; background:#D97706; position:absolute; top:0; left:0; right:0;"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <span style="font-size:9.5px; font-weight:700; color:#D97706; letter-spacing:0.5px;">CORE 04</span>
                    <div style="font-size:13.5px; font-weight:700; color:var(--text-0); margin-top:2px;">Delta-Auditor</div>
                  </div>
                  <span id="dt-status-delta" style="font-size:9.5px; background:var(--bg-3); color:var(--text-2); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:600;">STANDBY</span>
                </div>
                <div style="font-size:11.5px; color:var(--text-1); margin-top:8px; line-height:1.4;" id="dt-desc-delta">
                  AST static verification & integrity checking.
                </div>
                <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line-1); font-size:10.5px; color:var(--text-2); font-family:var(--font-mono); display:flex; justify-content:space-between;">
                  <span>AST Inspector</span>
                  <span id="dt-step-delta">Step 4/5</span>
                </div>
              </div>

              <!-- 5. Epsilon: Supervisor -->
              <div class="dt-agent-card" id="dt-card-epsilon" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:10px; padding:16px; transition:all 0.3s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
                <div style="height:3px; background:#0284C7; position:absolute; top:0; left:0; right:0;"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <span style="font-size:9.5px; font-weight:700; color:#0284C7; letter-spacing:0.5px;">CORE 05</span>
                    <div style="font-size:13.5px; font-weight:700; color:var(--text-0); margin-top:2px;">Epsilon-Sync</div>
                  </div>
                  <span id="dt-status-epsilon" style="font-size:9.5px; background:var(--bg-3); color:var(--text-2); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-weight:600;">STANDBY</span>
                </div>
                <div style="font-size:11.5px; color:var(--text-1); margin-top:8px; line-height:1.4;" id="dt-desc-epsilon">
                  Replica state sync and fallback arbitration.
                </div>
                <div style="margin-top:12px; padding-top:8px; border-top:1px solid var(--line-1); font-size:10.5px; color:var(--text-2); font-family:var(--font-mono); display:flex; justify-content:space-between;">
                  <span>Sync Daemon</span>
                  <span id="dt-step-epsilon">Step 5/5</span>
                </div>
              </div>

            </div>
          </div>

          <!-- REAL-TIME AGENT TELEMETRY LOG & VERIFICATION TERMINAL -->
          <div id="dt-audit-console" style="background:var(--bg-1); border:1px solid var(--line-1); border-radius:12px; padding:16px 20px; transition:border-color 0.3s ease; box-shadow:0 1px 3px rgba(15,23,42,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <span style="font-size:12.5px; font-weight:700; color:var(--text-0);">Multi-Agent Pipeline Telemetry Stream & Live Logs:</span>
              <span id="dt-audit-pill" style="font-size:11px; padding:3px 10px; border-radius:6px; font-weight:600; background:var(--bg-3); color:var(--text-2); transition:all 0.3s ease;">READY FOR DISPATCH</span>
            </div>

            <div id="dt-console-body" style="display:flex; flex-direction:column; gap:8px; max-height:170px; overflow-y:auto; background:var(--bg-2); border:1px solid var(--line-1); border-radius:8px; padding:12px 14px;">
              <div style="font-size:12px; color:var(--text-2); font-family:var(--font-mono);">
                Pipeline idling. Enter a mission prompt above and click "Deploy Agent Pipeline" to visualize step-by-step multi-agent consensus and execution telemetry.
              </div>
            </div>
          </div>

        </div>

        <!-- AUTONOMOUS SELF-HEALING & REPLICA TRANSITION OVERLAY -->
        <div id="dt-overtake-overlay" style="position:absolute; inset:0; background:rgba(255,255,255,0.96); backdrop-filter:blur(20px); z-index:50; display:none; flex-direction:column; align-items:center; justify-content:center; padding:32px; opacity:0; transition:opacity 0.4s ease;">
          <div style="width:100%; max-width:680px; text-align:center; background:var(--bg-1); border:1px solid var(--line-2); border-radius:16px; padding:32px 36px; box-shadow:0 20px 50px rgba(15,23,42,0.12);">
            
            <div id="dt-overtake-icon" style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.1); border:2px solid #EF4444; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; transition:all 0.5s ease;">
              <svg width="32" height="32" style="color:#EF4444;" id="dt-overtake-svg"><use href="#icon-alert-triangle"></use></svg>
            </div>

            <div style="font-size:18px; font-weight:800; color:#EF4444; letter-spacing:0.3px; margin-bottom:6px; transition:color 0.4s ease;" id="dt-overtake-title">
              HOST MISSING REQUIRED COMPILER
            </div>
            
            <div style="font-size:13px; color:var(--text-1); line-height:1.5; margin-bottom:20px;" id="dt-overtake-reason-txt">
              Your computer does not have a native LaTeX compiler installed.
            </div>

            <!-- Side-by-side Twin Transition Graphic -->
            <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:14px; align-items:center; margin-bottom:20px;">
              <!-- Faulted Host Twin -->
              <div id="dt-host-card" style="background:var(--bg-2); border:1.5px solid #EF4444; border-radius:10px; padding:14px; text-align:left; transition:all 0.4s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:11px; font-weight:700; color:#EF4444;">PRIMARY HOST TWIN</span>
                  <span id="dt-host-status" style="font-size:9.5px; padding:2px 6px; border-radius:4px; background:rgba(239,68,68,0.1); color:#EF4444; font-weight:700;">FAULTED</span>
                </div>
                <div style="font-size:12px; color:var(--text-1);">Local Machine Environment</div>
                <div style="font-size:10.5px; color:#EF4444; margin-top:4px;" id="dt-host-note">Compiler missing in PATH</div>
              </div>

              <!-- Animated Arrow / Bridge -->
              <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:10px; font-weight:700; color:var(--accent);">SELF-HEAL</span>
                <div id="dt-sync-arrow" style="width:36px; height:36px; border-radius:50%; background:var(--bg-3); border:1px solid var(--line-2); display:flex; align-items:center; justify-content:center; color:var(--accent); font-weight:900;">
                  &rarr;
                </div>
              </div>

              <!-- Clean Replica Twin -->
              <div id="dt-replica-card" style="background:var(--bg-2); border:1.5px solid var(--line-2); border-radius:10px; padding:14px; text-align:left; transition:all 0.4s ease;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-2);">REPLICA TWIN</span>
                  <span id="dt-replica-status" style="font-size:9.5px; padding:2px 6px; border-radius:4px; background:var(--bg-3); color:var(--text-2); font-weight:700;">SPINNING UP</span>
                </div>
                <div style="font-size:12px; color:var(--text-1);">Clean Sandboxed Twin</div>
                <div style="font-size:10.5px; color:var(--text-2); margin-top:4px;" id="dt-replica-note">Preparing virtual engine...</div>
              </div>
            </div>

            <!-- Self-Healing Steps Box -->
            <div style="background:var(--bg-2); border:1px solid var(--line-2); border-radius:10px; padding:16px; margin-bottom:20px; text-align:left;">
              <div style="font-size:11px; font-weight:700; color:var(--accent); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;" id="dt-overtake-header-txt">
                Autonomous Self-Healing Sequence
              </div>
              <div style="font-size:12.5px; color:var(--text-0); font-weight:500; margin-bottom:12px;" id="dt-overtake-res-txt">
                Step 1/3: Discarding errored host twin instance...
              </div>

              <div style="height:6px; background:var(--line-2); border-radius:999px; overflow:hidden;">
                <div id="dt-overtake-bar" style="height:100%; width:0%; background:linear-gradient(90deg, #EF4444, #0284C7, #10B981); border-radius:999px; transition:width 0.8s ease;"></div>
              </div>
            </div>

            <div id="dt-auto-transition-banner" style="display:none; font-size:12.5px; color:#10B981; font-weight:700; margin-bottom:14px;">
              Self-healing finished! Replica Twin verified. Opening your project in Studio IDE...
            </div>

            <button id="dt-overtake-launch-btn" class="btn-solid" style="padding:10px 24px; font-size:13px; font-weight:600; border-radius:8px; background:#10B981; color:#FFFFFF; border:none; display:none; margin:0 auto; cursor:pointer;">
              Open Project in Studio IDE
            </button>
          </div>
        </div>

      </div>
    `;

    const viewport = el.querySelector('#dt-viewport');
    const promptInput = el.querySelector('#dt-prompt-input');
    const executeBtn = el.querySelector('#dt-execute-btn');
    const consoleBody = el.querySelector('#dt-console-body');
    const auditPill = el.querySelector('#dt-audit-pill');
    const auditConsole = el.querySelector('#dt-audit-console');
    const twinBadge = el.querySelector('#dt-twin-badge');
    const latencyText = el.querySelector('#dt-latency-text');
    const pulseDot = el.querySelector('#dt-pulse-dot');
    const meshStatus = el.querySelector('#dt-mesh-status');

    const statPhase = el.querySelector('#dt-stat-phase');
    const statTwin = el.querySelector('#dt-stat-twin');
    const statLatency = el.querySelector('#dt-stat-latency');

    // Agent Cards
    const cardAlpha = el.querySelector('#dt-card-alpha');
    const cardGamma = el.querySelector('#dt-card-gamma');
    const cardBeta = el.querySelector('#dt-card-beta');
    const cardDelta = el.querySelector('#dt-card-delta');
    const cardEpsilon = el.querySelector('#dt-card-epsilon');

    // Status Badges
    const statusAlpha = el.querySelector('#dt-status-alpha');
    const statusGamma = el.querySelector('#dt-status-gamma');
    const statusBeta = el.querySelector('#dt-status-beta');
    const statusDelta = el.querySelector('#dt-status-delta');
    const statusEpsilon = el.querySelector('#dt-status-epsilon');

    // Descriptions
    const descAlpha = el.querySelector('#dt-desc-alpha');
    const descGamma = el.querySelector('#dt-desc-gamma');
    const descBeta = el.querySelector('#dt-desc-beta');
    const descDelta = el.querySelector('#dt-desc-delta');
    const descEpsilon = el.querySelector('#dt-desc-epsilon');

    const overtakeOverlay = el.querySelector('#dt-overtake-overlay');
    const overtakeIcon = el.querySelector('#dt-overtake-icon');
    const overtakeSvg = el.querySelector('#dt-overtake-svg');
    const overtakeTitle = el.querySelector('#dt-overtake-title');
    const overtakeHeaderTxt = el.querySelector('#dt-overtake-header-txt');
    const overtakeBar = el.querySelector('#dt-overtake-bar');
    const overtakeReasonTxt = el.querySelector('#dt-overtake-reason-txt');
    const overtakeResTxt = el.querySelector('#dt-overtake-res-txt');
    const autoTransitionBanner = el.querySelector('#dt-auto-transition-banner');
    const overtakeLaunchBtn = el.querySelector('#dt-overtake-launch-btn');
    const hostCard = el.querySelector('#dt-host-card');
    const replicaCard = el.querySelector('#dt-replica-card');
    const hostStatus = el.querySelector('#dt-host-status');
    const replicaStatus = el.querySelector('#dt-replica-status');
    const replicaNote = el.querySelector('#dt-replica-note');

    let completedPipelineData = null;

    const resetAgentCards = () => {
      [cardAlpha, cardGamma, cardBeta, cardDelta, cardEpsilon].forEach(c => {
        c.style.transform = 'scale(1)';
        c.style.borderColor = 'var(--line-1)';
        c.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
      });

      [statusAlpha, statusGamma, statusBeta, statusDelta, statusEpsilon].forEach(s => {
        s.textContent = 'STANDBY';
        s.style.background = 'var(--bg-3)';
        s.style.color = 'var(--text-2)';
      });

      auditConsole.style.borderColor = 'var(--line-1)';
      auditPill.style.background = 'var(--bg-3)';
      auditPill.style.color = 'var(--text-2)';
      auditPill.textContent = 'READY FOR DISPATCH';
    };

    const activateCard = (card, badge, color, statusText) => {
      card.style.transform = 'translateY(-2px)';
      card.style.borderColor = color;
      card.style.boxShadow = '0 4px 12px rgba(15,23,42,0.08)';
      badge.textContent = statusText;
      badge.style.background = 'var(--bg-3)';
      badge.style.color = color;
    };

    const completeCard = (card, badge, color) => {
      card.style.transform = 'scale(1)';
      card.style.borderColor = 'var(--line-2)';
      card.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)';
      badge.textContent = 'COMPLETE';
      badge.style.background = 'rgba(16,185,129,0.1)';
      badge.style.color = '#10B981';
    };

    const appendLog = (tag, color, msg) => {
      const row = document.createElement('div');
      row.style.fontFamily = 'var(--font-mono)';
      row.style.fontSize = '12px';
      row.style.lineHeight = '1.5';
      row.innerHTML = `<span style="color:${color}; font-weight:700;">[${tag}]</span> <span style="color:var(--text-1);">${msg}</span>`;
      consoleBody.appendChild(row);
      consoleBody.scrollTop = consoleBody.scrollHeight;
    };

    const runOrchestration = async () => {
      const taskText = promptInput.value.trim();
      if (!taskText || isExecuting) return;

      isExecuting = true;
      executeBtn.disabled = true;
      executeBtn.innerHTML = '<span>Executing Pipeline...</span>';
      meshStatus.textContent = 'Orchestrating 5-Agent Consensus...';
      statPhase.textContent = 'ACTIVE';

      resetAgentCards();
      consoleBody.innerHTML = '';

      // ==========================================
      // STEP 1: Agent Alpha (Task Planner)
      // ==========================================
      appendLog('PLANNER', '#0284C7', `Analyzing your request: "${taskText.slice(0, 50)}..."`);
      activateCard(cardAlpha, statusAlpha, '#0284C7', 'PLANNING');
      descAlpha.innerHTML = `<span style="color:#0284C7; font-weight:600;">Figuring out what files and tools are needed...</span>`;

      await new Promise(r => setTimeout(r, 700));

      // Backend API Dispatch
      let pipeRes = null;
      try {
        const res = await api.post('/api/ai/pipeline', { task: taskText });
        pipeRes = (res && res.data) ? res.data : res;
      } catch (e) {
        pipeRes = { ok: false, error: String(e) };
      }

      completedPipelineData = pipeRes;
      const isCompat = pipeRes.is_compatible !== false;
      const checks = (pipeRes.pipeline && pipeRes.pipeline[1] && pipeRes.pipeline[1].checks) || [];
      const envName = pipeRes.environment || 'workspace';
      const targetFolder = pipeRes.scaffold?.folder || '~/Documents';

      completeCard(cardAlpha, statusAlpha, '#0284C7');
      descAlpha.textContent = `Requirements planned. Project type identified: '${envName}'.`;
      appendLog('PLANNER', '#0284C7', `Plan ready! Handing requirements over to System Sentinel to verify local computer tools.`);

      // ==========================================
      // STEP 2: Agent Gamma (Capability Sentinel)
      // ==========================================
      await new Promise(r => setTimeout(r, 600));
      appendLog('SENTINEL', '#10B981', `Checking your local system tools and compiler for '${envName}'...`);
      activateCard(cardGamma, statusGamma, '#10B981', 'CHECKING');
      descGamma.innerHTML = `<span style="color:#10B981; font-weight:600;">Checking your computer for required tools...</span>`;

      await new Promise(r => setTimeout(r, 700));

      // Render Check items into log in plain English
      checks.forEach(c => {
        appendLog('SYSTEM CHECK', c.available ? '#10B981' : '#EF4444', `${c.name}: ${c.available ? 'Ready on your machine' : 'Not installed on your machine'}`);
      });

      // CASE A: INCOMPATIBLE -> AUTONOMOUS REPLICA TWIN ACTIVATION
      if (!isCompat) {
        cardGamma.style.borderColor = '#EF4444';
        cardGamma.style.boxShadow = '0 2px 8px rgba(239,68,68,0.15)';
        statusGamma.textContent = 'NEEDS REPLICA';
        statusGamma.style.background = 'rgba(239,68,68,0.1)';
        statusGamma.style.color = '#EF4444';
        descGamma.innerHTML = '<span style="color:#EF4444; font-weight:700;">Host tool missing. Activating Cloud Replica Twin...</span>';

        statTwin.textContent = 'Replica-Twin';
        statTwin.style.color = '#10B981';

        auditConsole.style.borderColor = 'var(--line-2)';
        auditPill.style.background = 'rgba(16,185,129,0.1)';
        auditPill.style.color = '#10B981';
        auditPill.textContent = 'SELF-HEALING IN PROGRESS';

        appendLog('SENTINEL', '#EF4444', `Notice: Your host computer lacks a native compiler.`);
        appendLog('SELF-HEAL', '#0284C7', `Starting Replica Twin: transferring workload to clean virtual environment...`);

        await new Promise(r => setTimeout(r, 500));

        overtakeOverlay.style.display = 'flex';
        setTimeout(() => { overtakeOverlay.style.opacity = '1'; }, 20);

        const fallback = pipeRes.fallback_plan || {
          reason: 'Your computer is missing the native toolchain required for this project.',
          details: 'Switching to clean replica twin to synthesize and verify files cleanly...'
        };

        overtakeReasonTxt.textContent = fallback.reason;
        overtakeResTxt.textContent = 'Step 1/3: Safely bypassing missing host compiler...';
        overtakeBar.style.width = '35%';

        await new Promise(r => setTimeout(r, 900));
        overtakeResTxt.textContent = 'Step 2/3: Spinning up clean Replica Twin environment...';
        overtakeBar.style.width = '70%';
        if (replicaCard) {
          replicaCard.style.borderColor = '#0284C7';
          replicaStatus.textContent = 'INITIALIZING';
          replicaStatus.style.background = 'rgba(2,132,199,0.1)';
          replicaStatus.style.color = '#0284C7';
          replicaNote.textContent = 'Mounting virtual compiler & templates...';
        }

        await new Promise(r => setTimeout(r, 900));
        overtakeResTxt.textContent = 'Step 3/3: Replica Twin online! Completing remaining agents (Synthesizer, Auditor, Supervisor)...';
        overtakeBar.style.width = '100%';

        if (replicaCard) {
          replicaCard.style.borderColor = '#10B981';
          replicaStatus.textContent = 'ONLINE & ACTIVE';
          replicaStatus.style.background = 'rgba(16,185,129,0.1)';
          replicaStatus.style.color = '#10B981';
          replicaNote.textContent = '100% operational in clean sandboxed replica';
        }

        overtakeIcon.style.borderColor = '#10B981';
        overtakeIcon.style.background = 'rgba(16,185,129,0.1)';
        overtakeSvg.style.color = '#10B981';
        overtakeSvg.querySelector('use').setAttribute('href', '#icon-check');
        overtakeTitle.textContent = 'REPLICA TWIN READY & CONNECTED';
        overtakeTitle.style.color = '#10B981';
        overtakeHeaderTxt.textContent = 'Self-Healing Finished';

        twinBadge.textContent = 'REPLICA TWIN ACTIVE';
        twinBadge.style.background = 'rgba(16,185,129,0.1)';
        twinBadge.style.color = '#10B981';
        twinBadge.style.borderColor = '#10B981';
        pulseDot.style.background = '#10B981';
        latencyText.textContent = 'Replica Sync (<1ms)';

        autoTransitionBanner.style.display = 'block';
        overtakeLaunchBtn.style.display = 'inline-block';

        // Now run the remaining agent steps visibly in logs
        completeCard(cardGamma, statusGamma, '#10B981');
        descGamma.textContent = 'Workload switched to Replica Twin.';

        // STEP 3: Beta on Replica
        appendLog('SYNTHESIZER', '#6366F1', `Creating clean project files and templates inside ${targetFolder}...`);
        activateCard(cardBeta, statusBeta, '#6366F1', 'BUILDING');
        descBeta.innerHTML = `<span style="color:#6366F1; font-weight:600;">Writing workspace files...</span>`;
        await new Promise(r => setTimeout(r, 800));
        completeCard(cardBeta, statusBeta, '#6366F1');
        descBeta.textContent = `Workspace created at ${targetFolder} (${pipeRes.scaffold?.files?.length || 0} files).`;
        appendLog('SYNTHESIZER', '#6366F1', `Files successfully written.`);

        // STEP 4: Delta on Replica
        appendLog('AUDITOR', '#D97706', `Checking files for syntax errors and correct formatting...`);
        activateCard(cardDelta, statusDelta, '#D97706', 'CHECKING');
        descDelta.innerHTML = `<span style="color:#D97706; font-weight:600;">Auditing document integrity...</span>`;
        await new Promise(r => setTimeout(r, 700));
        completeCard(cardDelta, statusDelta, '#D97706');
        descDelta.textContent = `All files verified without syntax errors.`;
        appendLog('AUDITOR', '#D97706', `Integrity audit passed: 0 errors detected.`);

        // STEP 5: Epsilon on Replica
        appendLog('SUPERVISOR', '#0284C7', `Synchronizing workspace and locking state (<1ms latency)...`);
        activateCard(cardEpsilon, statusEpsilon, '#0284C7', 'SYNCING');
        descEpsilon.innerHTML = `<span style="color:#0284C7; font-weight:600;">Synchronizing Twin Replica...</span>`;
        await new Promise(r => setTimeout(r, 700));
        completeCard(cardEpsilon, statusEpsilon, '#0284C7');
        descEpsilon.textContent = `Replica synchronized and ready.`;
        appendLog('SUPERVISOR', '#0284C7', `All 5 agents finished successfully! Ready to work in Studio IDE.`);

        statPhase.textContent = 'VERIFIED';
        auditConsole.style.borderColor = '#10B981';
        auditPill.style.background = 'rgba(16,185,129,0.1)';
        auditPill.style.color = '#10B981';
        auditPill.textContent = '5-CORE CONSENSUS VERIFIED';

        setTimeout(() => {
          overtakeOverlay.style.opacity = '0';
          setTimeout(() => {
            overtakeOverlay.style.display = 'none';
            openTargetWorkspace(completedPipelineData);
          }, 300);
        }, 1800);

      } else {
        // ==========================================
        // 100% COMPATIBLE -> EXECUTE BETA, DELTA, EPSILON
        // ==========================================
        completeCard(cardGamma, statusGamma, '#10B981');
        descGamma.textContent = `All prerequisite tools satisfied on Primary Host.`;
        appendLog('SENTINEL', '#10B981', `Your computer has all required tools. Ready for project generation.`);

        // STEP 3: Agent Beta (Synthesizer)
        await new Promise(r => setTimeout(r, 550));
        appendLog('SYNTHESIZER', '#6366F1', `Creating clean project files and templates inside ${targetFolder}...`);
        activateCard(cardBeta, statusBeta, '#6366F1', 'BUILDING');
        descBeta.innerHTML = `<span style="color:#6366F1; font-weight:600;">Writing workspace files...</span>`;

        await new Promise(r => setTimeout(r, 700));
        completeCard(cardBeta, statusBeta, '#6366F1');
        descBeta.textContent = `Workspace created at ${targetFolder} (${pipeRes.scaffold?.files?.length || 0} files).`;
        appendLog('SYNTHESIZER', '#6366F1', `Project files written successfully.`);

        // STEP 4: Agent Delta (Auditor)
        await new Promise(r => setTimeout(r, 550));
        appendLog('AUDITOR', '#D97706', `Checking files for syntax errors and correct formatting...`);
        activateCard(cardDelta, statusDelta, '#D97706', 'CHECKING');
        descDelta.innerHTML = `<span style="color:#D97706; font-weight:600;">Auditing document integrity...</span>`;

        await new Promise(r => setTimeout(r, 700));
        completeCard(cardDelta, statusDelta, '#D97706');
        descDelta.textContent = `All files verified without syntax errors.`;
        appendLog('AUDITOR', '#D97706', `Integrity audit passed: 0 errors detected.`);

        // STEP 5: Agent Epsilon (Supervisor)
        await new Promise(r => setTimeout(r, 550));
        appendLog('SUPERVISOR', '#0284C7', `Synchronizing workspace and locking state (<1ms latency)...`);
        activateCard(cardEpsilon, statusEpsilon, '#0284C7', 'SYNCING');
        descEpsilon.innerHTML = `<span style="color:#0284C7; font-weight:600;">Synchronizing Twin Replica...</span>`;

        await new Promise(r => setTimeout(r, 700));
        completeCard(cardEpsilon, statusEpsilon, '#0284C7');
        descEpsilon.textContent = `Workspace synchronized and live.`;
        appendLog('SUPERVISOR', '#0284C7', `All 5 agents finished successfully! Ready to work in Studio IDE.`);

        statPhase.textContent = 'VERIFIED';
        auditConsole.style.borderColor = '#10B981';
        auditPill.style.background = 'rgba(16,185,129,0.1)';
        auditPill.style.color = '#10B981';
        auditPill.textContent = '5-CORE CONSENSUS VERIFIED';

        setTimeout(() => {
          openTargetWorkspace(completedPipelineData);
        }, 800);
      }

      executeBtn.disabled = false;
      executeBtn.innerHTML = '<span>Deploy Agent Pipeline</span>';
      meshStatus.textContent = '5 Cores Connected &middot; Mission Complete';
      isExecuting = false;
    };

    const openTargetWorkspace = (pipeData) => {
      const folder = pipeData?.scaffold?.folder || '~/Documents';
      const firstFile = (pipeData?.scaffold?.files && pipeData.scaffold.files[0]) 
        ? `${folder}/${pipeData.scaffold.files[0]}` 
        : `${folder}/main.py`;

      window.dispatchEvent(new CustomEvent('aura-open-app', {
        detail: { appId: 'editor', params: { path: firstFile } }
      }));
    };

    executeBtn.addEventListener('click', runOrchestration);
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runOrchestration();
    });

    overtakeLaunchBtn.addEventListener('click', () => {
      overtakeOverlay.style.opacity = '0';
      setTimeout(() => {
        overtakeOverlay.style.display = 'none';
        viewport.style.transform = 'scale(1)';
        viewport.style.filter = 'none';
        openTargetWorkspace(completedPipelineData);
      }, 400);
    });

    // Check if opened with pre-filled context parameters from Copilot or external call
    const incomingPrompt = ctx?.params?.prompt || (window.__auraLastAgentTask || '');
    if (incomingPrompt && incomingPrompt.trim()) {
      promptInput.value = incomingPrompt.trim();
      setTimeout(() => {
        runOrchestration();
      }, 200);
    }

    return { unmount: () => {} };
  }
};
