import { byId } from '../registry.js';

/** Module « Vocabulaire coranique » — squelette. Contenu implémenté en Phase 4. */
export default {
  title: 'Vocabulaire coranique',

  async mount(el) {
    const m = byId('07-vocabulaire');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 4 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Les mots les plus fréquents du Coran</li><li>Fiches mot : sens, racine trilitère, occurrences</li><li>Quiz contextualisés sur des versets réels</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
