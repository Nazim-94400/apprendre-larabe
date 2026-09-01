import { MODULES, PHASES } from '../registry.js';

const LABEL = { todo: 'À venir', wip: 'En cours', done: 'Disponible' };
const CLS   = { todo: 'badge-locked', wip: 'badge-active', done: 'badge-done' };

/** Les sept modules, groupés par phase de la feuille de route. */
export default {
  title: 'Modules',

  async mount(el) {
    const groups = Object.entries(PHASES).map(([phase, name]) => {
      const items = MODULES.filter((m) => String(m.phase) === phase);
      if (!items.length) return '';
      return `
        <section>
          <h2>Phase ${phase} \u2014 ${name}</h2>
          <div class="grid">
            ${items.map((m) => `
              <a class="card card-link" href="#/m/${m.id}">
                <div style="display:flex;align-items:center;gap:var(--sp-3)">
                  <span class="ar-inline" aria-hidden="true">${m.icon}</span>
                  <span style="flex:1;min-width:0">
                    <strong>${m.n}. ${m.title}</strong><br>
                    <span class="small muted">${m.subtitle}</span>
                  </span>
                  <span class="badge ${CLS[m.state]}">${LABEL[m.state]}</span>
                </div>
              </a>`).join('')}
          </div>
        </section>`;
    }).join('');

    el.innerHTML = `<div class="stack">${groups}</div>`;
  },

  unmount() {}
};
