import { byId } from '../registry.js';

/** Module « Mémorisation » — squelette. Contenu implémenté en Phase 4. */
export default {
  title: 'Mémorisation',

  async mount(el) {
    const m = byId('06-hifz');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 4 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Sélection de sourates, en commençant par le Juz 'Amma</li><li>Masquage progressif des mots</li><li>Révision espacée (SM-2 simplifié)</li><li>Tableau de bord : mémorisées, en cours, à réviser</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
