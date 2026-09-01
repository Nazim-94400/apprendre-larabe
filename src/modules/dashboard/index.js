import { MODULES } from '../registry.js';
import { db } from '../../core/db.js';

const plural = (n, s = 's') => (n > 1 ? s : '');

/** Accueil : où j'en suis, et quoi faire maintenant. */
export default {
  title: 'Apprendre l\u2019arabe',

  async mount(el) {
    const progress = await db.getAll('progress').catch(() => []);
    const done = progress.filter((p) => p?.status === 'done').length;
    const due = await db.upTo('srs', 'due', Date.now()).catch(() => []);
    const next = MODULES.find((m) => m.state !== 'done') || MODULES[0];

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>Où j\u2019en suis</h2>
          <p class="muted small">${done} étape${plural(done)} terminée${plural(done)}
            sur l\u2019ensemble du parcours.</p>
          <div class="progress" role="progressbar"
               aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="100">
            <i style="width:${Math.min(100, done)}%"></i>
          </div>
        </section>

        <section class="card">
          <h2>Continuer</h2>
          <p class="muted small">Module ${next.n} \u2014 ${next.subtitle}</p>
          <a class="btn" href="#/m/${next.id}">${next.title}</a>
        </section>

        <section class="card">
          <h2>À réviser</h2>
          <p class="muted small">${due.length} élément${plural(due.length)}
            arrive${plural(due.length, 'nt')} à échéance aujourd\u2019hui.</p>
          <a class="btn ${due.length ? '' : 'btn-ghost'}" href="#/reviser">Réviser</a>
        </section>

        <p class="small muted"><a href="#/sources">Sources et licences</a></p>
      </div>`;
  },

  unmount() {}
};
