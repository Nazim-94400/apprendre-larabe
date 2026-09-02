/**
 * Module 2 — Makhârij al-Hurûf : où se forme chaque son.
 *
 * L'enjeu n'est pas de mémoriser dix-sept noms arabes, mais de sentir la différence
 * entre deux lettres qu'un francophone entend identiques. Les exercices sont donc
 * bâtis sur des paires : ص contre س, ط contre ت, ق contre ك.
 */

import * as lessons from '../../data-access/lessons.js';
import * as progress from '../../core/progress.js';
import { quiz } from '../../ui/components/quiz.js';
import { diagram } from './diagram.js';
import { wireListen, stopListening } from '../../ui/components/listen.js';

const M = '02-makharij';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STEPS = [
  { id: 'm2:zones', route: 'zones', title: 'Les cinq zones',
    desc: 'Cavité, gorge, langue, lèvres, fosses nasales.' },
  { id: 'm2:points', route: 'points', title: 'Les dix-sept points',
    desc: 'Chaque point d’articulation et les lettres qui en sortent.' },
  { id: 'm2:discrimination', route: 'discrimination', title: 'Distinguer les lettres proches',
    desc: 'ح/ه, ص/س, ذ/ز/ظ, ط/ت, ق/ك — les confusions classiques.' },
  { id: 'm2:quiz', route: 'quiz', title: 'Quiz — situer les sons',
    desc: 'Retrouver le point d’articulation d’une lettre.' }
];

/* ─────────────────────────── écrans ─────────────────────────── */

async function screenIndex(el) {
  const states = await Promise.all(STEPS.map((s) => progress.get(s.id)));
  const { ratio } = await progress.moduleProgress(STEPS.map((s) => s.id));

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Makhârij al-Hurûf</h2>
        <p class="muted small">Deux lettres peuvent sembler identiques à une oreille
          francophone et sortir de deux endroits différents de la bouche. Savoir
          <em>où</em> se forme un son est ce qui permet de le corriger.</p>
        <div class="progress" style="margin-top:var(--sp-3)"><i style="width:${ratio * 100}%"></i></div>
      </section>

      <div class="grid">
        ${STEPS.map((s, i) => {
          const p = states[i];
          const badge = p?.status === 'done'
            ? '<span class="badge badge-done">Acquis</span>'
            : p?.status === 'wip'
              ? '<span class="badge badge-active">En cours</span>'
              : '<span class="badge badge-locked">À faire</span>';
          return `<a class="card card-link" href="${link(s.route)}">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <span style="flex:1"><strong>${s.title}</strong><br>
                <span class="small muted">${s.desc}</span></span>${badge}
            </div></a>`;
        }).join('')}
      </div>
    </div>`;
}

async function screenZones(el) {
  const mk = await lessons.makharij();
  const idx = await lessons.letterIndex();

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Les cinq zones</h2>
        <p class="small muted">Touche une zone du schéma pour la mettre en avant.
          Lèvres à gauche, gorge à droite — la convention des manuels de tajwîd.</p>
        <div id="dia">${diagram()}</div>
      </section>

      <div class="grid" id="zones">
        ${mk.zones.map((z) => {
          const pts = mk.points.filter((p) => p.zone === z.id);
          const letters = [...new Set(pts.flatMap((p) => p.letters))];
          return `<section class="card zone-card" data-zone="${z.id}" tabindex="0">
            <h3 style="margin-bottom:var(--sp-1)">${esc(z.name_fr)}
              <span class="ar-inline">${z.name_ar}</span></h3>
            <p class="small muted">${esc(z.desc)}</p>
            <p class="small muted">${pts.length} point${pts.length > 1 ? 's' : ''} —
              ${letters.length} lettre${letters.length > 1 ? 's' : ''}</p>
            <p class="ar" style="font-size:var(--fs-ar);margin:0">
              ${letters.map((id) => idx.get(id)?.forms.isolated ?? '').join(' ')}</p>
          </section>`;
        }).join('')}
      </div>

      <button class="btn" type="button" id="mark">J’ai vu les cinq zones</button>
    </div>`;

  const dia = el.querySelector('#dia');
  const highlight = (zone) => { dia.innerHTML = diagram(zone); };

  for (const card of el.querySelectorAll('.zone-card')) {
    const z = card.dataset.zone;
    card.addEventListener('mouseenter', () => highlight(z));
    card.addEventListener('focus', () => highlight(z));
    card.addEventListener('click', () => highlight(z));
  }
  dia.addEventListener('click', (e) => {
    const g = e.target.closest('[data-zone]');
    if (g) highlight(g.dataset.zone);
  });

  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m2:zones', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenPoints(el) {
  const mk = await lessons.makharij();
  const idx = await lessons.letterIndex();

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Les dix-sept points</h2>
        <p class="small muted">Du plus profond au plus avancé. Les lettres d’un même
          point ne se distinguent que par la voix, le souffle ou l’épaisseur.</p>
      </section>

      ${mk.zones.map((z) => `
        <section>
          <h3 style="margin:var(--sp-4) 0 var(--sp-2)">${esc(z.name_fr)}
            <span class="ar-inline">${z.name_ar}</span></h3>
          <div class="grid">
            ${mk.points.filter((p) => p.zone === z.id).map((p) => `
              <a class="card card-link" href="${link('point/' + p.id)}">
                <div style="display:flex;gap:var(--sp-3);align-items:center">
                  <span class="point-no">${p.order}</span>
                  <span style="flex:1"><strong>${esc(p.name_fr)}</strong><br>
                    <span class="small muted">${esc(p.desc)}</span></span>
                  <span class="ar" style="font-size:var(--fs-ar)">
                    ${p.letters.map((id) => idx.get(id)?.forms.isolated ?? '').join(' ')}</span>
                </div>
              </a>`).join('')}
          </div>
        </section>`).join('')}

      <button class="btn" type="button" id="mark">J’ai parcouru les dix-sept points</button>
    </div>`;

  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m2:points', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenPoint(el, id) {
  const mk = await lessons.makharij();
  const idx = await lessons.letterIndex();
  const p = mk.points.find((x) => x.id === id);
  if (!p) { el.innerHTML = '<div class="card"><p>Point inconnu.</p></div>'; return; }

  const z = mk.zones.find((x) => x.id === p.zone);
  const i = mk.points.findIndex((x) => x.id === id);
  const prev = mk.points[i - 1], next = mk.points[i + 1];

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <p class="small muted" style="margin-bottom:var(--sp-1)">
          Point ${p.order} sur 17 — ${esc(z?.name_fr ?? '')}</p>
        <h2 style="margin-bottom:var(--sp-1)">${esc(p.name_fr)}</h2>
        <p class="ar-inline" style="font-size:1.3em">${p.name_ar}</p>
        ${diagram(p.zone, p.id)}
      </section>

      <section class="card">
        <h3>Comment ça se forme</h3>
        <p>${esc(p.desc)}</p>
        <p class="small cue">${esc(p.cue)}</p>
      </section>

      <section class="card">
        <h3>Les lettres de ce point</h3>
        <div class="forms-row">
          ${p.letters.map((lid) => {
            const l = idx.get(lid);
            return l ? `<a class="form-cell speak-or-open" href="#/m/01-fondations/lettre/${l.id}">
              <span class="ar ar-letter">${l.forms.isolated}</span>
              <span class="small muted">${esc(l.name_fr)}</span></a>` : '';
          }).join('')}
        </div>
        <p class="small muted" style="margin-top:var(--sp-3)">
          Touche une lettre pour ouvrir sa fiche complète.</p>
      </section>

      <nav class="pager">
        ${prev ? `<a class="btn btn-ghost" href="${link('point/' + prev.id)}">← ${prev.order}</a>` : '<span></span>'}
        <a class="btn btn-ghost" href="${link('points')}">Tous les points</a>
        ${next ? `<a class="btn btn-ghost" href="${link('point/' + next.id)}">${next.order} →</a>` : '<span></span>'}
      </nav>
    </div>`;
}

async function screenDiscrimination(el) {
  const mk = await lessons.makharij();
  const idx = await lessons.letterIndex();

  const card = (ex) => {
    const ids = ex.pair ?? ex.trio;
    const ls = ids.map((i) => idx.get(i)).filter(Boolean);
    return `
      <section class="card">
        <div class="pair-row">
          ${ls.map((l) => `
            <button class="pair-cell listen" type="button" data-letter="${l.id}" data-mark="" data-text="${l.name_ar}">
              <span class="ar ar-letter">${l.forms.isolated}</span>
              <span class="small muted">${esc(l.name_fr)}</span>
              <span class="small pair-mk">${esc(mk.points.find((p) => p.letters.includes(l.id))?.name_fr ?? '')}</span>
            </button>`).join('<span class="pair-vs">contre</span>')}
        </div>
        <p class="small cue">${esc(ex.hint)}</p>
      </section>`;
  };

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Distinguer les lettres proches</h2>
        <p class="small muted">Prononce les deux lettres l’une après l’autre en gardant
          la même voyelle. Si ta bouche ne bouge pas entre les deux, c’est que tu les
          prononces identiques — et c’est précisément ce qu’il faut corriger.</p>
        <p class="small muted">Les boutons d’écoute se désactivent d’eux-mêmes
          quand aucun enregistrement n’existe pour la lettre. Les indications
          d’articulation, elles, suffisent à travailler devant un miroir.</p>
      </section>

      ${[1, 2, 3].map((lvl) => {
        const items = mk.exercices_discrimination.filter((e) => e.level === lvl);
        if (!items.length) return '';
        return `<h3 style="margin:var(--sp-4) 0 var(--sp-2)">Niveau ${lvl}</h3>
                ${items.map(card).join('')}`;
      }).join('')}

      <button class="btn" type="button" id="mark">J’ai travaillé les paires</button>
    </div>`;

  wireSpeak(el);
  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m2:discrimination', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenQuiz(el) {
  const mk = await lessons.makharij();
  const idx = await lessons.letterIndex();

  // On interroge sur la zone plutôt que sur le point exact : c'est le niveau utile
  // pour corriger sa prononciation, et cela reste jouable après une seule lecture.
  const pool = mk.points.flatMap((p) => p.letters.map((lid) => ({ lid, point: p })));
  const seen = new Set();
  const picks = [];
  for (const item of pool.sort(() => Math.random() - 0.5)) {
    if (seen.has(item.lid)) continue;
    seen.add(item.lid);
    picks.push(item);
    if (picks.length === 12) break;
  }

  const questions = picks.map(({ lid, point }) => {
    const l = idx.get(lid);
    const good = mk.zones.find((z) => z.id === point.zone);
    return {
      id: lid,
      prompt: `<p class="quiz-q">De quelle zone sort cette lettre ?</p>
               <p class="ar ar-huge">${l.forms.isolated}</p>`,
      aside: esc(l.name_fr),
      choices: mk.zones.map((z) => ({ id: z.id, label: esc(z.name_fr) })),
      answer: good.id,
      hint: `${esc(point.name_fr)} — ${esc(point.cue)}`
    };
  });

  const host = document.createElement('div');
  el.innerHTML = '';
  el.append(host);
  quiz(host, { questions, onFinish: ({ score }) => progress.record('m2:quiz', { score }) });
}

/* ─────────────────────────── utilitaires ─────────────────────────── */

// Les boutons passent par la chaîne enregistrement → Coran → synthèse et se
// désactivent quand aucune source n'existe pour la lettre.
const wireSpeak = (el) => wireListen(el);

export default {
  title: 'Makhârij al-Hurûf',

  async mount(el, { path = '' } = {}) {
    const [head, arg] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 'zones') return screenZones(el);
    if (head === 'points') return screenPoints(el);
    if (head === 'point') return screenPoint(el, arg);
    if (head === 'discrimination') return screenDiscrimination(el);
    if (head === 'quiz') return screenQuiz(el);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() { stopListening(); }
};
