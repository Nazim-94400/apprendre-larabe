import { db } from '../../core/db.js';

/**
 * File de révision espacée, tous types confondus : le store `srs` accepte
 * indifféremment une lettre (`letter:dhad`), une règle (`rule:ikhfa`) ou un
 * verset (`2:255`) comme identifiant de carte. Un seul système couvre donc la
 * révision des fondations et la mémorisation du Module 6.
 */
export default {
  title: 'Réviser',

  async mount(el) {
    const due = await db.upTo('srs', 'due', Date.now()).catch(() => []);

    el.innerHTML = due.length ? `
      <div class="card">
        <h2>${due.length} élément${due.length > 1 ? 's' : ''} à réviser</h2>
        <p class="muted small">Le moteur de révision arrive en Phase 4.</p>
      </div>` : `
      <div class="card">
        <h2>Rien à réviser</h2>
        <p class="muted small">Les éléments étudiés réapparaîtront ici automatiquement,
          selon l\u2019algorithme de répétition espacée.</p>
        <a class="btn btn-ghost" href="#/modules">Voir les modules</a>
      </div>`;
  },

  unmount() {}
};
