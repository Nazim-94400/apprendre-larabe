/**
 * Module 6 — Mémorisation (hifz).
 *
 * Le masquage progressif suit ce que font les mémorisateurs sans y penser : lire,
 * puis relire en cachant un mot sur quatre, puis la moitié, puis tout. Chaque
 * palier oblige à reconstruire un peu plus de mémoire, sans jamais partir de rien.
 *
 * La révision s'appuie sur le moteur de répétition espacée commun (core/srs.js) :
 * ce sont les mêmes cartes que celles des lettres et des règles, donc un seul
 * écran « Réviser » suffit à tout couvrir.
 */

import * as quran from '../../data-access/quran.js';
import * as srs from '../../core/srs.js';
import { render, tokenize } from '../../data-access/tajweed.js';
import { createPlayer } from '../../core/audio-player.js';
import { store } from '../../core/store.js';

const M = '06-hifz';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Juz 'Amma : les sourates par lesquelles on commence, de la plus courte. */
const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 114 - i);

const LEVELS = [
  { hide: 0,    label: 'Lecture',       desc: 'Tout est visible. Lis à voix haute, plusieurs fois.' },
  { hide: 0.25, label: 'Un mot sur 4',  desc: 'Retrouve les mots masqués sans regarder.' },
  { hide: 0.5,  label: 'La moitié',     desc: 'La structure tient encore, la mémoire fait le reste.' },
  { hide: 0.75, label: 'Trois sur 4',   desc: 'Il ne reste que des jalons.' },
  { hide: 1,    label: 'De mémoire',    desc: 'Récite entièrement, puis dévoile pour vérifier.' }
];

let player = null;

/* ─────────────────────────── accueil ─────────────────────────── */

async function screenIndex(el) {
  const [list, cards] = await Promise.all([quran.surahs(), srs.all()]);

  // Une carte de verset a pour identifiant « s:a » — les autres cartes (lettres,
  // règles, vocabulaire) portent un préfixe, on les écarte par ce test.
  const verseCards = cards.filter((c) => /^\d+:\d+$/.test(c.id));
  const bySurah = new Map();
  for (const c of verseCards) {
    const s = Number(String(c.id).split(':')[0]);
    if (!bySurah.has(s)) bySurah.set(s, []);
    bySurah.get(s).push(c);
  }

  const global = srs.summarize(verseCards);

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Mémorisation</h2>
        <p class="muted small">Chaque verset devient une carte. Elle revient à
          intervalles croissants tant que tu la retrouves, et beaucoup plus tôt dès
          que tu hésites.</p>
        <div class="hifz-stats">
          <div><strong>${global.known}</strong><span class="small muted">acquis</span></div>
          <div><strong>${global.learning}</strong><span class="small muted">en cours</span></div>
          <div><strong>${global.due}</strong><span class="small muted">à réviser</span></div>
        </div>
        ${global.due ? `<a class="btn" href="${link('reviser')}"
           style="margin-top:var(--sp-3)">Réviser maintenant</a>` : ''}
      </section>

      <h3 style="margin:var(--sp-4) 0 var(--sp-2)">Juz 'Amma</h3>
      <p class="small muted" style="margin-bottom:var(--sp-3)">Les sourates les plus
        courtes, celles par lesquelles commence toute mémorisation.</p>
      <div class="grid">
        ${JUZ_AMMA.map((id) => {
          const meta = list.find((s) => s.id === id);
          const cs = bySurah.get(id) ?? [];
          const st = srs.summarize(cs);
          const pct = meta.ayah_count ? Math.round((st.known / meta.ayah_count) * 100) : 0;
          return `<a class="card card-link" href="${link('sourate/' + id)}">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <span class="point-no">${id}</span>
              <span style="flex:1">
                <strong>${esc(meta.name_translit)}</strong>
                <span class="small muted">— ${esc(meta.name_fr)}</span><br>
                <span class="small muted">${meta.ayah_count} versets</span>
                ${st.due ? `<span class="badge badge-active">${st.due} à réviser</span>` : ''}
              </span>
              <span class="hifz-ring" style="--pct:${pct}">
                <span class="small">${pct}%</span></span>
            </div></a>`;
        }).join('')}
      </div>
    </div>`;
}

/* ─────────────────────────── une sourate ─────────────────────────── */

async function screenSourate(el, surahArg) {
  const id = Number(surahArg);
  const [meta, verses, rules] = await Promise.all([
    quran.surah(id), quran.ayahs(id), quran.tajweed(id)
  ]);
  const cards = new Map((await srs.all()).map((c) => [c.id, c]));
  const now = Date.now();

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>${esc(meta.name_fr)} <span class="ar-inline">${meta.name_ar}</span></h2>
        <p class="small muted">${meta.ayah_count} versets — sourate ${esc(meta.revelation)}</p>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
          <a class="btn" href="${link('memoriser/' + id)}">Mémoriser la sourate</a>
          <a class="btn btn-ghost" href="#/m/04-lecture/lire/${id}">Écouter en lecture guidée</a>
        </div>
      </section>

      <div class="grid">
        ${verses.map((v) => {
          const c = cards.get(v.key);
          const state = !c ? '<span class="badge badge-locked">Non commencé</span>'
            : c.due <= now ? '<span class="badge badge-active">À réviser</span>'
            : c.interval >= 21 ? '<span class="badge badge-done">Acquis</span>'
            : `<span class="badge">Revoir dans ${c.interval} j</span>`;
          return `<section class="card">
            <div style="display:flex;gap:var(--sp-3);align-items:flex-start">
              <span class="ayah-n">${v.n}</span>
              <p class="ar ar-quran" style="flex:1;margin:0">${render(v.text, rules.get(v.key) ?? [], { words: false })}</p>
            </div>
            <div style="display:flex;gap:var(--sp-2);align-items:center;margin-top:var(--sp-2)">
              ${state}
              <a class="btn btn-ghost small-btn" href="${link('memoriser/' + id + '/' + v.n)}">Travailler</a>
            </div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
}

/* ─────────────────────────── masquage progressif ─────────────────────────── */

/**
 * Choisit les mots à masquer. Le tirage est déterministe pour un verset et un
 * palier donnés : revenir sur l'écran ne doit pas changer les mots cachés, sinon
 * l'apprenant ne peut pas s'appuyer sur ce qu'il vient de voir.
 */
function pickHidden(count, ratio, seed) {
  if (ratio >= 1) return new Set(Array.from({ length: count }, (_, i) => i + 1));
  const n = Math.round(count * ratio);
  const order = Array.from({ length: count }, (_, i) => i + 1);
  let s = seed;
  for (let i = order.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, n));
}

async function screenMemoriser(el, surahArg, ayahArg) {
  const id = Number(surahArg);
  const [meta, verses, rules] = await Promise.all([
    quran.surah(id), quran.ayahs(id), quran.tajweed(id)
  ]);

  const start = ayahArg ? verses.findIndex((v) => v.n === Number(ayahArg)) : 0;
  let vi = Math.max(0, start);
  let level = 0;

  const prefs = store.get();
  player = createPlayer({});
  await player.setQueue(verses.map((v) => v.key),
    { reciterId: prefs.reciter || 'husary_muallim', start: vi });

  async function draw() {
    const v = verses[vi];
    const card = await srs.get(v.key);
    const lv = LEVELS[level];
    const words = tokenize(v.text).filter((t) => t.word);
    const hidden = pickHidden(words.length, lv.hide, v.n * 7919 + level);

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <p class="small muted" style="margin-bottom:var(--sp-1)">
            ${esc(meta.name_fr)} <span class="ref">${esc(v.key)}</span>
            — verset ${vi + 1} sur ${verses.length}</p>
          <div class="hifz-levels">
            ${LEVELS.map((l, i) => `<button class="hifz-level${i === level ? ' is-on' : ''}"
              type="button" data-level="${i}">${esc(l.label)}</button>`).join('')}
          </div>
          <p class="small muted">${esc(lv.desc)}</p>
        </section>

        <section class="card">
          <p class="ar ar-quran hifz-verse">${render(v.text, rules.get(v.key) ?? [])}</p>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
            <button class="btn btn-ghost" type="button" id="play">Écouter</button>
            <button class="btn btn-ghost" type="button" id="reveal">Tout dévoiler</button>
          </div>
        </section>

        <section class="card">
          <h3>Comment ça s’est passé ?</h3>
          <p class="small muted">Ta réponse règle la date du prochain rappel.</p>
          <div class="grade-row">
            ${srs.GRADES.map((g) => `
              <button class="grade g-${g.key}" type="button" data-grade="${g.id}">
                <strong>${g.label}</strong>
                <span class="small muted">${srs.nextLabel(card, g.id)}</span>
              </button>`).join('')}
          </div>
        </section>

        <nav class="pager">
          <button class="btn btn-ghost" type="button" id="prev"${vi === 0 ? ' disabled' : ''}>← Précédent</button>
          <a class="btn btn-ghost" href="${link('sourate/' + id)}">La sourate</a>
          <button class="btn btn-ghost" type="button" id="next"${vi === verses.length - 1 ? ' disabled' : ''}>Suivant →</button>
        </nav>
      </div>`;

    // Masquage appliqué après le rendu : on garde le HTML coloré intact et on se
    // contente d'ajouter une classe, ce qui permet de dévoiler sans re-rendre.
    const verseEl = el.querySelector('.hifz-verse');
    for (const w of verseEl.querySelectorAll('.w')) {
      if (hidden.has(Number(w.dataset.w))) w.classList.add('w-hidden');
    }
    verseEl.addEventListener('click', (e) => {
      const w = e.target.closest('.w-hidden');
      if (w) w.classList.remove('w-hidden');
    });

    el.querySelector('#reveal').addEventListener('click', () => {
      for (const w of verseEl.querySelectorAll('.w-hidden')) w.classList.remove('w-hidden');
    });
    el.querySelector('#play').addEventListener('click', async () => {
      await player.goto(vi);
      player.play();
    });

    for (const b of el.querySelectorAll('.hifz-level')) {
      b.addEventListener('click', () => { level = Number(b.dataset.level); draw(); });
    }
    for (const b of el.querySelectorAll('.grade')) {
      b.addEventListener('click', async () => {
        await srs.review(v.key, Number(b.dataset.grade));
        // Une note « correct » ou « facile » fait monter d'un palier ; un oubli
        // redescend. Le rythme suit ainsi la mémoire réelle plutôt qu'un compteur.
        if (Number(b.dataset.grade) >= 2 && level < LEVELS.length - 1) level++;
        else if (Number(b.dataset.grade) === 0 && level > 0) level--;
        draw();
      });
    }
    el.querySelector('#prev').addEventListener('click', () => { if (vi > 0) { vi--; level = 0; draw(); } });
    el.querySelector('#next').addEventListener('click', () => {
      if (vi < verses.length - 1) { vi++; level = 0; draw(); }
    });
  }

  await draw();
}

/* ─────────────────────────── révision ─────────────────────────── */

async function screenReviser(el) {
  const cards = (await srs.due()).filter((c) => /^\d+:\d+$/.test(c.id));

  if (!cards.length) {
    el.innerHTML = `<div class="card"><h2>Rien à réviser</h2>
      <p class="small muted">Les versets travaillés reviendront ici d’eux-mêmes.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour</a></div>`;
    return;
  }

  let i = 0;
  let revealed = false;

  async function draw() {
    if (i >= cards.length) {
      el.innerHTML = `<div class="card"><h2>Séance terminée</h2>
        <p class="small muted">${cards.length} verset${cards.length > 1 ? 's' : ''} révisé${cards.length > 1 ? 's' : ''}.</p>
        <a class="btn" href="${link('')}">Retour</a></div>`;
      return;
    }

    const key = cards[i].id;
    const [s] = key.split(':');
    const [v, meta, rules] = await Promise.all([
      quran.ayah(key), quran.surah(s), quran.tajweed(s)
    ]);

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <header class="quiz-head">
            <span class="small muted">${i + 1} / ${cards.length}</span>
            <div class="progress" style="flex:1"><i style="width:${(i / cards.length) * 100}%"></i></div>
          </header>
          <p class="small muted">${esc(meta.name_fr)} <span class="ref">${esc(key)}</span></p>
          <p class="ar ar-quran hifz-verse ${revealed ? '' : 'all-hidden'}">
            ${render(v.text, rules.get(key) ?? [])}</p>
          ${revealed ? '' : `<p class="small muted">Récite de mémoire, puis dévoile.</p>
            <button class="btn" type="button" id="show">Dévoiler</button>`}
        </section>

        ${revealed ? `<section class="card">
          <h3>Comment ça s’est passé ?</h3>
          <div class="grade-row">
            ${srs.GRADES.map((g) => `
              <button class="grade g-${g.key}" type="button" data-grade="${g.id}">
                <strong>${g.label}</strong>
                <span class="small muted">${srs.nextLabel(cards[i], g.id)}</span>
              </button>`).join('')}
          </div></section>` : ''}
      </div>`;

    el.querySelector('#show')?.addEventListener('click', () => { revealed = true; draw(); });
    for (const b of el.querySelectorAll('.grade')) {
      b.addEventListener('click', async () => {
        await srs.review(key, Number(b.dataset.grade));
        i++; revealed = false; draw();
      });
    }
  }

  await draw();
}

export default {
  title: 'Mémorisation',

  async mount(el, { path = '' } = {}) {
    const [head, a, b] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 'sourate') return screenSourate(el, a);
    if (head === 'memoriser') return screenMemoriser(el, a, b);
    if (head === 'reviser') return screenReviser(el);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() { player?.destroy(); player = null; }
};
