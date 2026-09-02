/**
 * Module 3 — Règles de tajwîd.
 *
 * Chaque règle suit le même trajet : explication, lettres concernées, exemples réels,
 * puis exercice d'identification dans un verset.
 *
 * Les exemples ne sont pas rédigés à la main. Ils viennent de data/quran/tajweed-index.json,
 * lui-même produit à partir des annotations vérifiées — un exemple écrit de mémoire peut
 * être faux, un exemple extrait du texte annoté ne peut pas l'être. Les règles sans
 * annotation automatique (idhâr, râ', lâm) portent, elles, des exemples rédigés.
 */

import * as lessons from '../../data-access/lessons.js';
import * as quran from '../../data-access/quran.js';
import * as progress from '../../core/progress.js';
import { render, wordsWithRule } from '../../data-access/tajweed.js';

const M = '03-tajweed';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let indexCache = null;
const ruleIndex = () => (indexCache ??= fetch(
  new URL('../../../data/quran/tajweed-index.json', import.meta.url)
).then((r) => r.json()).then((j) => j.rules));

const stepOf = (id) => `m3:${id}`;
const exStepOf = (id) => `m3:${id}:exercice`;

/* ─────────────────────────── écrans ─────────────────────────── */

async function screenIndex(el) {
  const data = await lessons.tajweedRules();
  const states = new Map(await Promise.all(
    data.rules.map(async (r) => [r.id, await progress.get(stepOf(r.id))])
  ));
  const all = data.rules.flatMap((r) => [stepOf(r.id), exStepOf(r.id)]);
  const { ratio } = await progress.moduleProgress(all);

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Règles de Tajwîd</h2>
        <p class="muted small">Le tajwîd n’ajoute rien au texte : il décrit comment il
          se prononce. Chaque règle se reconnaît à un signe visible dans le mushaf —
          c’est ce que les exercices entraînent.</p>
        <div class="progress" style="margin-top:var(--sp-3)"><i style="width:${ratio * 100}%"></i></div>
        <p class="small muted" style="margin:var(--sp-2) 0 0">
          <a href="${link('glossaire')}">Glossaire des termes</a></p>
      </section>

      ${data.familles.map((f) => `
        <section>
          <h3 style="margin:var(--sp-4) 0 var(--sp-1)">${esc(f.name_fr)}
            <span class="ar-inline">${f.name_ar}</span></h3>
          <p class="small muted" style="margin-bottom:var(--sp-3)">${esc(f.intro)}</p>
          <div class="grid">
            ${data.rules.filter((r) => r.family === f.id).map((r) => {
              const p = states.get(r.id);
              const badge = p?.status === 'done'
                ? '<span class="badge badge-done">Vue</span>' : '';
              const swatch = r.annotation
                ? `<span class="rule-swatch" style="--tj-color:var(--tj-${r.annotation})"></span>` : '';
              return `<a class="card card-link" href="${link('regle/' + r.id)}">
                <div style="display:flex;gap:var(--sp-3);align-items:center">
                  ${swatch}
                  <span style="flex:1"><strong>${esc(r.name_fr)}</strong>
                    <span class="ar-inline">${r.name_ar}</span><br>
                    <span class="small muted">${esc(r.short)}</span></span>
                  ${r.duration ? `<span class="badge">${r.duration} temps</span>` : ''}
                  ${badge}
                </div></a>`;
            }).join('')}
          </div>
        </section>`).join('')}
    </div>`;
}

async function screenRegle(el, id) {
  const data = await lessons.tajweedRules();
  const rule = data.rules.find((r) => r.id === id);
  if (!rule) { el.innerHTML = '<div class="card"><p>Règle inconnue.</p></div>'; return; }

  const idx = await lessons.letterIndex();
  const famille = data.familles.find((f) => f.id === rule.family);
  const i = data.rules.findIndex((r) => r.id === id);
  const prev = data.rules[i - 1], next = data.rules[i + 1];

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <p class="small muted" style="margin-bottom:var(--sp-1)">${esc(famille?.name_fr ?? '')}</p>
        <h2 style="margin-bottom:var(--sp-1)">
          ${rule.annotation ? `<span class="rule-swatch" style="--tj-color:var(--tj-${rule.annotation})"></span>` : ''}
          ${esc(rule.name_fr)}</h2>
        <p class="ar-inline" style="font-size:1.3em">${rule.name_ar}</p>
        <p class="small muted">${esc(rule.sub)}${rule.duration ? ` — ${rule.duration} temps` : ''}</p>
      </section>

      <section class="card">
        <h3>En bref</h3>
        <p>${esc(rule.short)}</p>
        <h3 style="margin-top:var(--sp-4)">En détail</h3>
        <p>${esc(rule.explanation)}</p>
        <p class="small cue">${esc(rule.cue)}</p>
      </section>

      ${rule.letters.length || rule.letters_note ? `
      <section class="card">
        <h3>Lettres concernées</h3>
        <p class="small muted">${esc(rule.letters_note)}</p>
        ${rule.letters.length ? `<div class="forms-row">
          ${rule.letters.map((lid) => {
            const l = idx.get(lid);
            return l ? `<a class="form-cell" href="#/m/01-fondations/lettre/${l.id}">
              <span class="ar ar-letter">${l.forms.isolated}</span>
              <span class="small muted">${esc(l.name_fr)}</span></a>` : '';
          }).join('')}</div>` : ''}
      </section>` : ''}

      <section class="card" id="exemples">
        <h3>Exemples</h3>
        <div class="loading">Chargement…</div>
      </section>

      <div class="pager">
        ${prev ? `<a class="btn btn-ghost" href="${link('regle/' + prev.id)}">← ${esc(prev.name_fr)}</a>` : '<span></span>'}
        ${rule.annotation ? `<a class="btn" href="${link('exercice/' + rule.id)}">Exercice</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-ghost" href="${link('regle/' + next.id)}">${esc(next.name_fr)} →</a>` : '<span></span>'}
      </div>
    </div>`;

  await progress.record(stepOf(rule.id), { done: true });
  await fillExamples(el.querySelector('#exemples'), rule);
}

/** Exemples : réels si la règle est annotée, rédigés sinon. */
async function fillExamples(host, rule) {
  const head = '<h3>Exemples</h3>';

  if (!rule.annotation) {
    host.innerHTML = head + `
      <p class="small muted">Cette règle n’a pas d’annotation automatique dans le texte :
        les exemples ci-dessous sont donnés sans surlignage.</p>
      ${rule.examples.map((e) => `
        <div class="example">
          <p class="ar ar-quran" style="margin:0">${e.text}</p>
          <p class="small muted" style="margin:0">
            <code>${esc(e.translit)}</code> — ${esc(e.gloss)}
            <span class="ref">${esc(e.ref)}</span></p>
        </div>`).join('')}`;
    return;
  }

  const index = await ruleIndex();
  const keys = (index[rule.annotation] ?? []).slice(0, 5);
  if (!keys.length) { host.innerHTML = head + '<p class="small muted">Aucun exemple.</p>'; return; }

  const blocks = await Promise.all(keys.map(async (key) => {
    const [s] = key.split(':');
    const [v, rules, meta] = await Promise.all([
      quran.ayah(key), quran.tajweed(s), quran.surah(s)
    ]);
    // Seule la règle étudiée est colorée : le reste du verset resterait bruyant.
    const only = (rules.get(key) ?? []).filter((r) => r.rule === rule.annotation);
    return `<div class="example">
        <p class="ar ar-quran" style="margin:0">${render(v.text, only, { words: false })}</p>
        <p class="small muted" style="margin:0">
          ${esc(meta.name_fr)} <span class="ref">${esc(key)}</span></p>
      </div>`;
  }));

  host.innerHTML = head +
    `<p class="small muted">Extraits du texte, seule cette règle est colorée.</p>` +
    blocks.join('');
}

async function screenExercice(el, id) {
  const data = await lessons.tajweedRules();
  const rule = data.rules.find((r) => r.id === id);
  if (!rule?.annotation) {
    el.innerHTML = `<div class="card"><p>Pas d’exercice pour cette règle.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour</a></div>`;
    return;
  }

  const index = await ruleIndex();
  const keys = [...(index[rule.annotation] ?? [])].sort(() => Math.random() - 0.5).slice(0, 8);

  const rounds = await Promise.all(keys.map(async (key) => {
    const [s] = key.split(':');
    const [v, rules] = await Promise.all([quran.ayah(key), quran.tajweed(s)]);
    const list = rules.get(key) ?? [];
    return { key, text: v.text, targets: wordsWithRule(v.text, list, rule.annotation) };
  }));

  let n = 0, right = 0;

  const draw = () => {
    const r = rounds[n];
    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <header class="quiz-head">
            <span class="small muted">Verset ${n + 1} sur ${rounds.length}</span>
            <div class="progress" style="flex:1"><i style="width:${(n / rounds.length) * 100}%"></i></div>
          </header>
          <p class="quiz-q">Sélectionne <strong>tous les mots</strong> où s’applique
            <span class="rule-swatch" style="--tj-color:var(--tj-${rule.annotation})"></span>
            <strong>${esc(rule.name_fr)}</strong>.</p>
          <p class="ar ar-quran exo-verse">${render(r.text, [])}</p>
          <p class="small muted"><span class="ref">${esc(r.key)}</span></p>
          <div class="quiz-feedback" hidden></div>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
            <button class="btn" type="button" id="check">Vérifier</button>
            <button class="btn btn-ghost" type="button" id="next" hidden>
              ${n === rounds.length - 1 ? 'Terminer' : 'Verset suivant'}</button>
          </div>
        </section>
        <p class="small cue">${esc(rule.cue)}</p>
      </div>`;

    const picked = new Set();
    const verse = el.querySelector('.exo-verse');

    verse.addEventListener('click', (e) => {
      const w = e.target.closest('.w');
      if (!w || verse.classList.contains('locked')) return;
      const i = Number(w.dataset.w);
      if (picked.has(i)) { picked.delete(i); w.classList.remove('w-picked'); }
      else { picked.add(i); w.classList.add('w-picked'); }
    });

    el.querySelector('#check').addEventListener('click', () => {
      verse.classList.add('locked');
      const ok = picked.size === r.targets.size && [...picked].every((i) => r.targets.has(i));
      if (ok) right++;

      for (const w of verse.querySelectorAll('.w')) {
        const i = Number(w.dataset.w);
        if (r.targets.has(i)) w.classList.add('w-target');
        else if (picked.has(i)) w.classList.add('w-miss');
      }

      const fb = el.querySelector('.quiz-feedback');
      fb.className = `quiz-feedback ${ok ? 'ok' : 'ko'}`;
      fb.innerHTML = ok
        ? '<strong>Juste.</strong> Tous les mots sont trouvés.'
        : `<strong>Pas tout à fait.</strong> Les mots concernés sont maintenant soulignés :
           ${r.targets.size} sur ${verse.querySelectorAll('.w').length}.`;
      fb.hidden = false;

      el.querySelector('#check').hidden = true;
      el.querySelector('#next').hidden = false;
    });

    el.querySelector('#next').addEventListener('click', () => {
      n++;
      if (n < rounds.length) draw(); else done();
    });
  };

  const done = async () => {
    const score = right / rounds.length;
    await progress.record(exStepOf(rule.id), { score });
    el.innerHTML = `
      <div class="card">
        <h2>${score >= 0.8 ? 'Exercice validé' : 'Presque'}</h2>
        <p class="quiz-score ${score >= 0.8 ? 'ok' : 'ko'}">${right} / ${rounds.length}</p>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
          <a class="btn btn-ghost" href="${link('regle/' + rule.id)}">Revoir la règle</a>
          <a class="btn" href="${link('')}">Autres règles</a>
        </div>
      </div>`;
  };

  draw();
}

async function screenGlossaire(el) {
  const { glossaire } = await lessons.tajweedRules();
  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Glossaire</h2>
        <p class="small muted">Les termes que l’on rencontre partout dans les manuels.</p>
      </section>
      <section class="card">
        <dl class="glossary">
          ${glossaire.map((g) => `
            <dt>${esc(g.term)} <span class="ar-inline">${g.ar}</span></dt>
            <dd class="small muted">${esc(g.def)}</dd>`).join('')}
        </dl>
      </section>
    </div>`;
}

export default {
  title: 'Règles de Tajweed',

  async mount(el, { path = '' } = {}) {
    const [head, arg] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 'regle') return screenRegle(el, arg);
    if (head === 'exercice') return screenExercice(el, arg);
    if (head === 'glossaire') return screenGlossaire(el);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() {}
};
