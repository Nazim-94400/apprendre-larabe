import { byId } from '../registry.js';

/** Module « Makhârij al-Hurûf » — squelette. Contenu implémenté en Phase 1. */
export default {
  title: 'Makhârij al-Hurûf',

  async mount(el) {
    const m = byId('02-makharij');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 1 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Fiche par lettre : point d'articulation et sifât</li><li>Schéma anatomique simplifié, par groupe de lettres</li><li>Discrimination auditive des paires proches : ح/ه, ص/س, ذ/ز/ظ, ط/ت, ق/ك</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
