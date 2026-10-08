/**
 * AURA-OS Global Context Menu Controller
 * Desktop and file manager right-click menus.
 * 100% Zero Fake Data.
 */

export class ContextMenuController {
  constructor() {
    this.menuEl = document.createElement('div');
    this.menuEl.id = 'global-context-menu';
    this.menuEl.style.position = 'fixed';
    this.menuEl.style.zIndex = '9999';
    this.menuEl.style.background = 'var(--bg-acrylic)';
    this.menuEl.style.backdropFilter = 'blur(20px)';
    this.menuEl.style.border = '1px solid var(--line-2)';
    this.menuEl.style.borderRadius = 'var(--radius-card)';
    this.menuEl.style.boxShadow = 'var(--shadow-overlay)';
    this.menuEl.style.padding = '5px';
    this.menuEl.style.display = 'none';
    this.menuEl.style.minWidth = '170px';
    document.body.appendChild(this.menuEl);

    this.init();
  }

  init() {
    window.addEventListener('aura-contextmenu', (e) => {
      this.show(e.detail);
    });

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      if (!e.defaultPrevented) this.hide();
    });
  }

  show({ x, y, items }) {
    this.menuEl.innerHTML = '';
    items.forEach(item => {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.style.height = '1px';
        sep.style.background = 'var(--line-1)';
        sep.style.margin = '4px 0';
        this.menuEl.appendChild(sep);
        return;
      }

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '6px 10px';
      row.style.borderRadius = 'var(--radius-btn)';
      row.style.fontSize = '12px';
      row.style.color = 'var(--text-1)';
      row.style.cursor = 'pointer';
      row.style.position = 'relative';
      row.style.transition = 'all var(--trans-fast)';

      row.innerHTML = `
        ${item.icon ? `<svg width="15" height="15" style="color:var(--text-2); flex-shrink:0;"><use href="#icon-${item.icon}"></use></svg>` : ''}
        <span style="flex:1;">${item.label}</span>
        ${item.children ? `<svg width="12" height="12" style="color:var(--text-3);"><use href="#icon-chevron-right"></use></svg>` : ''}
      `;

      if (item.children) {
        const subMenu = document.createElement('div');
        subMenu.style.position = 'absolute';
        subMenu.style.left = '100%';
        subMenu.style.top = '0px';
        subMenu.style.background = 'var(--bg-acrylic)';
        subMenu.style.backdropFilter = 'blur(20px)';
        subMenu.style.border = '1px solid var(--line-2)';
        subMenu.style.borderRadius = 'var(--radius-card)';
        subMenu.style.boxShadow = 'var(--shadow-overlay)';
        subMenu.style.padding = '5px';
        subMenu.style.display = 'none';
        subMenu.style.minWidth = '180px';
        subMenu.style.zIndex = '10000';

        item.children.forEach(subItem => {
          const subRow = document.createElement('div');
          subRow.style.display = 'flex';
          subRow.style.alignItems = 'center';
          subRow.style.gap = '8px';
          subRow.style.padding = '6px 10px';
          subRow.style.borderRadius = 'var(--radius-btn)';
          subRow.style.fontSize = '12px';
          subRow.style.color = 'var(--text-1)';
          subRow.style.cursor = 'pointer';

          subRow.innerHTML = `
            ${subItem.icon ? `<svg width="14" height="14" style="color:var(--text-2); flex-shrink:0;"><use href="#icon-${subItem.icon}"></use></svg>` : ''}
            <span style="flex:1;">${subItem.label}</span>
          `;

          subRow.addEventListener('mouseenter', () => {
            subRow.style.background = 'var(--bg-3)';
            subRow.style.color = 'var(--text-0)';
          });
          subRow.addEventListener('mouseleave', () => {
            subRow.style.background = 'transparent';
            subRow.style.color = 'var(--text-1)';
          });
          subRow.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide();
            if (subItem.action) subItem.action();
          });

          subMenu.appendChild(subRow);
        });

        row.appendChild(subMenu);

        row.addEventListener('mouseenter', () => {
          row.style.background = 'var(--bg-3)';
          row.style.color = 'var(--text-0)';
          subMenu.style.display = 'block';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'transparent';
          row.style.color = 'var(--text-1)';
          subMenu.style.display = 'none';
        });
      } else {
        row.addEventListener('mouseenter', () => {
          row.style.background = 'var(--bg-3)';
          row.style.color = 'var(--text-0)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'transparent';
          row.style.color = 'var(--text-1)';
        });
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          if (item.action) item.action();
        });
      }

      this.menuEl.appendChild(row);
    });

    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - (items.length * 28 + 40);

    this.menuEl.style.left = `${Math.min(x, maxX)}px`;
    this.menuEl.style.top = `${Math.min(y, maxY)}px`;
    this.menuEl.style.display = 'block';
  }

  hide() {
    this.menuEl.style.display = 'none';
  }
}
