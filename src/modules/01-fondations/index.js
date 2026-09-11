/**
 * Module 1 — Fondations : alphabet, formes, tracé, tashkîl.
 *
 * Sous-écrans adressés par le segment de route (`#/m/01-fondations/lettres`), ce qui
 * rend chaque leçon partageable et permet au bouton Retour du navigateur de faire
 * ce qu'on attend de lui.
 */

import * as lessons from '../../data-access/lessons.js';
import * as vocab from '../../data-access/vocab.js';
import * as progress from '../../core/progress.js';
import * as drill from '../../core/drill.js';
import { quiz } from '../../ui/components/quiz.js';
import { strokeView } from '../../ui/components/stroke.js';
import { wireListen, stopListening } from '../../ui/components/listen.js';

const STEPS = [
  { id: 'm1:lettres',      route: 'lettres',      title: 'Les 28 lettres',
    desc: 'Reconnaître chaque lettre, son nom et son point d’articulation.' },
  { id: 'm1:formes',       route: 'formes',       title: 'Les quatre formes',
    desc: 'Isolée, initiale, médiane, finale — et les six lettres qui ne se lient pas.' },
  { id: 'm1:tashkil',      route: 'tashkil',      title: 'Le tashkîl',
    desc: 'Fatha, kasra, damma, soukoun, chadda, tanwîn.' },
  { id: 'm1:quiz-noms',    route: 'quiz/noms',    title: 'Quiz — nommer les lettres',
    desc: 'Donner le nom d’une lettre qu’on te montre.' },
  { id: 'm1:quiz-formes',  route: 'quiz/formes',  title: 'Quiz — reconnaître les formes',
    desc: 'Identifier la lettre derrière une forme attachée.' },
  { id: 'm1:quiz-tashkil', route: 'quiz/tashkil', title: 'Quiz — lire les syllabes',
    desc: 'Associer une syllabe vocalisée à sa transcription.' },
  { id: 'm1:quiz-ecriture', route: 'quiz/ecriture', title: 'Quiz — attacher les lettres',
    desc: 'Reconnaître un mot réel à partir de ses lettres séparées.' }
];

const M = '01-fondations';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let unsub = null;
let stroke = null;

/* ─────────────────────────── écrans ─────────────────────────── */

async function screenIndex(el) {
  const done = await Promise.all(STEPS.map((s) => progress.get(s.id)));
  const { ratio } = await progress.moduleProgress(STEPS.map((s) => s.id));

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Fondations</h2>
        <p class="muted small">Tu pars de zéro : on apprend d’abord à reconnaître,
          puis à lire. Aucune étape n’est verrouillée — reviens-y dans l’ordre que tu veux.</p>
        <div class="progress" style="margin-top:var(--sp-3)"><i style="width:${ratio * 100}%"></i></div>
        <p class="small muted" style="margin:var(--sp-2) 0 0">
          ${Math.round(ratio * 100)} % du module</p>
      </section>

      <div class="grid">
        ${STEPS.map((s, i) => {
          const p = done[i];
          const badge = p?.status === 'done'
            ? '<span class="badge badge-done">Acquis</span>'
            : p?.status === 'wip'
              ? '<span class="badge badge-active">En cours</span>'
              : '<span class="badge badge-locked">À faire</span>';
          const score = p?.best != null ? `<span class="small muted"> · meilleur : ${Math.round(p.best * 100)} %</span>` : '';
          return `<a class="card card-link" href="${link(s.route)}">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <span style="flex:1"><strong>${s.title}</strong>${score}<br>
                <span class="small muted">${s.desc}</span></span>${badge}
            </div></a>`;
        }).join('')}
      </div>
    </div>`;
}

/**
 * Les lettres à tracer : vingt-huit, pas vingt-neuf.
 *
 * alphabet.json recense aussi la hamza, qui n'a pas de tracé propre — elle se
 * pose sur un support. Les quiz et la couverture de l'accueil l'écartent déjà ;
 * la grille et la fiche doivent faire de même, sinon l'écran titré « vingt-huit
 * lettres » en affiche vingt-neuf et la fiche annonce « lettre 29 sur 28 ».
 */
const traced = (letters) => letters.filter((l) => l.id !== 'hamza');

async function screenLettres(el) {
  const letters = traced((await lessons.alphabet()).letters);

  el.innerHTML = `
    <header class="page-head">
      <p class="page-date">Module 1 · fondations</p>
      <p class="page-lede">Les vingt-huit lettres</p>
      <p class="page-sub">Touche une lettre pour ouvrir sa fiche : le sens du tracé,
        les quatre formes, le point d’articulation, et celles avec lesquelles on la
        confond.</p>
    </header>

    <div class="letter-grid">
      ${letters.map((l) => `
        <a class="letter-tile" href="${link('lettre/' + l.id)}">
          <span class="ar ar-letter letter-glyph">${l.forms.isolated}</span>
          <span class="letter-name">${esc(l.name_fr)}</span>
          <span class="letter-tick${l.connects_forward ? '' : ' is-loose'}">${
            l.connects_forward ? 'se lie' : 'ne se lie pas'}</span>
        </a>`).join('')}
    </div>

    <p class="small muted" style="margin:var(--sp-4) 0 var(--sp-5)">
      Six lettres <strong>ne se lient pas</strong> à la suivante : après elles, le mot
      repart d’une forme isolée ou initiale.</p>

    <button class="btn" type="button" id="mark">J’ai parcouru les 28 lettres</button>`;

  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m1:lettres', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenLettre(el, id) {
  const [{ letters: all, sifat }, mk] = await Promise.all([lessons.alphabet(), lessons.makharij()]);
  const l = all.find((x) => x.id === id);
  if (!l) { el.innerHTML = '<div class="card"><p>Lettre inconnue.</p></div>'; return; }

  // La hamza garde sa fiche (on y arrive depuis d'autres écrans), mais hors du
  // rang et de la navigation : précédente et suivante restent dans les 28.
  const letters = traced(all);
  const point = mk.points.find((p) => p.id === l.makhraj);
  const zone = mk.zones.find((z) => z.id === point?.zone);
  const conf = l.confusable_with.map((c) => all.find((x) => x.id === c)).filter(Boolean);
  const i = letters.findIndex((x) => x.id === id);
  const prev = i > 0 ? letters[i - 1] : null;
  const next = i >= 0 ? letters[i + 1] : null;

  const vowels = [
    { mark: 'َ', tr: 'a' }, { mark: 'ِ', tr: 'i' },
    { mark: 'ُ', tr: 'u' }, { mark: 'ْ', tr: '' }
  ];
  const FORMS = [['isolated', 'Isolée'], ['initial', 'Initiale'], ['medial', 'Médiane'], ['final', 'Finale']];
  const base = l.translit.split(' ')[0];

  el.innerHTML = `
    <section class="letter-hero">
      <div id="stroke"></div>
      <div class="letter-hero-body">
        <p class="eyebrow">${i >= 0 ? `Lettre ${i + 1} sur ${letters.length}` : 'Signe d’écriture'}</p>
        <h2>${esc(l.name_fr)} <span class="ar-inline">${l.name_ar}</span></h2>
        <p class="small muted letter-translit-row">Translittération
          <span class="letter-translit">${esc(l.translit)}</span></p>
        <div class="hero-actions">
          <button class="btn listen" type="button" data-letter="${l.id}" data-mark=""
                  data-text="${l.name_ar}">Écouter</button>
          <button class="btn btn-ghost" type="button" data-replay>Rejouer le tracé</button>
        </div>
        <p class="stroke-note">Le tracé part de la droite. Il montre le sens
          d’écriture, pas l’ordre exact des traits : les points se posent en dernier.</p>
      </div>
    </section>

    <div class="sheet-cols">
      <section>
        <h3>Les quatre formes</h3>
        <div class="forms-row forms-4">
          ${FORMS.map(([k, label]) => `
            <button class="form-cell${k === 'isolated' ? ' is-on' : ''}" type="button" data-form="${k}"
                    aria-pressed="${k === 'isolated'}">
              <span class="ar ar-letter">${l.forms[k]}</span>
              <span class="form-label">${label}</span>
            </button>`).join('')}
        </div>
        <p class="small muted">${l.connects_forward
          ? 'Touche une forme pour en voir le tracé. La lettre change de forme selon sa place dans le mot.'
          : 'Cette lettre <strong>ne se lie pas</strong> à celle qui suit : après elle, le mot repart d’une forme isolée ou initiale.'}</p>
      </section>

      <section>
        <h3>Avec les voyelles</h3>
        <div class="forms-row forms-4">
          ${vowels.map((v) => `
            <button class="form-cell listen" type="button" data-letter="${l.id}" data-mark="${v.mark}"
                    data-text="${l.forms.isolated}${v.mark}">
              <span class="ar ar-letter">${l.forms.isolated}${v.mark}</span>
              <span class="form-translit">${esc(base + v.tr)}${v.tr ? '' : ' <span class="muted">(soukoun)</span>'}</span>
            </button>`).join('')}
        </div>
        <p class="small muted">Les voyelles brèves ne changent pas la lettre : elles
          se posent au-dessus ou en dessous.</p>
      </section>
    </div>

    <div class="sheet-cols">
      <section>
        <h3>Point d’articulation</h3>
        <p class="makhraj-name"><strong>${esc(point?.name_fr ?? '—')}</strong>
          <span class="ar-inline">${point?.name_ar ?? ''}</span></p>
        <p class="small muted">${esc(point?.desc ?? '')}</p>
        ${point?.cue ? `<p class="cue">${esc(point.cue)}</p>` : ''}
        <p class="small muted">Zone : ${esc(zone?.name_fr ?? '—')} —
          <a href="#/m/02-makharij/point/${point?.id}">voir le schéma</a></p>
      </section>

      <section>
        <h3>Caractéristiques</h3>
        <div class="sifat-row">
          ${l.sifat.map((s) => `<span class="sifa" title="${esc(sifat[s]?.desc ?? '')}">
            ${esc(sifat[s]?.name_fr ?? s)}<span class="ar-inline">${sifat[s]?.name_ar ?? ''}</span></span>`).join('')}
        </div>
        <dl class="sifat-list small">
          ${l.sifat.map((s) => `<div><dt>${esc(sifat[s]?.name_fr ?? s)}</dt>
            <dd class="muted">${esc(sifat[s]?.desc ?? '')}</dd></div>`).join('')}
        </dl>
        ${l.note ? `<p class="small muted">${esc(l.note)}</p>` : ''}
      </section>
    </div>

    ${conf.length ? `
    <section class="sheet-section">
      <h3>À ne pas confondre avec</h3>
      <p class="small muted">Le squelette est le même : seuls les points ou le point
        d’articulation changent.</p>
      <div class="confus-row">
        ${conf.map((c) => `
          <a class="form-cell" href="${link('lettre/' + c.id)}">
            <span class="ar ar-letter">${c.forms.isolated}</span>
            <span class="letter-name">${esc(c.name_fr)}</span>
          </a>`).join('')}
      </div>
    </section>` : ''}

    <nav class="pager">
      ${prev ? `<a class="btn btn-ghost" href="${link('lettre/' + prev.id)}">← ${esc(prev.name_fr)}</a>` : '<span></span>'}
      <a class="btn btn-ghost pager-mid" href="${link('lettres')}">Toutes les lettres</a>
      ${next ? `<a class="btn btn-ghost" href="${link('lettre/' + next.id)}">${esc(next.name_fr)} →</a>` : '<span></span>'}
    </nav>`;

  wireSpeak(el);
  stroke = strokeView(el.querySelector('#stroke'), l);

  el.querySelector('[data-replay]').addEventListener('click', () => stroke.play());
  for (const b of el.querySelectorAll('[data-form]')) {
    b.addEventListener('click', () => {
      for (const o of el.querySelectorAll('[data-form]')) {
        o.classList.toggle('is-on', o === b);
        o.setAttribute('aria-pressed', String(o === b));
      }
      stroke.setForm(b.dataset.form);
    });
  }
}

async function screenFormes(el) {
  const { letters } = await lessons.alphabet();
  const nonConnect = letters.filter((l) => !l.connects_forward && l.id !== 'hamza');

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Les quatre formes</h2>
        <p>L’arabe s’écrit attaché. Une lettre change de dessin selon sa place dans le
          mot, mais c’est toujours la même lettre et le même son.</p>
        <p class="small muted">Le squelette reste reconnaissable : ce qui change, c’est
          le trait de liaison à gauche, à droite, ou des deux côtés.</p>
      </section>

      <section class="card">
        <h3>Exemple avec le <span class="ar-inline">ب</span></h3>
        <div class="forms-row">
          <div class="form-cell"><span class="ar ar-letter">ب</span><span class="small muted">isolée</span></div>
          <div class="form-cell"><span class="ar ar-letter">بـ</span><span class="small muted">initiale</span></div>
          <div class="form-cell"><span class="ar ar-letter">ـبـ</span><span class="small muted">médiane</span></div>
          <div class="form-cell"><span class="ar ar-letter">ـب</span><span class="small muted">finale</span></div>
        </div>
        <p class="ar ar-lg ar-center" style="margin-top:var(--sp-4)">بَـبَـبَ</p>
        <p class="small muted ar-center" style="text-align:center">
          Trois bâ' à la suite : initiale, médiane, finale.</p>
      </section>

      <section class="card">
        <h3>Les six lettres qui ne se lient pas</h3>
        <p class="small muted">Elles se rattachent à la lettre précédente, jamais à la
          suivante. Après elles, le trait s’interrompt et le mot semble coupé —
          ce n’est pas une faute d’écriture.</p>
        <div class="forms-row">
          ${nonConnect.map((l) => `
            <a class="form-cell" href="${link('lettre/' + l.id)}">
              <span class="ar ar-letter">${l.forms.isolated}</span>
              <span class="small muted">${esc(l.name_fr)}</span>
            </a>`).join('')}
        </div>
        <p class="ar ar-lg ar-center" style="margin-top:var(--sp-4)">وَرْدَة</p>
        <p class="small muted ar-center" style="text-align:center">
          « warda », une rose : le wâw et le dâl coupent le trait.</p>
      </section>

      <button class="btn" type="button" id="mark">J’ai compris les formes</button>
    </div>`;

  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m1:formes', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenTashkil(el) {
  const { tashkil } = await lessons.alphabet();

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Le tashkîl</h2>
        <p>Les lettres arabes ne notent que les consonnes et les voyelles longues.
          Les voyelles brèves sont ajoutées par de petits signes, au-dessus ou en
          dessous. Sans eux, le même squelette peut se lire de plusieurs façons.</p>
        <p class="small muted">Dans le Coran, le tashkîl est toujours écrit : la lecture
          ne laisse aucune place à l’interprétation.</p>
      </section>

      <div class="grid">
        ${tashkil.map((t) => `
          <section class="card">
            <div style="display:flex;gap:var(--sp-4);align-items:center">
              <button class="tashkil-glyph listen" type="button" data-letter="ba" data-mark="${t.mark}" data-text="${t.example}">
                <span class="ar ar-letter">${t.example}</span>
              </button>
              <div style="flex:1">
                <strong>${esc(t.name_fr)}</strong> <span class="ar-inline">${t.name_ar}</span><br>
                <span class="small muted">${esc(t.sound)} — signe placé ${esc(t.position)}</span><br>
                <span class="small">se lit <code>${esc(t.translit)}</code></span>
              </div>
            </div>
          </section>`).join('')}
      </div>

      <section class="card">
        <h3>Le même mot, deux tashkîl</h3>
        <p class="ar ar-lg ar-center">كَتَبَ &nbsp;&nbsp; كُتِبَ</p>
        <p class="small muted ar-center" style="text-align:center">
          « kataba », il a écrit — « koutiba », il a été écrit.
          Mêmes lettres, sens opposés.</p>
      </section>

      <button class="btn" type="button" id="mark">J’ai compris le tashkîl</button>
    </div>`;

  wireSpeak(el);
  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m1:tashkil', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

/* ─────────────────────────── quiz ─────────────────────────── */

/**
 * Tire `n` éléments au hasard, sans remise.
 *
 * Le filtre ne s'applique que si une exclusion est demandée. La version
 * précédente comparait systématiquement `x.id` à `exclude?.id` : appelée sans
 * exclusion sur des objets sans `id`, elle comparait `undefined` à `undefined`
 * et vidait la liste — le quiz se chargeait alors sur zéro question.
 */
const sample = (arr, n, exclude) => {
  const pool = exclude ? arr.filter((x) => x.id !== exclude.id) : [...arr];
  const out = [];
  while (out.length < n && pool.length) {
    out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return out;
};

/**
 * Distracteurs : d'abord les lettres que l'on confond réellement avec la cible,
 * complétées au hasard s'il en manque.
 *
 * Un tirage purement aléatoire propose ع, خ et ص face à un ر : on répond sans
 * réfléchir. La difficulté d'un alphabet arabe est ailleurs — ب ت ث ن ي partagent
 * un même squelette et ne diffèrent que par les points. C'est là qu'il faut
 * mettre l'apprenant en peine.
 */
function distractors(pool, target, n = 3) {
  const byId = (id) => pool.find((l) => l.id === id);
  const out = (target.confusable_with ?? [])
    .map(byId).filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .slice(0, n);

  const rest = pool.filter((l) => l.id !== target.id && !out.includes(l));
  while (out.length < n && rest.length) {
    out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
  }
  return out;
}

/** Retire le tashkîl d'un mot, pour ne travailler que le squelette écrit. */
const bare = (w) => w.replace(/[ً-ْٰۖ-ۭـ]/g, '');

const POSITIONS = [
  ['isolated', 'isolée'], ['initial', 'initiale'],
  ['medial', 'médiane'], ['final', 'finale']
];

/**
 * Chaque exercice propose plusieurs formes de question, tirées au hasard à chaque
 * séance.
 *
 * Une question unique se retient comme une paire à apparier plutôt que comme un
 * savoir : au bout de deux passages, on répond à la forme sans plus lire le fond.
 * Alterner reconnaissance (montrer, faire nommer) et rappel (nommer, faire
 * reconnaître) oblige à tenir les deux sens du lien, qui ne s'apprennent pas
 * ensemble.
 *
 * Un générateur reçoit la lettre visée et le vivier de distracteurs, et rend une
 * question — ou null s'il ne s'applique pas à cette lettre.
 */
const GENERATORS = {
  noms: [
    // Reconnaissance : la forme est donnée, le nom est à retrouver.
    (l, pool) => ({
      id: `noms:vue:${l.id}`,
      prompt: `<p class="quiz-q">Comment se nomme cette lettre ?</p>
               <p class="ar ar-huge">${l.forms.isolated}</p>`,
      choices: [l, ...distractors(pool, l)].map((c) => ({ id: c.id, label: esc(c.name_fr) })),
      answer: l.id,
      hint: l.note ? esc(l.note) : ''
    }),

    // Rappel : le nom est donné, la forme est à retrouver. Aucune fuite —
    // l'énoncé est en français, les propositions en arabe.
    (l, pool) => ({
      id: `noms:rappel:${l.id}`,
      prompt: `<p class="quiz-q">Laquelle est le <strong>${esc(l.name_fr)}</strong> ?</p>`,
      choices: [l, ...distractors(pool, l)].map((c) => ({
        id: c.id, label: `<span class="ar ar-letter">${c.forms.isolated}</span>` })),
      answer: l.id
    }),

    // Par la translittération : le pont entre le son écrit et la lettre.
    (l, pool) => ({
      id: `noms:translit:${l.id}`,
      prompt: `<p class="quiz-q">Quelle lettre se transcrit
                 <code>${esc(l.translit)}</code> ?</p>`,
      choices: [l, ...distractors(pool, l)].map((c) => ({
        id: c.id, label: `<span class="ar ar-letter">${c.forms.isolated}</span>` })),
      answer: l.id
    })
  ],

  formes: [
    // Une forme attachée, à rattacher à sa lettre.
    (l, pool) => {
      const choices = l.connects_forward
        ? POSITIONS.slice(1) : [POSITIONS[3]];
      const [key, label] = choices[Math.floor(Math.random() * choices.length)];
      const from = key === 'final' ? pool : pool.filter((x) => x.connects_forward);
      return {
        id: `formes:lettre:${l.id}`,
        prompt: `<p class="quiz-q">De quelle lettre est-ce la forme ${label} ?</p>
                 <p class="ar ar-huge">${l.forms[key]}</p>`,
        choices: [l, ...distractors(from, l)].map((c) => ({ id: c.id, label: esc(c.name_fr) })),
        answer: l.id,
        hint: l.connects_forward ? '' :
          `Le ${esc(l.name_fr)} ne se lie pas à la suivante : sa forme initiale
           est identique à sa forme isolée.`
      };
    },

    // Une lettre et une position, la bonne graphie à choisir.
    (l, pool) => {
      if (!l.connects_forward) return null;
      const [key, label] = POSITIONS[1 + Math.floor(Math.random() * 3)];
      const from = distractors(pool.filter((x) => x.connects_forward), l);
      return {
        id: `formes:graphie:${l.id}`,
        prompt: `<p class="quiz-q">Comment s’écrit le <strong>${esc(l.name_fr)}</strong>
                   en position ${label} ?</p>`,
        choices: [l, ...from].map((c) => ({
          id: c.id, label: `<span class="ar ar-letter">${c.forms[key]}</span>` })),
        answer: l.id
      };
    },

    // La position elle-même, à reconnaître au trait de liaison.
    (l) => {
      if (!l.connects_forward) return null;
      const [key, label] = POSITIONS[1 + Math.floor(Math.random() * 3)];
      void label;
      return {
        id: `formes:position:${l.id}`,
        prompt: `<p class="quiz-q">Dans quelle position ce
                   <strong>${esc(l.name_fr)}</strong> est-il écrit ?</p>
                 <p class="ar ar-huge">${l.forms[key]}</p>`,
        choices: POSITIONS.map(([k, lab]) => ({ id: k, label: esc(lab) })),
        answer: key,
        hint: 'Un trait à droite signale une liaison avec la lettre précédente ; à gauche, avec la suivante.'
      };
    }
  ]
};

/**
 * Les boutons d'écoute passent par la chaîne enregistrement → Coran → synthèse,
 * et se désactivent d'eux-mêmes quand aucune des trois n'est disponible.
 */
const wireSpeak = (el) => wireListen(el);

/** Applique un générateur au hasard, en réessayant si celui tiré ne s'applique pas. */
function generate(list, item, pool) {
  for (const g of [...list].sort(() => Math.random() - 0.5)) {
    const q = g(item, pool);
    if (q) return q;
  }
  return null;
}

async function screenQuiz(el, kind) {
  const { letters, tashkil } = await lessons.alphabet();
  const real = letters.filter((l) => l.id !== 'hamza');

  let questions = [];
  let stepId = '';

  if (kind === 'noms' || kind === 'formes') {
    stepId = `m1:quiz-${kind}`;
    const picked = await drill.pick(real, 12, (l) => `${kind}:${l.id}`);
    questions = picked.map((l) => generate(GENERATORS[kind], l, real)).filter(Boolean);
  }

  /* ── Tashkîl ────────────────────────────────────────────────────────────── */
  if (kind === 'tashkil') {
    stepId = 'm1:quiz-tashkil';
    const marks = tashkil.filter((t) => ['fatha', 'kasra', 'damma', 'sukun'].includes(t.id));
    const voyelles = marks.filter((t) => t.id !== 'sukun');
    const tr = (l) => l.translit.split(' ')[0].replace('ā', 'a');

    const gens = [
      // Lire la syllabe. Les distracteurs font varier la voyelle ET la consonne :
      // n'en changer qu'une laissait deviner l'autre.
      (l) => {
        const t = voyelles[Math.floor(Math.random() * voyelles.length)];
        const good = tr(l) + t.translit.slice(1);
        const others = new Set();
        for (const m of voyelles) if (m.id !== t.id) others.add(tr(l) + m.translit.slice(1));
        for (const d of distractors(real, l, 2)) others.add(tr(d) + t.translit.slice(1));
        return {
          id: `tashkil:lire:${l.id}`,
          prompt: `<p class="quiz-q">Comment se lit cette syllabe ?</p>
                   <p class="ar ar-huge">${l.forms.isolated}${t.mark}</p>
                   <p style="text-align:center"><button class="btn btn-ghost listen" type="button"
                      data-letter="${l.id}" data-mark="${t.mark}"
                      data-text="${l.forms.isolated}${t.mark}">Écouter</button></p>`,
          choices: [good, ...[...others].filter((s) => s !== good).slice(0, 3)]
            .map((s) => ({ id: s, label: `<code>${esc(s)}</code>` })),
          answer: good,
          hint: `${esc(t.name_fr)} : ${esc(t.sound)}.`
        };
      },

      // Nommer le signe, sans passer par la transcription.
      (l) => {
        const t = marks[Math.floor(Math.random() * marks.length)];
        return {
          id: `tashkil:signe:${l.id}`,
          prompt: `<p class="quiz-q">Quel signe porte cette lettre ?</p>
                   <p class="ar ar-huge">${l.forms.isolated}${t.mark}</p>`,
          choices: marks.map((m) => ({ id: m.id, label: esc(m.name_fr) })),
          answer: t.id,
          hint: `${esc(t.name_fr)} se place ${esc(t.position)}.`
        };
      },

      // Sens inverse : la transcription est donnée, la graphie à retrouver.
      (l) => {
        const t = voyelles[Math.floor(Math.random() * voyelles.length)];
        const good = l.forms.isolated + t.mark;
        const others = voyelles.filter((m) => m.id !== t.id)
          .map((m) => l.forms.isolated + m.mark);
        const d = distractors(real, l, 1)[0];
        if (d) others.push(d.forms.isolated + t.mark);
        return {
          id: `tashkil:ecrire:${l.id}`,
          prompt: `<p class="quiz-q">Laquelle se lit
                     <code>${esc(tr(l) + t.translit.slice(1))}</code> ?</p>`,
          choices: [good, ...others.slice(0, 3)].map((s) => ({
            id: s, label: `<span class="ar ar-letter">${s}</span>` })),
          answer: good
        };
      }
    ];

    const picked = await drill.pick(real, 12, (l) => `tashkil:${l.id}`);
    questions = picked.map((l) => generate(gens, l, real)).filter(Boolean);
  }

  /* ── Écriture ───────────────────────────────────────────────────────────── */
  if (kind === 'ecriture') {
    stepId = 'm1:quiz-ecriture';

    const glossed = await vocab.glossed();
    const byChar = new Map(real.map((l) => [l.forms.isolated, l]));

    const usable = glossed
      .map((w) => ({ ...w, chars: [...bare(w.form)] }))
      .filter(({ chars }) => chars.length >= 3 && chars.length <= 5
        && chars.every((c) => byChar.has(c)));

    const swap = (chars, i) => {
      const c = [...chars];
      [c[i], c[i + 1]] = [c[i + 1], c[i]];
      return c.join('');
    };
    const substitute = (chars, i) => {
      const d = distractors(real, byChar.get(chars[i]), 1)[0];
      if (!d) return null;
      const c = [...chars];
      c[i] = d.forms.isolated;
      return c.join('');
    };
    // Les leurres sont bâtis sur le mot lui-même : un mot sans rapport se
    // rejetterait d'un coup d'œil, sans rien exercer.
    const variants = (chars) => {
      const good = chars.join('');
      const out = new Set();
      for (let i = 0; i < chars.length - 1; i++) {
        const s = swap(chars, i);
        if (s !== good) out.add(s);
      }
      for (let i = 0; i < chars.length; i++) {
        const s = substitute(chars, i);
        if (s && s !== good) out.add(s);
      }
      return [...out].sort(() => Math.random() - 0.5);
    };

    const gens = [
      (w) => {
        const good = w.chars.join('');
        return {
          id: `ecriture:attacher:${w.id}`,
          prompt: `<p class="quiz-q">Ces lettres, une fois attachées, donnent quel mot ?</p>
                   <p class="ar ar-huge letters-apart">${w.chars.join(' ')}</p>`,
          aside: `${esc(w.fr)} — ${w.occurrences} occurrences dans le Coran`,
          choices: [good, ...variants(w.chars).slice(0, 3)].map((s) => ({
            id: s, label: `<span class="ar ar-letter">${s}</span>` })),
          answer: good,
          hint: w.chars.some((c) => !byChar.get(c).connects_forward)
            ? 'Ce mot contient une lettre qui ne se lie pas à la suivante.' : ''
        };
      },

      // Le sens inverse est plus dur : il faut voir où une lettre finit.
      (w) => {
        const good = w.chars.join(' ');
        return {
          id: `ecriture:detacher:${w.id}`,
          prompt: `<p class="quiz-q">De quelles lettres ce mot est-il composé ?</p>
                   <p class="ar ar-huge">${w.chars.join('')}</p>`,
          aside: esc(w.fr),
          choices: [good, ...variants(w.chars).slice(0, 3).map((s) => [...s].join(' '))]
            .map((s) => ({ id: s, label: `<span class="ar ar-letter letters-apart">${s}</span>` })),
          answer: good
        };
      },

      (w) => {
        const first = byChar.get(w.chars[0]);
        if (!first) return null;
        return {
          id: `ecriture:premiere:${w.id}`,
          prompt: `<p class="quiz-q">Par quelle lettre ce mot commence-t-il ?</p>
                   <p class="ar ar-huge">${w.chars.join('')}</p>`,
          aside: `${esc(w.fr)} — l’arabe se lit de droite à gauche`,
          choices: [first, ...distractors(real, first)].map((c) => ({
            id: c.id, label: esc(c.name_fr) })),
          answer: first.id
        };
      }
    ];

    const picked = await drill.pick(usable, Math.min(10, usable.length),
      (w) => `ecriture:${w.id}`);
    questions = picked.map((w) => generate(gens, w, real)).filter(Boolean);
  }

  const host = document.createElement('div');
  el.innerHTML = '';
  el.append(host);
  wireSpeak(el);

  quiz(host, {
    questions,
    onFinish: async ({ score, wrong }) => {
      await progress.record(stepId, { score });
      // Chaque item est noté pour que la séance suivante reparte de ce qui
      // manque, au lieu de retirer au hasard dans tout l'alphabet.
      //
      // L'identifiant de question porte la variante (« noms:rappel:ba ») alors
      // que la statistique porte sur l'item (« noms:ba ») : c'est la lettre qui
      // est sue ou non, pas la façon de l'interroger.
      await drill.recordAll(questions.map((q) => {
        const p = q.id.split(':');
        return {
          id: p.length >= 3 ? `${p[0]}:${p.slice(2).join(':')}` : q.id,
          ok: !wrong.includes(q.id)
        };
      }));
    }
  });
}

/* ─────────────────────────── module ─────────────────────────── */

export default {
  title: 'Fondations',

  async mount(el, { path = '' } = {}) {
    unsub = progress.onChange(() => {});
    const [head, arg] = path.split('/');

    if (!head) return screenIndex(el);
    if (head === 'lettres') return screenLettres(el);
    if (head === 'lettre') return screenLettre(el, arg);
    if (head === 'formes') return screenFormes(el);
    if (head === 'tashkil') return screenTashkil(el);
    if (head === 'quiz') return screenQuiz(el, arg);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() {
    stopListening();
    stroke?.stop();
    stroke = null;
    unsub?.();
    unsub = null;
  }
};
