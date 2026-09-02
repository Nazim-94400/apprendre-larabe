/**
 * Module 7 — Vocabulaire coranique.
 *
 * Les 500 mots les plus fréquents couvrent 58 % du texte. En comprendre une
 * fraction change complètement l'écoute d'une récitation : on cesse d'entendre
 * une suite de sons pour reconnaître des mots.
 *
 * Les quiz portent sur de vrais versets, jamais sur des phrases fabriquées : un
 * mot appris dans son contexte coranique se reconnaît ensuite à la lecture, ce
 * qui est précisément le but.
 */

import * as vocab from '../../data-access/vocab.js';
import * as quran from '../../data-access/quran.js';
import * as srs from '../../core/srs.js';
import * as progress from '../../core/progress.js';
import { render, tokenize } from '../../data-access/tajweed.js';
import { quiz } from '../../ui/components/quiz.js';

const M = '07-vocabulaire';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const THEME_LABELS = {
  'nom-divin': 'Noms divins', foi: 'Religion, foi et actes', creation: 'La création',
  personne: 'Personnes', verbe: 'Verbes', temps: 'Temps', lieu: 'Lieu',
  particule: 'Particules', pronom: 'Pronoms', autre: 'Divers'
};

const cardId = (id) => `vocab:${id}`;

/* ─────────────────────────── accueil ─────────────────────────── */

async function screenIndex(el) {
  const [data, words, cards] = await Promise.all([
    vocab.load(), vocab.glossed(), srs.all('vocab:')
  ]);
  const st = srs.summarize(cards);
  const byTheme = new Map();
  for (const w of words) {
    if (!byTheme.has(w.theme)) byTheme.set(w.theme, []);
    byTheme.get(w.theme).push(w);
  }

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Vocabulaire coranique</h2>
        <p class="muted small">${data._meta.listed} mots classés par fréquence, comptés
          directement dans le texte. Les ${data.words.length} premiers couvrent
          ${data.words.at(-1).cumulative_pct} % de tous les mots du Coran.</p>
        <div class="hifz-stats">
          <div><strong>${st.known}</strong><span class="small muted">acquis</span></div>
          <div><strong>${st.learning}</strong><span class="small muted">en cours</span></div>
          <div><strong>${data._meta.with_gloss}</strong><span class="small muted">traduits</span></div>
        </div>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
          <a class="btn" href="${link('quiz')}">Quiz sur versets</a>
          <a class="btn btn-ghost" href="${link('liste')}">Toute la liste</a>
        </div>
      </section>

      ${[...byTheme].sort((a, b) => b[1].length - a[1].length).map(([theme, ws]) => `
        <section class="card">
          <h3 style="margin-bottom:var(--sp-2)">${esc(THEME_LABELS[theme] ?? theme)}
            <span class="small muted">${ws.length} mots</span></h3>
          <div class="vocab-row">
            ${ws.slice(0, 12).map((w) => `
              <a class="vocab-chip" href="${link('mot/' + encodeURIComponent(w.id))}">
                <span class="ar ar-quran">${w.form}</span>
                <span class="small muted">${esc(w.fr.split(/[;,]/)[0])}</span>
              </a>`).join('')}
          </div>
          ${ws.length > 12 ? `<p class="small muted" style="margin:var(--sp-2) 0 0">
            et ${ws.length - 12} autres</p>` : ''}
        </section>`).join('')}

      <p class="small muted">Les traductions sont rédigées pour ce projet et restent
        à faire relire. Les nombres d'occurrences, eux, sont comptés sur le texte.</p>
    </div>`;
}

async function screenListe(el) {
  const { words } = await vocab.load();
  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Les 500 mots les plus fréquents</h2>
        <p class="small muted">Classés par nombre d'occurrences. Un mot sans
          traduction reste listé mais n'apparaît pas dans les quiz.</p>
      </section>
      <section class="card">
        <table class="vocab-table"><tbody>
          ${words.map((w) => `<tr>
            <td class="small muted">${w.rank}</td>
            <td class="ar ar-quran">${w.fr
              ? `<a href="${link('mot/' + encodeURIComponent(w.id))}">${w.form}</a>`
              : w.form}</td>
            <td class="small">${w.fr ? esc(w.fr) : '<span class="muted">—</span>'}</td>
            <td class="small muted">${w.occurrences}</td>
          </tr>`).join('')}
        </tbody></table>
      </section>
    </div>`;
}

/* ─────────────────────────── fiche mot ─────────────────────────── */

async function screenMot(el, rawId) {
  const id = decodeURIComponent(rawId);
  const w = await vocab.byId(id);
  if (!w) { el.innerHTML = '<div class="card"><p>Mot inconnu.</p></div>'; return; }

  const card = await srs.get(cardId(id));

  el.innerHTML = `
    <div class="stack">
      <section class="card" style="text-align:center">
        <p class="ar ar-quran" style="font-size:calc(3rem * var(--text-scale));margin:0">${w.form}</p>
        <h2 style="margin:var(--sp-3) 0 var(--sp-1)">${esc(w.fr ?? '')}</h2>
        ${w.root ? `<p class="small muted">Racine <span class="ar-inline">${w.root}</span></p>` : ''}
        <p class="small muted">${w.occurrences} occurrences —
          ${w.rank}<sup>e</sup> mot le plus fréquent du Coran</p>
        ${w.theme ? `<span class="badge">${esc(THEME_LABELS[w.theme] ?? w.theme)}</span>` : ''}
      </section>

      <section class="card" id="examples">
        <h3>Dans le texte</h3><div class="loading">Chargement…</div>
      </section>

      <section class="card">
        <h3>Révision</h3>
        <p class="small muted">${card
          ? `Vu ${card.reps} fois. Prochain rappel dans ${card.interval} jour${card.interval > 1 ? 's' : ''}.`
          : 'Ce mot n’est pas encore dans tes révisions.'}</p>
        <div class="grade-row">
          ${srs.GRADES.map((g) => `<button class="grade g-${g.key}" type="button" data-grade="${g.id}">
            <strong>${g.label}</strong>
            <span class="small muted">${srs.nextLabel(card, g.id)}</span></button>`).join('')}
        </div>
      </section>

      <nav class="pager">
        <a class="btn btn-ghost" href="${link('')}">Thèmes</a>
        <a class="btn btn-ghost" href="${link('liste')}">La liste</a>
        <a class="btn" href="${link('quiz')}">Quiz</a>
      </nav>
    </div>`;

  for (const b of el.querySelectorAll('.grade')) {
    b.addEventListener('click', async () => {
      await srs.review(cardId(id), Number(b.dataset.grade));
      b.closest('.card').querySelector('p.small').textContent = 'Enregistré.';
    });
  }

  // Exemples : de vrais versets, avec le mot mis en évidence.
  const host = el.querySelector('#examples');
  const blocks = await Promise.all(w.examples.map(async (key) => {
    const [s] = key.split(':');
    const [v, rules, meta] = await Promise.all([
      quran.ayah(key), quran.tajweed(s), quran.surah(s)
    ]);
    const hits = vocab.findInVerse(v.text, id);
    const html = render(v.text, rules.get(key) ?? []);
    return { key, html, hits, name: meta.name_fr };
  }));

  host.innerHTML = '<h3>Dans le texte</h3>' + blocks.map((b) => `
    <div class="example">
      <p class="ar ar-quran vocab-example" data-hits="${[...b.hits].join(',')}">${b.html}</p>
      <p class="small muted" style="margin:0">${esc(b.name)}
        <span class="ref">${esc(b.key)}</span></p>
    </div>`).join('');

  for (const p of host.querySelectorAll('.vocab-example')) {
    for (const i of p.dataset.hits.split(',').filter(Boolean)) {
      p.querySelector(`.w[data-w="${i}"]`)?.classList.add('w-vocab');
    }
  }
}

/* ─────────────────────────── quiz ─────────────────────────── */

async function screenQuiz(el) {
  const words = await vocab.glossed();
  const pool = [...words].sort(() => Math.random() - 0.5).slice(0, 12);

  const questions = await Promise.all(pool.map(async (w) => {
    const key = w.examples[0];
    const [s] = key.split(':');
    const [v, rules] = await Promise.all([quran.ayah(key), quran.tajweed(s)]);
    const hits = vocab.findInVerse(v.text, w.id);

    // Le verset est rendu puis le mot cible souligné : la question porte sur un
    // emploi réel, pas sur le mot isolé de tout contexte.
    const tmp = document.createElement('div');
    tmp.innerHTML = render(v.text, rules.get(key) ?? []);
    for (const i of hits) tmp.querySelector(`.w[data-w="${i}"]`)?.classList.add('w-vocab');

    const wrong = [...words]
      .filter((x) => x.id !== w.id && x.theme === w.theme)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    while (wrong.length < 3) {
      const c = words[Math.floor(Math.random() * words.length)];
      if (c.id !== w.id && !wrong.includes(c)) wrong.push(c);
    }

    return {
      id: w.id,
      prompt: `<p class="quiz-q">Que signifie le mot souligné ?</p>
               <p class="ar ar-quran">${tmp.innerHTML}</p>`,
      aside: `${esc(key)} — ${w.occurrences} occurrences dans le Coran`,
      choices: [w, ...wrong].map((c) => ({ id: c.id, label: esc(c.fr) })),
      answer: w.id,
      hint: w.root ? `Racine <span class="ar-inline">${w.root}</span>.` : ''
    };
  }));

  const host = document.createElement('div');
  el.innerHTML = '';
  el.append(host);

  quiz(host, {
    questions,
    onFinish: async ({ score, wrong }) => {
      await progress.record('m7:quiz', { score });
      // Les mots ratés entrent en révision, les autres progressent.
      for (const q of questions) {
        await srs.review(cardId(q.id), wrong.includes(q.id) ? 0 : 2);
      }
    }
  });
}

export default {
  title: 'Vocabulaire coranique',

  async mount(el, { path = '' } = {}) {
    const [head, arg] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 'liste') return screenListe(el);
    if (head === 'mot') return screenMot(el, arg);
    if (head === 'quiz') return screenQuiz(el);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() {}
};
