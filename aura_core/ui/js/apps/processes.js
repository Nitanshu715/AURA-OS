/**
 * AURA SHELL - Processes Application
 * Top-style process viewer with sandbox indicators.
 */

export const ProcessesApp = {
  id: 'processes',
  title: 'Processes',
  icon: 'processes',

  mount(el, ctx) {
    el.innerHTML = `
      <div style="height:100%; overflow-y:auto; background:var(--bg-1);">
        <table class="app-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>NAME</th>
              <th>CPU</th>
              <th>MEM</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>init (NitanshuOS)</td>
              <td>0.0%</td>
              <td>2.1 MB</td>
              <td><span class="tech-tag ok">RUNNING</span></td>
            </tr>
            <tr>
              <td>1024</td>
              <td>aura-memd</td>
              <td>0.2%</td>
              <td>14.8 MB</td>
              <td><span class="tech-tag ok">RUNNING</span></td>
            </tr>
            <tr>
              <td>1045</td>
              <td>system_bridge</td>
              <td>0.1%</td>
              <td>22.4 MB</td>
              <td><span class="tech-tag ok">RUNNING</span></td>
            </tr>
            <tr>
              <td>1088</td>
              <td>n-sandbox</td>
              <td>0.0%</td>
              <td>4.2 MB</td>
              <td><span class="tech-tag">IDLE</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    return { unmount: () => {} };
  }
};
