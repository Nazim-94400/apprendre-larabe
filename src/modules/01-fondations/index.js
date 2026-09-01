import { byId } from '../registry.js';

/** Module « Fondations » — squelette. Contenu implémenté en Phase 1. */
export default {
  title: 'Fondations',

  async mount(el) {
    const m = byId('01-fondations');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 1 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Les 28 lettres : formes isolée, initiale, médiane, finale</li><li>Tracé animé, avec le sens d'écriture</li><li>Tashkîl : fatha, kasra, damma, sukûn, tanwîn, chadda</li><li>Association lettre + son, audio natif pour chaque combinaison</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
