/**
 * Accueil — où j'en suis, et quoi faire maintenant.
 *
 * L'écran répond à une seule question : par quoi je continue. Le tableau détaillé
 * vient après, une fois cette réponse donnée — un tableau de bord qui commence par
 * des statistiques laisse l'apprenant décider, ce qui est précisément l'effort
 * qu'on veut lui épargner.
 */

import { MODULES } from '../registry.js';
import * as progress from '../../core/progress.js';
import * as srs from '../../core/srs.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Étapes déclarées par chaque module. Les modules ouverts sur tout le Coran
 * (lecture, récitation, mémorisation, vocabulaire) n'ont pas de nombre d'étapes
 * fixe : leur avancement se mesure autrement, d'où l'absence d'entrée ici.
 */
const MODULE_STEPS = {
  '01-fondations': ['m1:lettres', 'm1:formes', 'm1:tashkil',
                    'm1:quiz-noms', 'm1:quiz-formes', 'm1:quiz-tashkil'],
  '02-makharij':   ['m2:zones', 'm2:points', 'm2:discrimination', 'm2:quiz']
};

const plural = (n, s = 's') => (n > 1 ? s : '');

export default {
  title: 'Apprendre l’arabe',

  async mount(el) {
    const cards = await srs.all();

    const stats = await Promise.all(MODULES.map(async (m) => {
      const steps = MODULE_STEPS[m.id];
      // `ratio: null` signale un module sans nombre d'étapes fixe : lecture,
      // récitation, mémorisation et vocabulaire portent sur tout le Coran, un
      // pourcentage n'y voudrait rien dire.
      return steps
        ? { m, ...(await progress.moduleProgress(steps)) }
        : { m, done: 0, total: 0, ratio: null };
    }));

    const dueCards = cards.filter((c) => c.due <= Date.now());
    const summary = srs.summarize(cards);

    // La suite proposée : le premier module non terminé, dans l'ordre du parcours.
    const next = stats.find((s) => s.ratio !== null && s.ratio < 1)?.m
      ?? MODULES.find((m) => m.phase >= 2)
      ?? MODULES[0];

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>Continuer</h2>
          <p class="muted small">Module ${next.n} — ${esc(next.subtitle)}</p>
          <a class="btn" href="#/m/${next.id}">${esc(next.title)}</a>
        </section>

        ${dueCards.length ? `
        <section class="card">
          <h2>À réviser</h2>
          <p class="muted small">${dueCards.length} carte${plural(dueCards.length)}
            arrive${plural(dueCards.length, 'nt')} à échéance.</p>
          <a class="btn" href="#/reviser">Réviser maintenant</a>
        </section>` : ''}

        <section class="card">
          <h2>Où j’en suis</h2>
          <div class="mod-progress">
            ${stats.map(({ m, ratio, done, total }) => `
              <a class="mod-line" href="#/m/${m.id}">
                <span class="mod-n">${m.n}</span>
                <span class="mod-name">${esc(m.title)}</span>
                ${ratio === null
                  ? '<span class="small muted mod-val">libre</span>'
                  : `<span class="progress mod-bar"><i style="width:${ratio * 100}%"></i></span>
                     <span class="small muted mod-val">${done}/${total}</span>`}
              </a>`).join('')}
          </div>
        </section>

        ${cards.length ? `
        <section class="card">
          <h2>Mémoire</h2>
          <div class="hifz-stats">
            <div><strong>${summary.known}</strong><span class="small muted">acquis</span></div>
            <div><strong>${summary.learning}</strong><span class="small muted">en cours</span></div>
            <div><strong>${summary.due}</strong><span class="small muted">à réviser</span></div>
          </div>
        </section>` : ''}

        <p class="small muted"><a href="#/sources">Sources et licences</a></p>
      </div>`;
  },

  unmount() {}
};
