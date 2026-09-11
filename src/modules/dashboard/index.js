/**
 * Accueil — où j'en suis, et quoi faire maintenant.
 *
 * L'écran répond à une seule question : par quoi je continue. Le tableau détaillé
 * vient après, une fois cette réponse donnée — un tableau de bord qui commence par
 * des statistiques laisse l'apprenant décider, ce qui est précisément l'effort
 * qu'on veut lui épargner.
 *
 * Mise en page « manuscrit » : un chapeau centré, le module en cours dans un
 * feuillet avec son médaillon, la série de la semaine, puis deux colonnes à
 * filets — le parcours (ce qui est ouvert) et le matériau (ce qui est su).
 */

import { MODULES } from '../registry.js';
import * as progress from '../../core/progress.js';
import * as srs from '../../core/srs.js';
import * as drill from '../../core/drill.js';
import * as activity from '../../core/activity.js';
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
const pct = (r) => `${Math.round(r * 100)} %`;

const DAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Ligne à filet : numéro, nom, filet de progression, valeur. */
const line = ({ href, n, name, ratio, val, brass = false }) => `
  <a class="mod-line" href="${href}">
    ${n != null ? `<span class="mod-n${ratio ? ' is-started' : ''}">${n}</span>` : ''}
    <span class="mod-name">${esc(name)}</span>
    ${ratio == null ? '' : `<span class="progress mod-bar${brass ? ' is-brass' : ''}">
      <i style="width:${ratio * 100}%"></i></span>`}
    <span class="small muted mod-val">${val}</span>
  </a>`;

export default {
  title: 'Apprendre l’arabe',

  async mount(el) {
    const [cards, week] = await Promise.all([srs.all(), activity.recent(7)]);

    const stats = await Promise.all(MODULES.map(async (m) => {
      const steps = MODULE_STEPS[m.id];
      // `ratio: null` signale un module sans nombre d'étapes fixe : lecture,
      // récitation, mémorisation et vocabulaire portent sur tout le Coran, un
      // pourcentage n'y voudrait rien dire.
      return steps
        ? { m, ...(await progress.moduleProgress(steps)) }
        : { m, done: 0, total: 0, ratio: null };
    }));

    const due = cards.filter((c) => c.due <= Date.now()).length;
    const summary = srs.summarize(cards);

    // La suite proposée : le premier module non terminé, dans l'ordre du parcours.
    const nextStat = stats.find((s) => s.ratio !== null && s.ratio < 1)
      ?? stats.find((s) => s.m.phase >= 2)
      ?? stats[0];
    const next = nextStat.m;
    const fresh = stats.every((s) => !s.done) && !week.total;

    // Le bouton secondaire sert ce qui presse : les révisions échues d'abord,
    // sinon un retour aux lettres, qui reste la base de tout le reste.
    const second = due
      ? `<a class="btn btn-ghost" href="#/reviser">Réviser · ${due}</a>`
      : `<a class="btn btn-ghost" href="#/m/01-fondations/lettres">Revoir les lettres</a>`;

    el.innerHTML = `
      <header class="page-head">
        <p class="page-date">${esc(DATE_FMT.format(new Date()))}</p>
        <p class="page-lede">${fresh ? 'Commence par les lettres.' : 'Reprends là où tu t’es arrêté.'}</p>
        <div class="fleuron" aria-hidden="true"><span>۞</span></div>
      </header>

      <section class="card card-framed hero">
        <div class="hero-glyph" aria-hidden="true"><span>${next.icon}</span></div>
        <div class="hero-body">
          <p class="eyebrow">Module ${next.n} · ${fresh ? 'pour commencer' : 'étape en cours'}</p>
          <h2>${esc(next.title)}</h2>
          <p class="muted">${esc(next.subtitle)}</p>
          <div class="hero-actions">
            <a class="btn" href="#/m/${next.id}">${fresh ? 'Commencer' : 'Continuer'}</a>
            ${second}
          </div>
        </div>
        ${nextStat.ratio != null ? `
        <div class="ring">
          <span class="ring-arc">${pct(nextStat.ratio)}</span>
          <span class="progress" style="width:56px"><i style="width:${nextStat.ratio * 100}%"></i></span>
          <span>du module</span>
        </div>` : ''}
      </section>

      <section class="streak" aria-label="Activité des sept derniers jours">
        <div>
          <p class="streak-line">${week.streak
            ? `${week.streak} jour${plural(week.streak)} d’affilée`
            : 'Aucune série en cours'}</p>
          <p class="small muted" style="margin:0">${cards.length
            ? `${summary.known} acquis · ${summary.learning} en cours · ${due} à réviser`
            : 'Un exercice par jour suffit à tenir la série.'}</p>
        </div>
        <div class="streak-days">
          ${week.days.map((d) => `
            <div class="streak-day" title="${esc(DATE_FMT.format(d.date))}${d.done ? ' — travaillé' : ''}">
              <span>${DAY_INITIALS[d.date.getDay()]}</span>
              <span class="streak-dot${d.done ? ' is-done' : ''}${d.today ? ' is-today' : ''}"></span>
            </div>`).join('')}
        </div>
      </section>

      <div class="home-cols">
        <section>
          <h3>Le parcours</h3>
          <p class="small muted">Sept modules, du tracé à la récitation.</p>
          <div class="mod-progress">
            ${stats.map(({ m, ratio, done, total }) => line({
              href: `#/m/${m.id}`, n: m.n, name: m.title, ratio,
              val: ratio === null ? 'libre' : `${done}/${total}`
            })).join('')}
          </div>
        </section>

        <section id="couverture">
          <h3>Ce que tu as travaillé</h3>
          <div class="loading">Calcul…</div>
        </section>
      </div>

      <p class="small muted home-foot">Progression stockée sur cet appareil seulement,
        sans compte. <a href="#/sources">Sources et licences</a></p>`;

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
 *
 * Ses filets sont en laiton, ceux du parcours en jade : les deux colonnes
 * mesurent deux choses différentes, la couleur le dit avant le titre.
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
    <h3>Ce que tu as travaillé</h3>
    <p class="small muted">Le matériau rencontré en exercice — pas les écrans ouverts.</p>
    <div class="mod-progress">
      ${families.map((f, i) => line({
        href: f.href, name: f.label, ratio: cov[i].ratio, brass: true,
        val: `${cov[i].seen}/${cov[i].total}`
      })).join('')}
    </div>`;
}
