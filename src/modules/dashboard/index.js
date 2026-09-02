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
import * as drill from '../../core/drill.js';
import * as lessons from '../../data-access/lessons.js';
import * as vocab from '../../data-access/vocab.js';

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

        <section class="card" id="couverture">
          <h2>Ce que tu as déjà travaillé</h2>
          <div class="loading">Calcul…</div>
        </section>

        <p class="small muted"><a href="#/sources">Sources et licences</a></p>
      </div>`;

    fillCoverage(el.querySelector('#couverture'));
  },

  unmount() {}
};

/**
 * Couverture du matériau, famille par famille.
 *
 * La barre de progression des modules dit si on a *ouvert* les écrans. Elle ne dit
 * rien du matériau : on peut avoir « fait » le quiz des lettres en n'ayant jamais
 * croisé que douze des vingt-neuf. Ce tableau-là compte les items réellement
 * rencontrés au moins une fois, et c'est lui qui montre ce qu'il reste.
 *
 * Il est rempli après le premier rendu : quatre fichiers de leçon suffisent à
 * retarder l'affichage de l'accueil, et l'accueil doit être immédiat.
 */
async function fillCoverage(host) {
  if (!host) return;

  const [alpha, mk, rules, cur, words] = await Promise.all([
    lessons.alphabet(), lessons.makharij(), lessons.tajweedRules(),
    lessons.curriculum(), vocab.glossed()
  ]);

  const syllables = cur.steps
    .filter((s) => s.kind === 'syllabes')
    .flatMap((s) => s.letters.flatMap((l) =>
      (cur.vowel_sets[s.vowels] ?? []).map((_, vi) => ({ id: `syll:${s.id}:${l}:${vi}` }))));

  // « hamza » est écartée des quiz du Module 1 : elle n'a pas de tracé propre.
  // La compter au dénominateur donnerait une couverture plafonnée à 28/29.
  const real = alpha.letters.filter((l) => l.id !== 'hamza');
  const per = (prefix, src = real) => src.map((l) => ({ id: `${prefix}:${l.id}` }));

  const families = [
    { label: 'Nom et son des lettres', href: '#/m/01-fondations/quiz/noms',
      items: per('noms') },
    { label: 'Les quatre formes', href: '#/m/01-fondations/quiz/formes',
      items: per('formes') },
    { label: 'Lettres vocalisées', href: '#/m/01-fondations/quiz/tashkil',
      items: per('tashkil') },
    // Le dénominateur vient des points d'articulation, pas de l'alphabet : le
    // quiz du Module 2 interroge les lettres telles que la carte les recense.
    { label: 'Points d’articulation', href: '#/m/02-makharij/quiz',
      items: [...new Set(mk.points.flatMap((p) => p.letters))].map((id) => ({ id: `makhraj:${id}` })) },
    { label: 'Syllabes du parcours', href: '#/m/04-lecture',
      items: syllables },
    { label: 'Règles de tajwîd', href: '#/m/03-tajweed/exercice',
      items: rules.rules.filter((r) => r.annotation).map((r) => ({ id: `rule:${r.id}` })) },
    { label: 'Mots traduits', href: '#/m/07-vocabulaire/quiz',
      items: words.map((w) => ({ id: `vocab:${w.id}` })) }
  ];

  const cov = await Promise.all(families.map((f) => drill.coverage(f.items)));

  host.innerHTML = `
    <h2>Ce que tu as déjà travaillé</h2>
    <p class="small muted">Le matériau rencontré au moins une fois en exercice —
      pas les écrans ouverts.</p>
    <div class="mod-progress">
      ${families.map((f, i) => `
        <a class="mod-line" href="${f.href}">
          <span class="mod-name">${esc(f.label)}</span>
          <span class="progress mod-bar"><i style="width:${cov[i].ratio * 100}%"></i></span>
          <span class="small muted mod-val">${cov[i].seen}/${cov[i].total}</span>
        </a>`).join('')}
    </div>`;
}
