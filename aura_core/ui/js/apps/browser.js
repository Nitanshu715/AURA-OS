/**
 * AURA-OS Web Browser Application
 * Complete Multi-Tab Browser with Native Chrome-grade Search (All, Images, Videos, News, Wiki),
 * Direct URL navigation, High-Res Image Downloader, and Photos integration.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';

export const BrowserApp = {
  id: 'browser',
  name: 'Browser',
  icon: 'globe',
  defaultWidth: 1080,
  defaultHeight: 680,

  mount(el, ctx) {
    const createNewTab = (id = Date.now()) => ({
      id,
      title: 'New Tab',
      view: 'start',
      query: '',
      mode: 'all',
      url: '',
      history: [{ view: 'start', title: 'New Tab', query: '', mode: 'all', url: '' }],
      histIndex: 0
    });

    let tabs = [
      createNewTab(1)
    ];
    let activeTabId = 1;
    let loading = false;
    let searchResults = [];

    const getActiveTab = () => tabs.find(t => t.id === activeTabId) || tabs[0];

    const pushTabHistory = (tab, state) => {
      if (!tab.history) {
        tab.history = [{ view: 'start', title: 'New Tab', query: '', mode: 'all', url: '' }];
        tab.histIndex = 0;
      }
      tab.history = tab.history.slice(0, tab.histIndex + 1);
      tab.history.push({ ...state });
      tab.histIndex = tab.history.length - 1;
    };

    const restoreTabState = (tab, state) => {
      tab.view = state.view;
      tab.title = state.title;
      tab.query = state.query || '';
      tab.mode = state.mode || 'all';
      tab.url = state.url || '';
      if (tab.view === 'search' && tab.query) {
        executeSearchFetch(tab, tab.query, tab.mode);
      } else {
        render();
      }
    };

    const executeSearchFetch = async (tab, query, mode) => {
      loading = true;
      render();

      try {
        const res = await api.get(`/api/proxy/search?q=${encodeURIComponent(query)}&type=${mode}`);
        if (res && res.data && res.data.results) {
          searchResults = res.data.results;
        } else if (res && res.results) {
          searchResults = res.results;
        } else {
          searchResults = [];
        }
      } catch (err) {
        searchResults = [];
      } finally {
        loading = false;
        render();
      }
    };

    const performSearch = async (tab, query, mode, pushState = true) => {
      tab.query = query;
      tab.mode = mode;
      tab.view = 'search';
      tab.title = `${query} - ${mode.toUpperCase()}`;
      tab.url = `search://${mode}?q=${encodeURIComponent(query)}`;

      if (pushState) {
        pushTabHistory(tab, {
          view: 'search',
          title: tab.title,
          query: tab.query,
          mode: tab.mode,
          url: tab.url
        });
      }

      await executeSearchFetch(tab, query, mode);
    };

    const navigateToUrl = (tab, url, pushState = true) => {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      tab.view = 'webview';
      tab.url = finalUrl;
      try {
        const u = new URL(finalUrl);
        tab.title = u.hostname;
      } catch (_) {
        tab.title = 'Web Page';
      }

      if (pushState) {
        pushTabHistory(tab, {
          view: 'webview',
          title: tab.title,
          query: '',
          mode: tab.mode || 'all',
          url: tab.url
        });
      }

      render();
    };

    const goHome = (tab) => {
      tab.view = 'start';
      tab.title = 'New Tab';
      tab.url = '';
      tab.query = '';
      pushTabHistory(tab, {
        view: 'start',
        title: 'New Tab',
        query: '',
        mode: tab.mode || 'all',
        url: ''
      });
      render();
    };

    const handleAddressInput = (input, mode = 'all') => {
      const tab = getActiveTab();
      const raw = input.trim();
      if (!raw) return;

      // Detect if user typed a direct URL (contains dot, no spaces)
      if (raw.startsWith('http://') || raw.startsWith('https://') || (raw.includes('.') && !raw.includes(' ') && !raw.startsWith('?'))) {
        navigateToUrl(tab, raw);
      } else {
        // Natural search query
        performSearch(tab, raw, mode);
      }
    };

    // Global listener for proxy navigation events from iframes
    const onIframeMessage = (evt) => {
      if (evt.data && evt.data.type === 'aura-browser-nav' && evt.data.url) {
        const tab = getActiveTab();
        if (tab && tab.view === 'webview' && tab.url !== evt.data.url) {
          navigateToUrl(tab, evt.data.url, true);
        }
      }
    };
    window.addEventListener('message', onIframeMessage);

    const render = () => {
      const activeTab = getActiveTab();
      ctx.setTitle(`Browser - ${activeTab.title}`);

      el.innerHTML = `
        <div class="browser-layout" style="display:flex; flex-direction:column; height:100%; background:var(--bg-1); color:var(--text-0); font-family:var(--font-sans);">
          
          <!-- Tab Bar -->
          <div style="height:40px; background:var(--bg-2); border-bottom:1px solid var(--line-1); display:flex; align-items:center; padding:0 8px; gap:6px; overflow-x:auto;">
            ${tabs.map(t => `
              <div class="browser-tab-item ${t.id === activeTabId ? 'active' : ''}" data-tabid="${t.id}" style="
                display:flex; align-items:center; gap:8px; padding:6px 14px; border-radius:8px 8px 0 0;
                background:${t.id === activeTabId ? 'var(--bg-1)' : 'transparent'};
                border:${t.id === activeTabId ? '1px solid var(--line-2)' : '1px solid transparent'};
                border-bottom:none; color:${t.id === activeTabId ? 'var(--text-0)' : 'var(--text-2)'};
                font-size:12px; font-weight:${t.id === activeTabId ? '600' : '500'}; cursor:pointer; max-width:210px; min-width:130px; user-select:none;
              ">
                <svg width="14" height="14" style="color:var(--accent); flex-shrink:0;"><use href="#icon-globe"></use></svg>
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${t.title}</span>
                ${tabs.length > 1 ? `<span class="br-close-tab" data-tabid="${t.id}" style="font-size:13px; opacity:0.6; padding:0 2px;">&times;</span>` : ''}
              </div>
            `).join('')}
            <button id="br-new-tab-btn" class="btn-glass" style="padding:4px 10px; font-size:13px; font-weight:700;" title="New Tab">+</button>
          </div>

          <!-- Navigation & Address Bar -->
          <div class="browser-toolbar" style="height:46px; background:var(--bg-1); border-bottom:1px solid var(--line-1); display:flex; align-items:center; gap:8px; padding:0 12px;">
            <button class="explorer-nav-btn" id="br-back-btn" title="Back" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;"><svg width="15" height="15"><use href="#icon-arrow-left"></use></svg></button>
            <button class="explorer-nav-btn" id="br-fwd-btn" title="Forward" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;"><svg width="15" height="15"><use href="#icon-arrow-right"></use></svg></button>
            <button class="explorer-nav-btn" id="br-reload-btn" title="Reload" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;"><svg width="14" height="14"><use href="#icon-rotate-cw"></use></svg></button>
            <button class="explorer-nav-btn" id="br-home-btn" title="Home (Start Page)" style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;"><svg width="15" height="15"><use href="#icon-grid"></use></svg></button>
            
            <!-- Universal Omnibox -->
            <div style="flex:1; position:relative; display:flex; align-items:center;">
              <svg width="15" height="15" style="position:absolute; left:12px; color:var(--text-2);"><use href="#icon-search"></use></svg>
              <input type="text" class="browser-address-input" id="br-addr-input" value="${activeTab.view === 'start' ? '' : (activeTab.view === 'search' ? activeTab.query : activeTab.url)}" placeholder="Search web or enter address (e.g. en.wikipedia.org, github.com)..." style="width:100%; padding-left:36px; padding-right:12px; height:34px; border-radius:8px; border:1px solid var(--line-2); background:var(--bg-2); color:var(--text-0); font-size:12.5px;">
            </div>

            <!-- Search Mode Switcher (Always accessible) -->
            <div style="display:flex; align-items:center; gap:3px; background:var(--bg-2); padding:3px 5px; border-radius:8px; border:1px solid var(--line-1);">
              ${['all', 'images', 'videos', 'news', 'wiki'].map(m => `
                <button class="btn-glass br-mode-btn ${activeTab.mode === m ? 'active' : ''}" data-mode="${m}" style="
                  padding:3px 9px; font-size:11.5px; font-weight:${activeTab.mode === m ? '700' : '500'};
                  background:${activeTab.mode === m ? 'var(--accent)' : 'transparent'};
                  color:${activeTab.mode === m ? '#FFF' : 'var(--text-1)'};
                  border-radius:5px; border:none; cursor:pointer; text-transform:capitalize;
                ">${m}</button>
              `).join('')}
            </div>

            <button class="btn-glass" id="br-ext-btn" title="Open in Host Browser" style="padding:5px 10px; font-size:11.5px; display:flex; align-items:center; gap:5px;">
              <svg width="13" height="13"><use href="#icon-external-link"></use></svg>
              <span>Host</span>
            </button>
          </div>

          <!-- Main Viewport -->
          <div style="flex:1; position:relative; overflow:hidden; display:flex; flex-direction:column;">
            
            ${activeTab.view === 'start' ? `
              <!-- START PAGE -->
              <div class="browser-start-page" style="flex:1; overflow-y:auto; padding:44px 24px; display:flex; flex-direction:column; align-items:center; background:var(--bg-1);">
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
                  <div class="start-app-tile tile-browser" style="width:52px; height:52px; border-radius:14px;">
                    <svg width="28" height="28"><use href="#icon-globe"></use></svg>
                  </div>
                  <div>
                    <h1 style="font-size:24px; font-weight:800; color:var(--text-0); margin:0;">AURA Browser</h1>
                    <div style="font-size:12.5px; color:var(--text-2);">Real Web Engine &middot; All &middot; Images &middot; Videos &middot; News &middot; Wikipedia</div>
                  </div>
                </div>

                <!-- Hero Search -->
                <div style="width:100%; max-width:680px; margin-bottom:32px;">
                  <div class="browser-hero-search" style="display:flex; align-items:center; background:var(--bg-2); border:1px solid var(--line-2); border-radius:12px; padding:4px 6px; box-shadow:0 8px 24px rgba(15,23,42,0.06);">
                    <svg width="18" height="18" style="color:var(--accent); margin-left:10px;"><use href="#icon-search"></use></svg>
                    <input type="text" id="start-search-box" autocomplete="off" spellcheck="false" placeholder="Search Google, Wikipedia, Wikimedia Images, YouTube..." style="flex:1; background:transparent; border:none; padding:10px 12px; color:var(--text-0); font-size:14px; outline:none;">
                    <button id="start-search-submit" class="btn-solid" style="padding:8px 18px; border-radius:8px; font-size:12.5px; font-weight:700;">Search</button>
                  </div>
                </div>

                <!-- Featured Portals -->
                <div style="width:100%; max-width:820px;">
                  <div style="font-size:12px; font-weight:700; color:var(--text-1); margin-bottom:14px; text-transform:uppercase; letter-spacing:0.5px;">Quick Portals</div>
                  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px;">
                    <div class="quick-link-card" data-url="https://en.wikipedia.org" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:8px;">
                      <div class="start-app-tile tile-browser" style="width:38px; height:38px; border-radius:8px;"><svg width="20" height="20"><use href="#icon-globe"></use></svg></div>
                      <div style="font-size:13px; font-weight:700; color:var(--text-0);">Wikipedia</div>
                      <div style="font-size:11px; color:var(--text-2);">Free Encyclopedia</div>
                    </div>

                    <div class="quick-link-card" data-url="https://commons.wikimedia.org" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:8px;">
                      <div class="start-app-tile tile-photos" style="width:38px; height:38px; border-radius:8px;"><svg width="20" height="20"><use href="#icon-image"></use></svg></div>
                      <div style="font-size:13px; font-weight:700; color:var(--text-0);">Wikimedia Images</div>
                      <div style="font-size:11px; color:var(--text-2);">Millions of High-Res Photos</div>
                    </div>

                    <div class="quick-link-card" data-url="https://news.ycombinator.com" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:8px;">
                      <div class="start-app-tile tile-terminal" style="width:38px; height:38px; border-radius:8px;"><svg width="20" height="20"><use href="#icon-terminal"></use></svg></div>
                      <div style="font-size:13px; font-weight:700; color:var(--text-0);">Hacker News</div>
                      <div style="font-size:11px; color:var(--text-2);">Computing & Tech</div>
                    </div>

                    <div class="quick-link-card" data-url="https://docs.python.org/3/" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:8px;">
                      <div class="start-app-tile tile-files" style="width:38px; height:38px; border-radius:8px;"><svg width="20" height="20"><use href="#icon-file-text"></use></svg></div>
                      <div style="font-size:13px; font-weight:700; color:var(--text-0);">Python Docs</div>
                      <div style="font-size:11px; color:var(--text-2);">Standard Library</div>
                    </div>
                  </div>
                </div>
              </div>
            ` : activeTab.view === 'search' ? `
              <!-- NATIVE SEARCH RESULTS VIEW -->
              <div style="flex:1; overflow-y:auto; padding:20px 32px; background:var(--bg-1);">
                
                <!-- Search Sub-header with Category Switcher -->
                <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line-1); padding-bottom:14px; margin-bottom:20px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:18px; font-weight:800; color:var(--text-0);">"${activeTab.query}"</span>
                    <span style="font-size:12px; color:var(--text-2); background:var(--bg-2); padding:3px 8px; border-radius:6px; border:1px solid var(--line-1);">${searchResults.length} results found</span>
                  </div>

                  <div style="display:flex; align-items:center; gap:6px;">
                    ${['all', 'images', 'videos', 'news', 'wiki'].map(m => `
                      <button class="btn-glass search-cat-pill ${activeTab.mode === m ? 'active' : ''}" data-mode="${m}" style="
                        padding:5px 12px; font-size:12px; font-weight:${activeTab.mode === m ? '700' : '500'};
                        background:${activeTab.mode === m ? 'var(--accent)' : 'var(--bg-2)'};
                        color:${activeTab.mode === m ? '#FFF' : 'var(--text-1)'};
                        border-radius:6px; border:1px solid ${activeTab.mode === m ? 'var(--accent)' : 'var(--line-1)'}; cursor:pointer; text-transform:capitalize;
                      ">${m}</button>
                    `).join('')}
                  </div>
                </div>

                ${loading ? `
                  <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 0; gap:14px;">
                    <div style="width:36px; height:36px; border:3px solid var(--line-2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite;"></div>
                    <div style="font-size:13px; color:var(--text-2);">Retrieving live search results...</div>
                  </div>
                ` : searchResults.length === 0 ? `
                  <div style="text-align:center; padding:60px 0; color:var(--text-2);">
                    <svg width="40" height="40" style="opacity:0.4; margin-bottom:12px;"><use href="#icon-search"></use></svg>
                    <div style="font-size:15px; font-weight:700; color:var(--text-1);">No results found for "${activeTab.query}"</div>
                    <div style="font-size:12px; margin-top:4px;">Try searching different keywords or switch categories above.</div>
                  </div>
                ` : activeTab.mode === 'images' ? `
                  <!-- IMAGES GRID -->
                  <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
                    ${searchResults.map((img, idx) => `
                      <div class="image-result-card" data-idx="${idx}" style="background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 12px rgba(15,23,42,0.04); transition:transform 0.15s ease;">
                        <div style="height:160px; background:#000; position:relative; overflow:hidden; cursor:pointer;" class="img-preview-trigger" data-url="${img.url}">
                          <img src="${img.thumb}" alt="${img.title}" loading="lazy" style="width:100%; height:100%; object-fit:cover; transition:transform 0.2s ease;">
                          <div style="position:absolute; bottom:6px; right:6px; background:rgba(15,23,42,0.75); color:#FFF; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">
                            ${img.width ? `${img.width}x${img.height}` : 'HD'}
                          </div>
                        </div>
                        <div style="padding:10px; display:flex; flex-direction:column; gap:6px; flex:1;">
                          <div style="font-size:12px; font-weight:600; color:var(--text-0); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${img.title}">${img.title}</div>
                          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:auto;">
                            <span style="font-size:10.5px; color:var(--text-2);">${img.source || 'Wikimedia'}</span>
                            <button class="btn-solid save-img-btn" data-url="${img.url}" data-name="${img.title}" style="padding:3px 8px; font-size:11px; border-radius:5px; display:flex; align-items:center; gap:4px;">
                              <svg width="12" height="12"><use href="#icon-download"></use></svg>
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : activeTab.mode === 'videos' ? `
                  <!-- VIDEOS LIST -->
                  <div style="display:flex; flex-direction:column; gap:16px; max-width:860px;">
                    ${searchResults.map(v => `
                      <div class="video-result-card" data-url="${v.url}" style="display:flex; gap:16px; padding:14px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; box-shadow:0 4px 12px rgba(15,23,42,0.04);">
                        ${v.thumb ? `
                          <div style="width:160px; height:90px; border-radius:8px; overflow:hidden; background:#000; flex-shrink:0; position:relative;">
                            <img src="${v.thumb}" alt="${v.title}" style="width:100%; height:100%; object-fit:cover;">
                            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3);">
                              <div style="width:32px; height:32px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; color:#FFF;">▶</div>
                            </div>
                          </div>
                        ` : ''}
                        <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                          <div style="font-size:14px; font-weight:700; color:var(--accent);">${v.title}</div>
                          <div style="font-size:11px; color:var(--text-2);">${v.domain || 'youtube.com'}</div>
                          <div style="font-size:12px; color:var(--text-1); line-height:1.4;">${v.snippet}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : activeTab.mode === 'news' ? `
                  <!-- NEWS LIST -->
                  <div style="display:flex; flex-direction:column; gap:14px; max-width:860px;">
                    ${searchResults.map(n => `
                      <div class="news-result-card" data-url="${n.url}" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 12px rgba(15,23,42,0.04);">
                        <div style="font-size:14.5px; font-weight:700; color:var(--accent);">${n.title}</div>
                        <div style="font-size:11px; color:var(--text-2);">${n.source} &middot; ${n.time}</div>
                        <div style="font-size:12px; color:var(--text-1);">${n.snippet}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <!-- ALL & WIKI RESULTS -->
                  <div style="display:flex; flex-direction:column; gap:16px; max-width:860px;">
                    ${searchResults.map(r => `
                      <div class="web-result-card" data-url="${r.url}" style="padding:16px; background:var(--bg-2); border:1px solid var(--line-1); border-radius:10px; cursor:pointer; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 12px rgba(15,23,42,0.04);">
                        <div style="font-size:11px; color:var(--text-2); display:flex; align-items:center; gap:6px;">
                          <svg width="12" height="12" style="color:var(--accent);"><use href="#icon-globe"></use></svg>
                          <span>${r.domain || 'web'}</span>
                        </div>
                        <div style="font-size:15px; font-weight:700; color:var(--accent);">${r.title}</div>
                        <div style="font-size:12.5px; color:var(--text-1); line-height:1.5;">${r.snippet}</div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            ` : `
              <!-- LIVE WEBVIEW IFRAME -->
              <iframe class="browser-webview" id="br-webview-${activeTab.id}" src="/api/proxy?url=${encodeURIComponent(activeTab.url)}" allow="fullscreen; clipboard-read; clipboard-write; camera; microphone; autoplay; encrypted-media" style="width:100%; height:100%; border:none; background:#FFF;"></iframe>
            `}
          </div>
        </div>
      `;

      bindEvents();
    };

    const bindEvents = () => {
      // Tab selection
      el.querySelectorAll('.browser-tab-item').forEach(tabEl => {
        tabEl.addEventListener('click', (e) => {
          if (e.target.classList.contains('br-close-tab')) return;
          activeTabId = parseInt(tabEl.getAttribute('data-tabid'));
          render();
        });
      });

      // Close tab
      el.querySelectorAll('.br-close-tab').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tid = parseInt(closeBtn.getAttribute('data-tabid'));
          tabs = tabs.filter(t => t.id !== tid);
          if (tabs.length === 0) {
            tabs = [{ id: Date.now(), title: 'New Tab', view: 'start', query: '', mode: 'all', url: '' }];
          }
          if (activeTabId === tid) {
            activeTabId = tabs[0].id;
          }
          render();
        });
      });

      // New tab
      const newTabBtn = el.querySelector('#br-new-tab-btn');
      if (newTabBtn) {
        newTabBtn.addEventListener('click', () => {
          const newId = Date.now();
          tabs.push({ id: newId, title: 'New Tab', view: 'start', query: '', mode: 'all', url: '' });
          activeTabId = newId;
          render();
        });
      }

      // Address Bar Enter
      const addrInput = el.querySelector('#br-addr-input');
      if (addrInput) {
        addrInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const tab = getActiveTab();
            handleAddressInput(addrInput.value, tab.mode || 'all');
          }
        });
      }

      // Toolbar Mode Switcher Buttons
      el.querySelectorAll('.br-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          const tab = getActiveTab();
          const q = tab.query || (addrInput ? addrInput.value : '');
          if (q && tab.view !== 'start') {
            performSearch(tab, q, mode);
          } else {
            tab.mode = mode;
            render();
          }
        });
      });

      // Search Category Pills on Results page
      el.querySelectorAll('.search-cat-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          const tab = getActiveTab();
          if (tab.query) {
            performSearch(tab, tab.query, mode);
          }
        });
      });

      // Back button
      const backBtn = el.querySelector('#br-back-btn');
      if (backBtn) {
        const tab = getActiveTab();
        const canGoBack = tab.history && tab.histIndex > 0;
        backBtn.style.opacity = canGoBack ? '1' : '0.4';
        backBtn.style.cursor = canGoBack ? 'pointer' : 'default';

        backBtn.addEventListener('click', () => {
          const tab = getActiveTab();
          if (tab.history && tab.histIndex > 0) {
            tab.histIndex--;
            const prevState = tab.history[tab.histIndex];
            restoreTabState(tab, prevState);
          } else if (tab.view !== 'start') {
            goHome(tab);
          }
        });
      }

      // Forward button
      const fwdBtn = el.querySelector('#br-fwd-btn');
      if (fwdBtn) {
        const tab = getActiveTab();
        const canGoFwd = tab.history && tab.histIndex < tab.history.length - 1;
        fwdBtn.style.opacity = canGoFwd ? '1' : '0.4';
        fwdBtn.style.cursor = canGoFwd ? 'pointer' : 'default';

        fwdBtn.addEventListener('click', () => {
          const tab = getActiveTab();
          if (tab.history && tab.histIndex < tab.history.length - 1) {
            tab.histIndex++;
            const nextState = tab.history[tab.histIndex];
            restoreTabState(tab, nextState);
          }
        });
      }

      // Home button
      const homeBtn = el.querySelector('#br-home-btn');
      if (homeBtn) {
        homeBtn.addEventListener('click', () => {
          const tab = getActiveTab();
          goHome(tab);
        });
      }

      // Reload
      const reloadBtn = el.querySelector('#br-reload-btn');
      if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
          const tab = getActiveTab();
          if (tab.view === 'search' && tab.query) {
            performSearch(tab, tab.query, tab.mode, false);
          } else if (tab.view === 'webview' && tab.url) {
            navigateToUrl(tab, tab.url, false);
          }
        });
      }

      // Open in Host Browser
      const extBtn = el.querySelector('#br-ext-btn');
      if (extBtn) {
        extBtn.addEventListener('click', () => {
          const tab = getActiveTab();
          const target = (tab.view === 'webview') ? tab.url : (tab.query ? `https://www.google.com/search?q=${encodeURIComponent(tab.query)}` : 'https://google.com');
          window.open(target, '_blank');
        });
      }

      // Start Page Search
      const startBox = el.querySelector('#start-search-box');
      const startSubmit = el.querySelector('#start-search-submit');
      if (startBox && startSubmit) {
        const triggerStartSearch = () => {
          const q = startBox.value.trim();
          if (q) {
            const tab = getActiveTab();
            handleAddressInput(q, tab.mode || 'all');
          }
        };
        startSubmit.addEventListener('click', triggerStartSearch);
        startBox.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') triggerStartSearch();
        });
      }

      // Quick Portals on Start page
      el.querySelectorAll('.quick-link-card').forEach(card => {
        card.addEventListener('click', () => {
          const u = card.getAttribute('data-url');
          if (u) {
            const tab = getActiveTab();
            navigateToUrl(tab, u);
          }
        });
      });

      // Result click navigation (Web, Videos, News)
      el.querySelectorAll('.web-result-card, .video-result-card, .news-result-card').forEach(card => {
        card.addEventListener('click', () => {
          const u = card.getAttribute('data-url');
          if (u) {
            const tab = getActiveTab();
            navigateToUrl(tab, u);
          }
        });
      });

      // Image Preview Trigger
      el.querySelectorAll('.img-preview-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
          const u = trigger.getAttribute('data-url');
          if (u) {
            const tab = getActiveTab();
            navigateToUrl(tab, u);
          }
        });
      });

      // Save Image directly into ~/Pictures and notify
      el.querySelectorAll('.save-img-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const url = btn.getAttribute('data-url');
          const name = btn.getAttribute('data-name');
          btn.innerHTML = `<svg width="12" height="12"><use href="#icon-rotate-cw"></use></svg> Saving...`;
          btn.disabled = true;

          try {
            const res = await api.post('/api/fs/download_file', {
              url: url,
              folder: '~/Pictures'
            });
            if (res.ok) {
              window.dispatchEvent(new CustomEvent('aura-toast', {
                detail: { title: 'Image Saved', message: `Saved ${res.data.name} to ~/Pictures!`, type: 'ok' }
              }));
              btn.innerHTML = `✓ Saved`;
              btn.style.background = '#10B981';
            } else {
              alert('Save failed: ' + (res.error || 'Check network connection'));
              btn.innerHTML = `Save`;
              btn.disabled = false;
            }
          } catch (err) {
            alert('Save error: ' + err.message);
            btn.innerHTML = `Save`;
            btn.disabled = false;
          }
        });
      });
    };

    render();
    return {
      unmount: () => {
        window.removeEventListener('message', onIframeMessage);
      }
    };
  }
};
