import { byId } from '../registry.js';

/** Module « Récitation » — squelette. Contenu implémenté en Phase 3. */
export default {
  title: 'Récitation',

  async mount(el) {
    const m = byId('05-recitation');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 3 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Enregistrement de sa propre récitation</li><li>Comparaison avec un réciter de référence : timing et énergie</li><li>Historique des enregistrements, pour suivre sa progression</li><li>Validation verset par verset avant de passer au suivant</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
