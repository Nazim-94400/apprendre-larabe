import { byId } from '../registry.js';

/** Module « Règles de Tajweed » — squelette. Contenu implémenté en Phase 2. */
export default {
  title: 'Règles de Tajweed',

  async mount(el) {
    const m = byId('03-tajweed');
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 2 — à venir</span>
        </section>
        <section class="card">
          <h3>Au programme</h3>
          <ul class="plan small muted"><li>Noun sâkina et tanwîn : idhâr, idghâm, iqlâb, ikhfâ</li><li>Mîm sâkina : idhâr, idghâm et ikhfâ chafawi</li><li>Madd : natures et durées de 2, 4 ou 6 temps</li><li>Qalqala, ghunna, règles du Râ et du Lâm</li><li>Glossaire des termes de tajweed</li></ul>
        </section>
      </div>`;
  },

  unmount() {}
};
