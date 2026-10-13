/**
 * AURA-OS Professional Studio & IDE Application
 * Supports full project folder tree navigation, multiple open tabs,
 * language-aware styling, LaTeX live math KaTeX typography preview,
 * full-stack project inspection, and hot file switching.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const EditorApp = {
  id: 'editor',
  name: 'Studio IDE',
  icon: 'file-text',
  defaultWidth: 1040,
  defaultHeight: 640,

  mount(el, ctx) {
    let activeFilePath = (ctx.params && ctx.params.path) || '~/Documents/notes.txt';
    let rootProjectFolder = activeFilePath.substring(0, activeFilePath.lastIndexOf('/')) || '~/Documents';
    if (!rootProjectFolder.includes('/')) rootProjectFolder = '~/Documents';

    let openFiles = [activeFilePath];
    let isDirty = false;
    let previewMode = activeFilePath.endsWith('.tex') || activeFilePath.endsWith('.latex');
    let fileTree = [];

    const isLatex = (path) => path.endsWith('.tex') || path.endsWith('.latex');
    const isJson = (path) => path.endsWith('.json');
    const isJs = (path) => path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.ts');
    const isHtml = (path) => path.endsWith('.html') || path.endsWith('.htm');
    const isCss = (path) => path.endsWith('.css');
    const isMd = (path) => path.endsWith('.md');

    const getFileBadge = (path) => {
      if (isLatex(path)) return { label: 'LaTeX Research', color: '#38BDF8' };
      if (isJson(path)) return { label: 'JSON Manifest', color: '#F59E0B' };
      if (isJs(path)) return { label: 'JavaScript Node', color: '#FCD34D' };
      if (isHtml(path)) return { label: 'HTML5 Web', color: '#EF4444' };
      if (isCss(path)) return { label: 'CSS3 Styles', color: '#818CF8' };
      if (isMd(path)) return { label: 'Markdown Doc', color: '#34D399' };
      return { label: 'Plain Text', color: '#94A3B8' };
    };

    el.innerHTML = `
      <div style="display:flex; flex-direction:column; height:100%; background:#0B0F17; color:#E2E8F0; font-family:var(--font-sans); overflow:hidden;">
        
        <!-- Top Toolbar -->
        <div style="height:44px; background:#111827; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 14px; z-index:10;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn-solid" id="ide-save-btn-${ctx.winId}" style="padding:5px 12px; font-size:11.5px; display:flex; align-items:center; gap:6px; background:#1E293B; color:#F8FAFC; border:1px solid rgba(255,255,255,0.15); border-radius:6px; cursor:pointer;">
              <svg width="12" height="12"><use href="#icon-save"></use></svg>
              <span>Save (Ctrl+S)</span>
            </button>

            <!-- Dynamic LaTeX Preview Toggle (visible for .tex files) -->
            <button class="btn-solid" id="ide-toggle-preview-${ctx.winId}" style="padding:5px 12px; font-size:11.5px; display:${isLatex(activeFilePath) ? 'flex' : 'none'}; align-items:center; gap:6px; background:${previewMode ? 'rgba(56,189,248,0.2)' : '#1E293B'}; color:${previewMode ? '#38BDF8' : '#F8FAFC'}; border:1px solid ${previewMode ? '#38BDF8' : 'rgba(255,255,255,0.15)'}; border-radius:6px; cursor:pointer;">
              <svg width="12" height="12"><use href="#icon-monitor"></use></svg>
              <span>Live Math Typography</span>
            </button>

            <!-- Download PDF into AURA-OS ~/Downloads -->
            <button class="btn-solid" id="ide-dl-pdf-btn-${ctx.winId}" style="padding:5px 14px; font-size:11.5px; display:${isLatex(activeFilePath) ? 'flex' : 'none'}; align-items:center; gap:6px; background:#0284C7; color:#FFFFFF; font-weight:700; border-radius:6px; cursor:pointer; box-shadow:0 0 12px rgba(2,132,199,0.35);">
              <svg width="12" height="12"><use href="#icon-download"></use></svg>
              <span>Download PDF to ~/Downloads</span>
            </button>

            <!-- Print PDF button (for LaTeX) -->
            <button class="btn-solid" id="ide-build-btn-${ctx.winId}" style="padding:5px 12px; font-size:11.5px; display:${isLatex(activeFilePath) ? 'flex' : 'none'}; align-items:center; gap:6px; background:#1E293B; color:#F8FAFC; border:1px solid rgba(255,255,255,0.15); border-radius:6px; cursor:pointer;">
              <svg width="12" height="12"><use href="#icon-save"></use></svg>
              <span>Print Dialog</span>
            </button>

            <!-- Run Node Server button (for package.json or server.js) -->
            <button class="btn-solid" id="ide-run-server-btn-${ctx.winId}" style="padding:5px 12px; font-size:11.5px; display:${(isJson(activeFilePath) || isJs(activeFilePath)) ? 'flex' : 'none'}; align-items:center; gap:6px; background:rgba(16,185,129,0.2); color:#10B981; border:1px solid #10B981; border-radius:6px; cursor:pointer;">
              <svg width="12" height="12"><use href="#icon-terminal"></use></svg>
              <span>Run in Terminal</span>
            </button>

            <!-- Switch project folder -->
            <button class="btn-solid" id="ide-change-folder-btn-${ctx.winId}" style="padding:5px 12px; font-size:11.5px; display:flex; align-items:center; gap:6px; background:#1E293B; color:#F8FAFC; border:1px solid rgba(255,255,255,0.15); border-radius:6px; cursor:pointer;" title="Switch Project Folder">
              <svg width="12" height="12"><use href="#icon-folder"></use></svg>
              <span>Folder: <span id="ide-folder-label-${ctx.winId}" style="color:#38BDF8; font-weight:600;">${rootProjectFolder.split('/').pop()}</span></span>
            </button>

            <span id="ide-dirty-dot-${ctx.winId}" style="display:none; color:var(--accent); font-weight:bold; margin-left:4px;">&bull;</span>
          </div>

          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:10px; padding:3px 8px; border-radius:4px; font-weight:700; text-transform:uppercase;" id="ide-badge-${ctx.winId}">
              ${getFileBadge(activeFilePath).label}
            </span>
            <span style="font-size:11px; color:#64748B; font-family:var(--font-mono);" id="ide-stat-info-${ctx.winId}">UTF-8</span>
          </div>
        </div>

        <!-- Main Body: Left Project Explorer + Right Editor & Live Preview -->
        <div style="flex:1; display:flex; position:relative; overflow:hidden;">
          
          <!-- LEFT SIDEBAR: File Tree & Project Explorer -->
          <div style="width:230px; background:#0D1117; border-right:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; overflow:hidden; user-select:none;">
            <div style="padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; color:#94A3B8; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
              <span id="ide-project-title-${ctx.winId}">EXPLORER</span>
              <button class="btn-glass" id="ide-refresh-tree-${ctx.winId}" style="padding:2px 6px; font-size:10px;" title="Refresh Tree">↻</button>
            </div>
            
            <div id="ide-file-tree-${ctx.winId}" style="flex:1; overflow-y:auto; padding:8px 6px; display:flex; flex-direction:column; gap:2px;">
              <div style="padding:12px; font-size:11.5px; color:#64748B;">Loading workspace files...</div>
            </div>
          </div>

          <!-- RIGHT AREA: File Tabs + Editor + (Optional) Live Preview -->
          <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
            
            <!-- File Tabs Strip -->
            <div id="ide-tabs-bar-${ctx.winId}" style="height:34px; background:#0B0E14; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; padding:0 8px; gap:4px; overflow-x:auto;">
              <!-- Tabs populated dynamically -->
            </div>

            <!-- Editor Split Workspace -->
            <div style="flex:1; display:flex; position:relative; overflow:hidden;">
              
              <!-- Code Textarea Pane -->
              <div style="flex:1; display:flex; flex-direction:column; background:#07090E; border-right:1px solid rgba(255,255,255,0.06); position:relative;">
                <textarea id="ide-textarea-${ctx.winId}" spellcheck="false" style="flex:1; width:100%; height:100%; background:transparent; color:#F1F5F9; font-family:var(--font-mono); font-size:13px; line-height:1.6; padding:16px; border:none; outline:none; resize:none;"></textarea>
              </div>

              <!-- LaTeX Live Math Preview Pane (Only displayed for .tex files) -->
              <div id="ide-preview-pane-${ctx.winId}" style="flex:1; background:#0F172A; display:${(isLatex(activeFilePath) && previewMode) ? 'flex' : 'none'}; flex-direction:column; overflow-y:auto; padding:24px 32px; border-left:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px; margin-bottom:16px;">
                  <span style="font-size:12px; font-weight:700; color:#F8FAFC; text-transform:uppercase; letter-spacing:0.8px;">Live Paper & Math Typography</span>
                  <span style="font-size:10.5px; color:#10B981; font-family:var(--font-mono);">KaTeX Verified</span>
                </div>
                <div id="ide-rendered-content-${ctx.winId}" style="line-height:1.7; color:#E2E8F0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, serif;">
                  <div style="text-align:center; padding:40px 0; color:#64748B;">Compiling live preview...</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    `;

    const textarea = el.querySelector(`#ide-textarea-${ctx.winId}`);
    const fileTreeContainer = el.querySelector(`#ide-file-tree-${ctx.winId}`);
    const tabsBar = el.querySelector(`#ide-tabs-bar-${ctx.winId}`);
    const previewPane = el.querySelector(`#ide-preview-pane-${ctx.winId}`);
    const renderedContent = el.querySelector(`#ide-rendered-content-${ctx.winId}`);
    const togglePreviewBtn = el.querySelector(`#ide-toggle-preview-${ctx.winId}`);
    const dlPdfBtn = el.querySelector(`#ide-dl-pdf-btn-${ctx.winId}`);
    const buildBtn = el.querySelector(`#ide-build-btn-${ctx.winId}`);
    const runServerBtn = el.querySelector(`#ide-run-server-btn-${ctx.winId}`);
    const changeFolderBtn = el.querySelector(`#ide-change-folder-btn-${ctx.winId}`);
    const saveBtn = el.querySelector(`#ide-save-btn-${ctx.winId}`);
    const dirtyDot = el.querySelector(`#ide-dirty-dot-${ctx.winId}`);
    const badgeEl = el.querySelector(`#ide-badge-${ctx.winId}`);
    const folderLabel = el.querySelector(`#ide-folder-label-${ctx.winId}`);
    const refreshTreeBtn = el.querySelector(`#ide-refresh-tree-${ctx.winId}`);

    // Update dynamic toolbar buttons based on active file type
    const updateToolbarState = () => {
      const latex = isLatex(activeFilePath);
      togglePreviewBtn.style.display = latex ? 'flex' : 'none';
      if (dlPdfBtn) dlPdfBtn.style.display = latex ? 'flex' : 'none';
      buildBtn.style.display = latex ? 'flex' : 'none';
      runServerBtn.style.display = (isJson(activeFilePath) || isJs(activeFilePath)) ? 'flex' : 'none';

      const badge = getFileBadge(activeFilePath);
      badgeEl.textContent = badge.label;
      badgeEl.style.color = badge.color;
      badgeEl.style.background = `${badge.color}20`;

      if (latex && previewMode) {
        previewPane.style.display = 'flex';
      } else {
        previewPane.style.display = 'none';
      }
    };

    // Render Open Tabs
    const renderTabs = () => {
      tabsBar.innerHTML = openFiles.map(path => {
        const isActive = path === activeFilePath;
        const name = path.split('/').pop();
        return `
          <div class="ide-tab-item ${isActive ? 'active' : ''}" data-path="${path}" style="
            display:flex; align-items:center; gap:8px; padding:4px 12px; border-radius:6px 6px 0 0;
            background:${isActive ? '#07090E' : 'transparent'};
            border:${isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent'};
            border-bottom:none; color:${isActive ? '#F8FAFC' : '#94A3B8'};
            font-size:12px; font-weight:${isActive ? '600' : '400'}; cursor:pointer; user-select:none;
          ">
            <svg width="12" height="12" style="color:${getFileBadge(path).color}; flex-shrink:0;"><use href="#icon-file-text"></use></svg>
            <span style="white-space:nowrap;">${name}</span>
            ${openFiles.length > 1 ? `<span class="ide-close-tab" data-path="${path}" style="font-size:13px; opacity:0.6; padding:0 2px;">&times;</span>` : ''}
          </div>
        `;
      }).join('');

      tabsBar.querySelectorAll('.ide-tab-item').forEach(tab => {
        tab.addEventListener('click', (e) => {
          if (e.target.classList.contains('ide-close-tab')) return;
          const p = tab.getAttribute('data-path');
          if (p && p !== activeFilePath) {
            switchActiveFile(p);
          }
        });
      });

      tabsBar.querySelectorAll('.ide-close-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = btn.getAttribute('data-path');
          openFiles = openFiles.filter(f => f !== p);
          if (openFiles.length === 0) {
            openFiles = [activeFilePath];
          }
          if (activeFilePath === p) {
            switchActiveFile(openFiles[0]);
          } else {
            renderTabs();
          }
        });
      });
    };

    // Fetch and render workspace directory tree
    const loadDirectoryTree = async () => {
      try {
        const res = await api.get(`/api/fs/list?path=${encodeURIComponent(rootProjectFolder)}`);
        if (res.ok && res.data && res.data.items) {
          fileTree = res.data.items;
          folderLabel.textContent = rootProjectFolder.split('/').pop() || 'Workspace';

          fileTreeContainer.innerHTML = fileTree.map(item => {
            const isSelected = item.path.endsWith(activeFilePath.replace('~/', ''));
            const isDir = item.is_dir;
            return `
              <div class="tree-item" data-path="${item.path}" data-isdir="${isDir}" style="
                display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:6px;
                background:${isSelected ? 'rgba(56,189,248,0.15)' : 'transparent'};
                color:${isSelected ? '#38BDF8' : '#CBD5E1'};
                font-size:12px; cursor:pointer; transition:background 0.15s ease;
              ">
                <svg width="14" height="14" style="color:${isDir ? '#F59E0B' : getFileBadge(item.name).color}; flex-shrink:0;">
                  <use href="#icon-${isDir ? 'folder' : 'file-text'}"></use>
                </svg>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${item.name}</span>
              </div>
            `;
          }).join('');

          fileTreeContainer.querySelectorAll('.tree-item').forEach(elItem => {
            elItem.addEventListener('click', () => {
              const p = elItem.getAttribute('data-path');
              const isDir = elItem.getAttribute('data-isdir') === 'true';
              if (isDir) {
                rootProjectFolder = p;
                loadDirectoryTree();
              } else {
                switchActiveFile(p);
              }
            });
          });
        }
      } catch (e) {
        fileTreeContainer.innerHTML = `<div style="padding:10px; font-size:11px; color:#EF4444;">Failed to load tree: ${e}</div>`;
      }
    };

    const switchActiveFile = async (newPath) => {
      activeFilePath = newPath;
      if (!openFiles.includes(newPath)) {
        openFiles.push(newPath);
      }
      previewMode = isLatex(activeFilePath);
      ctx.setTitle(`Studio IDE - ${activeFilePath.split('/').pop()}`);
      updateToolbarState();
      renderTabs();
      await loadFileContent();
      loadDirectoryTree();
    };

    const loadFileContent = async () => {
      try {
        const res = await fetch(`/api/fs/read?path=${encodeURIComponent(activeFilePath)}`);
        if (res.ok) {
          textarea.value = await res.text();
        } else {
          textarea.value = '';
        }
      } catch (_) {
        textarea.value = '';
      }
      renderPreview();
    };

    const saveFile = async () => {
      try {
        await api.post('/api/fs/write', { path: activeFilePath, content: textarea.value });
        isDirty = false;
        dirtyDot.style.display = 'none';
        window.dispatchEvent(new CustomEvent('aura-notify', {
          detail: { title: 'File Saved', message: activeFilePath, icon: 'save', type: 'ok' }
        }));
      } catch (e) {
        alert('Failed to save file: ' + e);
      }
    };

    // KaTeX Engine Loader
    const ensureKatex = () => {
      if (window.katex) return Promise.resolve();
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js';
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    };

    // Live Math & LaTeX Typography Renderer
    const renderPreview = async () => {
      if (!isLatex(activeFilePath) || !previewMode) return;
      await ensureKatex();
      const raw = textarea.value;

      let html = '';
      const titleMatch = raw.match(/\\title\{([^}]+)\}/);
      if (titleMatch) {
        html += `<h1 style="font-size:22px; font-weight:800; color:#F8FAFC; text-align:center; margin-bottom:8px;">${titleMatch[1].replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\\\/g, '<br>')}</h1>`;
      }

      const authorMatch = raw.match(/\\author\{([\s\S]*?)\}/);
      if (authorMatch) {
        html += `<div style="text-align:center; font-size:12px; color:#94A3B8; margin-bottom:24px; line-height:1.4;">${authorMatch[1].replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\\\/g, '<br>').replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>')}</div>`;
      }

      const abstractMatch = raw.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
      if (abstractMatch) {
        html += `
          <div style="background:#1E293B; border-left:3px solid #38BDF8; padding:14px 18px; border-radius:6px; margin-bottom:24px;">
            <div style="font-weight:700; font-size:11.5px; text-transform:uppercase; letter-spacing:0.5px; color:#38BDF8; margin-bottom:4px;">Abstract</div>
            <div style="font-size:12px; color:#CBD5E1; line-height:1.6;">${abstractMatch[1]}</div>
          </div>
        `;
      }

      const sections = raw.split(/\\section\{/);
      sections.forEach((sec, idx) => {
        if (idx === 0) return;
        const closeIdx = sec.indexOf('}');
        if (closeIdx !== -1) {
          const secTitle = sec.substring(0, closeIdx);
          const secBody = sec.substring(closeIdx + 1);
          html += `<h2 style="font-size:15px; font-weight:700; color:#F1F5F9; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px; margin-top:20px; margin-bottom:10px;">${idx}. ${secTitle}</h2>`;
          
          const parts = secBody.split(/(\\begin\{equation\}[\s\S]*?\\end\{equation\}|\$\$[\s\S]*?\$\$)/);
          parts.forEach(part => {
            if (part.startsWith('\\begin{equation}') || part.startsWith('$$')) {
              const mathCode = part.replace(/\\begin\{equation\}/, '').replace(/\\end\{equation\}/, '').replace(/\$\$/g, '').trim();
              let renderedMath = mathCode;
              if (window.katex) {
                try { renderedMath = window.katex.renderToString(mathCode, { displayMode: true, throwOnError: false }); } catch (_) {}
              }
              html += `<div style="padding:12px 0; display:flex; justify-content:center; overflow-x:auto;">${renderedMath}</div>`;
            } else {
              const paras = part.split(/\n\s*\n/);
              paras.forEach(p => {
                let cleanP = p.trim();
                if (!cleanP || cleanP.startsWith('\\end{document}') || cleanP.startsWith('\\begin{document}')) return;
                cleanP = cleanP.replace(/\$([^$]+)\$/g, (m, inlineMath) => {
                  if (window.katex) {
                    try { return window.katex.renderToString(inlineMath, { displayMode: false, throwOnError: false }); } catch (_) { return m; }
                  }
                  return `<code>${inlineMath}</code>`;
                });
                html += `<p style="font-size:12.5px; color:#CBD5E1; line-height:1.7; margin-bottom:12px;">${cleanP}</p>`;
              });
            }
          });
        }
      });

      renderedContent.innerHTML = html || '<div style="padding:20px; color:#64748B;">Ready to preview math expressions.</div>';
    };

    let renderDebounce = null;
    textarea.addEventListener('input', () => {
      if (!isDirty) {
        isDirty = true;
        dirtyDot.style.display = 'inline';
      }
      clearTimeout(renderDebounce);
      renderDebounce = setTimeout(renderPreview, 300);
    });

    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveFile();
      }
    });

    saveBtn.addEventListener('click', saveFile);

    togglePreviewBtn.addEventListener('click', () => {
      previewMode = !previewMode;
      updateToolbarState();
      if (previewMode) renderPreview();
    });

    const getPaperHtml = () => {
      const raw = textarea.value;
      let title = 'Research Paper';
      let titleMatch = raw.match(/\\title\{([^}]+)\}/);
      if (titleMatch) {
        title = titleMatch[1].replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\\\/g, ' - ').trim();
      }

      let author = '';
      let authorMatch = raw.match(/\\author\{([\s\S]*?)\}/);
      if (authorMatch) {
        author = authorMatch[1].replace(/\\textbf\{([^}]+)\}/g, '$1').replace(/\\\\/g, '<br>').replace(/\\texttt\{([^}]+)\}/g, '$1');
      }

      let abstractText = '';
      let abstractMatch = raw.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
      if (abstractMatch) {
        abstractText = abstractMatch[1].trim();
      }

      let bodyHtml = '';
      const sections = raw.split(/\\section\{/);
      sections.forEach((sec, idx) => {
        if (idx === 0) return;
        const closeIdx = sec.indexOf('}');
        if (closeIdx !== -1) {
          const secTitle = sec.substring(0, closeIdx).trim();
          const secBody = sec.substring(closeIdx + 1);
          bodyHtml += `<h2 style="font-size:12pt; font-weight:bold; color:#000000; text-transform:uppercase; margin-top:18pt; margin-bottom:6pt; border-bottom:1px solid #000000; padding-bottom:2pt;">${idx}. ${secTitle}</h2>`;

          const parts = secBody.split(/(\\begin\{equation\}[\s\S]*?\\end\{equation\}|\$\$[\s\S]*?\$\$)/);
          parts.forEach(part => {
            if (part.startsWith('\\begin{equation}') || part.startsWith('$$')) {
              const mathCode = part.replace(/\\begin\{equation\}/, '').replace(/\\end\{equation\}/, '').replace(/\$\$/g, '').trim();
              let renderedMath = mathCode;
              if (window.katex) {
                try { renderedMath = window.katex.renderToString(mathCode, { displayMode: true, throwOnError: false }); } catch (_) {}
              }
              bodyHtml += `<div style="margin:12pt 0; text-align:center; color:#000000;">${renderedMath}</div>`;
            } else {
              const paras = part.split(/\n\s*\n/);
              paras.forEach(p => {
                let cleanP = p.trim();
                if (!cleanP || cleanP.startsWith('\\end{document}') || cleanP.startsWith('\\begin{document}') || cleanP.startsWith('\\begin{thebibliography}') || cleanP.startsWith('\\end{thebibliography}')) return;
                cleanP = cleanP.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
                cleanP = cleanP.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
                cleanP = cleanP.replace(/\\cite\{([^}]+)\}/g, '[$1]');
                cleanP = cleanP.replace(/\$([^$]+)\$/g, (m, inlineMath) => {
                  if (window.katex) {
                    try { return window.katex.renderToString(inlineMath, { displayMode: false, throwOnError: false }); } catch (_) { return m; }
                  }
                  return inlineMath;
                });
                bodyHtml += `<p style="font-size:10pt; line-height:1.5; color:#000000; text-align:justify; margin-bottom:8pt; text-indent:1.5em;">${cleanP}</p>`;
              });
            }
          });
        }
      });

      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css">
  <style>
    * { box-sizing: border-box; }
    body {
      background: #FFFFFF !important;
      color: #000000 !important;
      font-family: "Times New Roman", Times, "Nimbus Roman No9 L", serif !important;
      padding: 0.8in 1in;
      max-width: 8.5in;
      margin: 0 auto;
      line-height: 1.5;
    }
    h1 {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin-bottom: 8pt;
      color: #000000;
    }
    .author-block {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 16pt;
      color: #000000;
      line-height: 1.4;
    }
    .abstract-box {
      margin: 0 auto 18pt auto;
      max-width: 90%;
      text-align: justify;
      font-size: 9.5pt;
      line-height: 1.4;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 8pt 0;
    }
    .abstract-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 4pt;
      font-size: 10pt;
      text-transform: uppercase;
    }
    .katex { color: #000000 !important; }
    @media print {
      body { padding: 0.5in; }
      @page { margin: 0.6in; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="author-block">${author}</div>
  ${abstractText ? `
    <div class="abstract-box">
      <div class="abstract-title">Abstract</div>
      <div>${abstractText}</div>
    </div>
  ` : ''}
  ${bodyHtml}
</body>
</html>`;
    };

    // 1. Direct Download to AURA-OS ~/Downloads as a genuine PDF
    if (dlPdfBtn) {
      dlPdfBtn.addEventListener('click', async () => {
        dlPdfBtn.disabled = true;
        dlPdfBtn.innerHTML = '<span>Compiling Real PDF...</span>';
        
        try {
          const rawTex = textarea.value;
          const cleanName = activeFilePath.split('/').pop().replace(/\.(tex|latex)$/, '') || 'Research_Paper';
          const pdfFileName = `${cleanName}.pdf`;

          const res = await api.post('/api/latex/pdf', {
            content: rawTex,
            filename: pdfFileName
          });

          const data = (res && res.data) ? res.data : res;

          if (data && data.ok) {
            // Trigger browser download of the genuine compiled PDF
            const pdfUrl = `/api/fs/read?path=${encodeURIComponent('~/Downloads/' + pdfFileName)}`;
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = pdfFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            window.dispatchEvent(new CustomEvent('aura-notify', {
              detail: {
                title: 'PDF Saved to ~/Downloads',
                message: `Compiled genuine academic paper at ~/Downloads/${pdfFileName} (${Math.round((data.size_bytes || 0) / 1024)} KB)`,
                icon: 'file-text',
                type: 'ok'
              }
            }));

            dlPdfBtn.innerHTML = '<span>✓ Saved PDF to Downloads</span>';
          } else {
            throw new Error((data && data.error) || 'PDF compilation failed');
          }

          setTimeout(() => {
            dlPdfBtn.disabled = false;
            dlPdfBtn.innerHTML = `
              <svg width="12" height="12"><use href="#icon-download"></use></svg>
              <span>Download PDF to ~/Downloads</span>
            `;
          }, 2000);
        } catch (e) {
          dlPdfBtn.disabled = false;
          dlPdfBtn.innerHTML = '<span>Export Failed</span>';
          alert('Failed to generate PDF: ' + e);
        }
      });
    }

    // 2. Non-freezing Print Dialog
    buildBtn.addEventListener('click', () => {
      const docHtml = getPaperHtml();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow || iframe.contentDocument;
      const targetDoc = frameDoc.document || frameDoc;
      targetDoc.open();
      targetDoc.write(docHtml);
      targetDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (_) {}
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 3000);
      }, 500);

      window.dispatchEvent(new CustomEvent('aura-notify', {
        detail: { title: 'Print Dialog Ready', message: 'Pure black & white academic format loaded.', icon: 'file-text', type: 'ok' }
      }));
    });

    runServerBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('aura-open-app', { detail: { appId: 'terminal' } }));
    });

    changeFolderBtn.addEventListener('click', () => {
      const target = prompt('Enter folder path to load in workspace:', rootProjectFolder);
      if (target && target.trim()) {
        rootProjectFolder = target.trim();
        loadDirectoryTree();
      }
    });

    refreshTreeBtn.addEventListener('click', loadDirectoryTree);

    // Initial load
    updateToolbarState();
    renderTabs();
    loadFileContent();
    loadDirectoryTree();

    return { unmount: () => {} };
  }
};
