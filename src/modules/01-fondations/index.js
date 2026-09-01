/**
 * Module 1 — Fondations : alphabet, formes, tracé, tashkîl.
 *
 * Sous-écrans adressés par le segment de route (`#/m/01-fondations/lettres`), ce qui
 * rend chaque leçon partageable et permet au bouton Retour du navigateur de faire
 * ce qu'on attend de lui.
 */

import * as lessons from '../../data-access/lessons.js';
import * as progress from '../../core/progress.js';
import * as speech from '../../core/speech.js';
import { quiz } from '../../ui/components/quiz.js';

const STEPS = [
  { id: 'm1:lettres',      route: 'lettres',      title: 'Les 28 lettres',
    desc: 'Reconnaître chaque lettre, son nom et son point d’articulation.' },
  { id: 'm1:formes',       route: 'formes',       title: 'Les quatre formes',
    desc: 'Isolée, initiale, médiane, finale — et les six lettres qui ne se lient pas.' },
  { id: 'm1:tashkil',      route: 'tashkil',      title: 'Le tashkîl',
    desc: 'Fatha, kasra, damma, soukoun, chadda, tanwîn.' },
  { id: 'm1:quiz-noms',    route: 'quiz/noms',    title: 'Quiz — nommer les lettres',
    desc: 'Retrouver la lettre à partir de son nom.' },
  { id: 'm1:quiz-formes',  route: 'quiz/formes',  title: 'Quiz — reconnaître les formes',
    desc: 'Identifier la lettre derrière une forme initiale, médiane ou finale.' },
  { id: 'm1:quiz-tashkil', route: 'quiz/tashkil', title: 'Quiz — lire les syllabes',
    desc: 'Associer une syllabe vocalisée à sa transcription.' }
];

const M = '01-fondations';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let unsub = null;

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

async function screenLettres(el) {
  const { letters } = await lessons.alphabet();

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Les 28 lettres</h2>
        <p class="muted small">Touche une lettre pour ouvrir sa fiche : formes, point
          d’articulation, caractéristiques, et lettres avec lesquelles on la confond.</p>
      </section>
      <div class="letter-grid">
        ${letters.map((l) => `
          <a class="letter-tile" href="${link('lettre/' + l.id)}">
            <span class="ar ar-letter letter-glyph">${l.forms.isolated}</span>
            <span class="letter-name">${esc(l.name_fr)}</span>
          </a>`).join('')}
      </div>
      <button class="btn" type="button" id="mark">J’ai parcouru les 28 lettres</button>
    </div>`;

  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record('m1:lettres', { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

async function screenLettre(el, id) {
  const [{ letters, sifat }, mk] = await Promise.all([lessons.alphabet(), lessons.makharij()]);
  const l = letters.find((x) => x.id === id);
  if (!l) { el.innerHTML = '<div class="card"><p>Lettre inconnue.</p></div>'; return; }

  const point = mk.points.find((p) => p.id === l.makhraj);
  const zone = mk.zones.find((z) => z.id === point?.zone);
  const conf = l.confusable_with.map((c) => letters.find((x) => x.id === c)).filter(Boolean);
  const i = letters.findIndex((x) => x.id === id);
  const prev = letters[i - 1], next = letters[i + 1];

  const vowels = [
    { mark: 'َ', tr: 'a' }, { mark: 'ِ', tr: 'i' },
    { mark: 'ُ', tr: 'u' }, { mark: 'ْ', tr: '(soukoun)' }
  ];

  el.innerHTML = `
    <div class="stack">
      <section class="card letter-hero">
        <div class="ar ar-letter letter-big">${l.forms.isolated}</div>
        <div>
          <h2 style="margin-bottom:var(--sp-1)">${esc(l.name_fr)}
            <span class="ar-inline">${l.name_ar}</span></h2>
          <p class="small muted" style="margin:0">Translittération : <code>${esc(l.translit)}</code></p>
          <button class="btn btn-ghost speak" data-text="${l.name_ar}"
                  style="margin-top:var(--sp-3)">Écouter</button>
        </div>
      </section>

      <section class="card">
        <h3>Les quatre formes</h3>
        <div class="forms-row">
          ${[['isolated', 'Isolée'], ['initial', 'Initiale'], ['medial', 'Médiane'], ['final', 'Finale']]
            .map(([k, label]) => `
              <div class="form-cell">
                <span class="ar ar-letter">${l.forms[k]}</span>
                <span class="small muted">${label}</span>
              </div>`).join('')}
        </div>
        ${l.connects_forward
          ? ''
          : `<p class="small muted" style="margin-top:var(--sp-3)">
               Cette lettre <strong>ne se lie pas</strong> à celle qui suit : après elle,
               le mot repart d’une forme isolée ou initiale.</p>`}
      </section>

      <section class="card">
        <h3>Avec les voyelles</h3>
        <div class="forms-row">
          ${vowels.map((v) => `
            <button class="form-cell speak" type="button" data-text="${l.forms.isolated}${v.mark}">
              <span class="ar ar-letter">${l.forms.isolated}${v.mark}</span>
              <span class="small muted">${l.translit.split(' ')[0]}${v.tr === '(soukoun)' ? '' : v.tr}</span>
            </button>`).join('')}
        </div>
      </section>

      <section class="card">
        <h3>Point d’articulation</h3>
        <p><strong>${esc(point?.name_fr ?? '—')}</strong>
          <span class="ar-inline">${point?.name_ar ?? ''}</span></p>
        <p class="small muted">${esc(point?.desc ?? '')}</p>
        ${point?.cue ? `<p class="small cue">${esc(point.cue)}</p>` : ''}
        <p class="small muted">Zone : ${esc(zone?.name_fr ?? '—')} —
          <a href="#/m/02-makharij/point/${point?.id}">voir le schéma</a></p>
      </section>

      <section class="card">
        <h3>Caractéristiques</h3>
        <ul class="plan small">
          ${l.sifat.map((s) => `<li><strong>${esc(sifat[s]?.name_fr ?? s)}</strong>
             <span class="ar-inline">${sifat[s]?.name_ar ?? ''}</span> —
             ${esc(sifat[s]?.desc ?? '')}</li>`).join('')}
        </ul>
        ${l.note ? `<p class="small cue">${esc(l.note)}</p>` : ''}
      </section>

      ${conf.length ? `
      <section class="card">
        <h3>À ne pas confondre avec</h3>
        <div class="forms-row">
          ${conf.map((c) => `
            <a class="form-cell" href="${link('lettre/' + c.id)}">
              <span class="ar ar-letter">${c.forms.isolated}</span>
              <span class="small muted">${esc(c.name_fr)}</span>
            </a>`).join('')}
        </div>
      </section>` : ''}

      <nav class="pager">
        ${prev ? `<a class="btn btn-ghost" href="${link('lettre/' + prev.id)}">← ${esc(prev.name_fr)}</a>` : '<span></span>'}
        <a class="btn btn-ghost" href="${link('lettres')}">Toutes les lettres</a>
        ${next ? `<a class="btn btn-ghost" href="${link('lettre/' + next.id)}">${esc(next.name_fr)} →</a>` : '<span></span>'}
      </nav>
    </div>`;

  wireSpeak(el);
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
              <button class="tashkil-glyph speak" type="button" data-text="${t.example}">
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

const sample = (arr, n, exclude) => {
  const pool = arr.filter((x) => x.id !== exclude?.id);
  const out = [];
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  return out;
};

async function screenQuiz(el, kind) {
  const { letters, tashkil } = await lessons.alphabet();
  const real = letters.filter((l) => l.id !== 'hamza');

  let questions = [];
  let stepId = '';

  if (kind === 'noms') {
    stepId = 'm1:quiz-noms';
    questions = sample(real, 12).map((l) => ({
      id: l.id,
      prompt: `<p class="quiz-q">Quelle lettre se nomme <strong>${esc(l.name_fr)}</strong>
                 <span class="ar-inline">${l.name_ar}</span> ?</p>`,
      choices: [l, ...sample(real, 3, l)].map((c) => ({
        id: c.id, label: `<span class="ar ar-letter">${c.forms.isolated}</span>` })),
      answer: l.id,
      hint: l.note ? esc(l.note) : ''
    }));
  }

  if (kind === 'formes') {
    stepId = 'm1:quiz-formes';
    const shapes = [['initial', 'initiale'], ['medial', 'médiane'], ['final', 'finale']];
    questions = sample(real, 12).map((l) => {
      const [key, label] = shapes[Math.floor(Math.random() * shapes.length)];
      return {
        id: l.id + ':' + key,
        prompt: `<p class="quiz-q">De quelle lettre est-ce la forme ${label} ?</p>
                 <p class="ar ar-huge">${l.forms[key]}</p>`,
        choices: [l, ...sample(real, 3, l)].map((c) => ({
          id: c.id, label: `${esc(c.name_fr)} <span class="ar-inline">${c.forms.isolated}</span>` })),
        answer: l.id
      };
    });
  }

  if (kind === 'tashkil') {
    stepId = 'm1:quiz-tashkil';
    const marks = tashkil.filter((t) => ['fatha', 'kasra', 'damma'].includes(t.id));
    questions = sample(real, 12).map((l) => {
      const t = marks[Math.floor(Math.random() * marks.length)];
      const base = l.translit.split(' ')[0].replace('ā', 'a');
      const good = base + t.translit.slice(1);
      const others = marks.filter((m) => m.id !== t.id).map((m) => base + m.translit.slice(1));
      return {
        id: l.id + ':' + t.id,
        prompt: `<p class="quiz-q">Comment se lit cette syllabe ?</p>
                 <p class="ar ar-huge">${l.forms.isolated}${t.mark}</p>
                 <p style="text-align:center"><button class="btn btn-ghost speak" type="button"
                    data-text="${l.forms.isolated}${t.mark}">Écouter</button></p>`,
        choices: [good, ...others, base + 'ê'].slice(0, 4)
          .map((s) => ({ id: s, label: `<code>${esc(s)}</code>` })),
        answer: good,
        hint: `${esc(t.name_fr)} : ${esc(t.sound)}.`
      };
    });
  }

  const host = document.createElement('div');
  el.innerHTML = '';
  el.append(host);
  wireSpeak(el);

  quiz(host, {
    questions,
    onFinish: ({ score }) => progress.record(stepId, { score })
  });
}

/* ─────────────────────────── utilitaires ─────────────────────────── */

function wireSpeak(el) {
  const warn = !speech.available();
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('.speak');
    if (!btn) return;
    const ok = await speech.speak(btn.dataset.text);
    if (!ok) notifyNoVoice(el);
  });
  el.addEventListener('quiz-speak', async (e) => {
    const ok = await speech.speak(e.detail.text);
    if (!ok) notifyNoVoice(el);
  });
  if (warn) notifyNoVoice(el, true);
}

function notifyNoVoice(el, quiet = false) {
  if (el.querySelector('.no-voice')) return;
  const p = document.createElement('p');
  p.className = 'no-voice small';
  p.textContent = quiet
    ? 'Aucune voix arabe n’est installée sur cet appareil : les boutons d’écoute resteront muets.'
    : 'Impossible de prononcer : aucune voix arabe disponible sur cet appareil.';
  el.prepend(p);
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
    speech.stop();
    unsub?.();
    unsub = null;
  }
};
