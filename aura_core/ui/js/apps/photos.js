/**
 * AURA-OS Photos & Image Studio Application
 * Real image gallery, high-res viewer, crop & edit, rename, delete, and set as wallpaper.
 * 100% Zero Fake Data.
 */

import { api } from '../shell/api.js';
import { store } from '../shell/store.js';

export const PhotosApp = {
  id: 'photos',
  name: 'Photos',
  icon: 'image',
  defaultWidth: 920,
  defaultHeight: 620,

  mount(el, ctx) {
    let currentImagePath = (ctx.params && (ctx.params.path || ctx.params.file)) || null;
    let isCropping = false;
    let cropBox = { x: 20, y: 20, w: 200, h: 200 };
    let zoomLevel = 1.0;

    const render = () => {
      if (currentImagePath) {
        renderViewer();
      } else {
        renderGallery();
      }
    };

    const renderGallery = async () => {
      ctx.setTitle('Photos - Gallery');
      el.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; background:var(--bg-1);">
          <div class="explorer-toolbar" style="justify-content:space-between; padding:0 14px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg width="16" height="16" style="color:var(--accent);"><use href="#icon-image"></use></svg>
              <span style="font-size:13px; font-weight:700; color:var(--text-0);">Pictures & Screenshots Library</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-glass" id="photos-refresh-btn" style="padding:4px 10px; font-size:11.5px;">
                <svg width="12" height="12"><use href="#icon-rotate-cw"></use></svg>
                <span>Refresh</span>
              </button>
            </div>
          </div>
          <div style="flex:1; overflow-y:auto; padding:20px;" id="photos-grid">
            <div style="color:var(--text-2); font-size:12px;">Scanning ~/Pictures, ~/Pictures/Screenshots, and ~/Downloads...</div>
          </div>
        </div>
      `;

      const grid = el.querySelector('#photos-grid');
      el.querySelector('#photos-refresh-btn').addEventListener('click', renderGallery);

      try {
        let allImages = [];
        
        // Scan ~/Pictures
        const resPic = await api.get('/api/fs/list?path=~/Pictures');
        if (resPic.ok && resPic.data && resPic.data.items) {
          allImages.push(...resPic.data.items);
        }

        // Scan ~/Pictures/Screenshots
        const resSnips = await api.get('/api/fs/list?path=~/Pictures/Screenshots');
        if (resSnips.ok && resSnips.data && resSnips.data.items) {
          allImages.push(...resSnips.data.items);
        }

        // Scan ~/Downloads
        const resDown = await api.get('/api/fs/list?path=~/Downloads');
        if (resDown.ok && resDown.data && resDown.data.items) {
          allImages.push(...resDown.data.items);
        }

        // Filter duplicates and only keep image files
        const seenPaths = new Set();
        const images = [];
        allImages.forEach(f => {
          if (!f.is_dir && (f.name.match(/\.(png|jpe?g|webp|gif|svg|bmp)$/i) || (f.mime && f.mime.startsWith('image/')))) {
            if (!seenPaths.has(f.path)) {
              seenPaths.add(f.path);
              images.push(f);
            }
          }
        });

        if (images.length === 0) {
          grid.innerHTML = `
            <div style="text-align:center; padding:48px 20px; color:var(--text-2);">
              <svg width="40" height="40" style="color:var(--accent); margin-bottom:12px;"><use href="#icon-image"></use></svg>
              <div style="font-size:14px; font-weight:600; color:var(--text-0);">No Photos Found</div>
              <div style="font-size:12px; margin-top:4px;">Download images in the Browser or capture a screenshot with Snipping Tool.</div>
            </div>
          `;
          return;
        }

        grid.innerHTML = `
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:16px;">
            ${images.map(img => `
              <div class="photo-card-item" data-path="${img.path}" style="
                background:var(--bg-2); border:1px solid var(--line-1); border-radius:8px;
                padding:8px; cursor:pointer; transition:all var(--trans-fast); display:flex; flex-direction:column;
              ">
                <div style="width:100%; height:110px; border-radius:6px; overflow:hidden; background:#E2E8F0; display:flex; align-items:center; justify-content:center;">
                  <img src="/api/fs/read?path=${encodeURIComponent(img.path)}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="font-size:12px; font-weight:600; color:var(--text-0); margin-top:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${img.name}</div>
                <div style="font-size:10.5px; color:var(--text-2); margin-top:2px;">${Math.round((img.size_bytes || 0) / 1024)} KB</div>
              </div>
            `).join('')}
          </div>
        `;

        grid.querySelectorAll('.photo-card-item').forEach(card => {
          card.addEventListener('click', () => {
            currentImagePath = card.getAttribute('data-path');
            render();
          });
        });
      } catch (_) {
        grid.innerHTML = `<div style="color:var(--err); padding:16px;">Failed to scan pictures.</div>`;
      }
    };

    const renderViewer = () => {
      const filename = currentImagePath.split('/').pop().split('\\').pop();
      ctx.setTitle(`Photos - ${filename}`);

      el.innerHTML = `
        <div style="display:flex; flex-direction:column; height:100%; background:#0B0F17;">
          <!-- Top Editor Toolbar -->
          <div class="explorer-toolbar" style="background:#131B26; border-bottom:1px solid rgba(255,255,255,0.08); padding:0 12px; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn-glass" id="pv-back-btn" style="padding:4px 10px; font-size:11.5px; color:#F8FAFC;">
                <svg width="12" height="12"><use href="#icon-arrow-left"></use></svg>
                <span>Gallery</span>
              </button>
              <span style="font-size:12.5px; font-weight:600; color:#F8FAFC; margin-left:8px;">${filename}</span>
            </div>

            <!-- Action Controls -->
            <div style="display:flex; align-items:center; gap:6px;">
              <button class="btn-glass" id="pv-crop-btn" style="padding:4px 10px; font-size:11.5px; color:#F8FAFC;">
                <svg width="13" height="13" style="color:var(--accent);"><use href="#icon-camera"></use></svg>
                <span id="pv-crop-label">${isCropping ? 'Apply Crop' : 'Crop'}</span>
              </button>
              ${isCropping ? `<button class="btn-glass" id="pv-crop-cancel-btn" style="padding:4px 10px; font-size:11.5px; color:#EF4444;">Cancel</button>` : ''}
              <button class="btn-glass" id="pv-wall-btn" style="padding:4px 10px; font-size:11.5px; color:#F8FAFC;" title="Set as Desktop Wallpaper">
                <svg width="13" height="13" style="color:var(--accent);"><use href="#icon-image"></use></svg>
                <span>Set as Wallpaper</span>
              </button>
              <button class="btn-glass" id="pv-rename-btn" style="padding:4px 10px; font-size:11.5px; color:#F8FAFC;" title="Rename File">
                <svg width="13" height="13"><use href="#icon-file-text"></use></svg>
                <span>Rename</span>
              </button>
              <button class="btn-glass" id="pv-del-btn" style="padding:4px 10px; font-size:11.5px; color:#EF4444;" title="Move to Recycle Bin">
                <svg width="13" height="13"><use href="#icon-trash-2"></use></svg>
                <span>Delete</span>
              </button>
            </div>
          </div>

          <!-- Main Image Canvas Container -->
          <div style="flex:1; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:20px;" id="pv-canvas-container">
            <img id="pv-main-img" src="/api/fs/read?path=${encodeURIComponent(currentImagePath)}&t=${Date.now()}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:4px; box-shadow:0 12px 40px rgba(0,0,0,0.8); user-select:none;">
            
            ${isCropping ? `
              <div id="pv-crop-overlay" style="
                position:absolute; border:2px dashed var(--accent); background:rgba(2, 132, 199, 0.2);
                width:240px; height:240px; cursor:move; border-radius:4px; box-shadow:0 0 0 9999px rgba(0,0,0,0.5);
              ">
                <div style="position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,0.7); color:#FFF; font-size:10px; padding:2px 6px; border-radius:3px;">Drag to position crop</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      bindViewerEvents();
    };

    const bindViewerEvents = () => {
      const backBtn = el.querySelector('#pv-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          currentImagePath = null;
          isCropping = false;
          render();
        });
      }

      // Set as Wallpaper
      const wallBtn = el.querySelector('#pv-wall-btn');
      if (wallBtn) {
        wallBtn.addEventListener('click', () => {
          const imgUrl = `/api/fs/read?path=${encodeURIComponent(currentImagePath)}`;
          store.emit('wallpaperChanged', imgUrl);
          window.dispatchEvent(new CustomEvent('aura-toast', {
            detail: { title: 'Desktop Wallpaper', message: 'Applied image as desktop wallpaper!', type: 'ok' }
          }));
        });
      }

      // Rename File
      const renameBtn = el.querySelector('#pv-rename-btn');
      if (renameBtn) {
        renameBtn.addEventListener('click', async () => {
          const oldName = currentImagePath.split('/').pop().split('\\').pop();
          const newName = prompt('Enter new filename for image:', oldName);
          if (newName && newName !== oldName) {
            try {
              const res = await api.post('/api/fs/rename', { old_path: currentImagePath, new_name: newName });
              if (res.ok) {
                const parent = currentImagePath.substring(0, currentImagePath.lastIndexOf('/'));
                currentImagePath = `${parent}/${newName}`;
                window.dispatchEvent(new CustomEvent('aura-toast', {
                  detail: { title: 'Photo Renamed', message: `Renamed to ${newName}`, type: 'ok' }
                }));
                render();
              }
            } catch (_) {}
          }
        });
      }

      // Delete File
      const delBtn = el.querySelector('#pv-del-btn');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to move this image to the Recycle Bin?')) {
            try {
              const res = await api.post('/api/fs/delete', { path: currentImagePath });
              if (res.ok) {
                window.dispatchEvent(new CustomEvent('aura-toast', {
                  detail: { title: 'Recycle Bin', message: 'Image moved to Recycle Bin', type: 'ok' }
                }));
                currentImagePath = null;
                render();
              }
            } catch (_) {}
          }
        });
      }

      // Crop Mode
      const cropBtn = el.querySelector('#pv-crop-btn');
      const cropCancelBtn = el.querySelector('#pv-crop-cancel-btn');
      if (cropCancelBtn) {
        cropCancelBtn.addEventListener('click', () => {
          isCropping = false;
          render();
        });
      }

      if (cropBtn) {
        cropBtn.addEventListener('click', async () => {
          if (!isCropping) {
            isCropping = true;
            render();
          } else {
            // Apply Crop
            const imgEl = el.querySelector('#pv-main-img');
            const cropOverlay = el.querySelector('#pv-crop-overlay');
            if (imgEl && cropOverlay) {
              const imgRect = imgEl.getBoundingClientRect();
              const cropRect = cropOverlay.getBoundingClientRect();

              const scaleX = imgEl.naturalWidth / imgRect.width;
              const scaleY = imgEl.naturalHeight / imgRect.height;

              const srcX = Math.max(0, (cropRect.left - imgRect.left) * scaleX);
              const srcY = Math.max(0, (cropRect.top - imgRect.top) * scaleY);
              const srcW = Math.min(imgEl.naturalWidth - srcX, cropRect.width * scaleX);
              const srcH = Math.min(imgEl.naturalHeight - srcY, cropRect.height * scaleY);

              const canvas = document.createElement('canvas');
              canvas.width = Math.max(10, srcW);
              canvas.height = Math.max(10, srcH);
              const ctx2d = canvas.getContext('2d');

              ctx2d.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
              const base64Data = canvas.toDataURL('image/png');

              // Save cropped version
              const res = await api.post('/api/fs/write_base64', {
                path: currentImagePath,
                data: base64Data
              });

              if (res.ok) {
                window.dispatchEvent(new CustomEvent('aura-toast', {
                  detail: { title: 'Crop Applied', message: 'Saved cropped image successfully!', type: 'ok' }
                }));
                isCropping = false;
                render();
              }
            }
          }
        });
      }

      // Interactive Crop Box Dragging
      const cropOverlay = el.querySelector('#pv-crop-overlay');
      if (cropOverlay) {
        let isDragging = false;
        let startX, startY, initLeft, initTop;

        cropOverlay.addEventListener('mousedown', (e) => {
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          initLeft = cropOverlay.offsetLeft;
          initTop = cropOverlay.offsetTop;
        });

        window.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          cropOverlay.style.left = `${initLeft + dx}px`;
          cropOverlay.style.top = `${initTop + dy}px`;
        });

        window.addEventListener('mouseup', () => {
          isDragging = false;
        });
      }
    };

    render();
    return { unmount: () => {} };
  }
};
