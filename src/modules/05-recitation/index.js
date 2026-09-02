/**
 * Module 5 — Récitation et auto-évaluation.
 *
 * L'apprenant écoute, enregistre, compare, puis valide lui-même le verset. La
 * machine mesure le rythme ; c'est lui qui juge sa prononciation, en s'écoutant.
 *
 * Ce partage est délibéré. Une note automatique de « prononciation » donnerait une
 * autorité qu'aucune mesure disponible dans un navigateur ne justifie. En revanche,
 * s'entendre soi-même juste après le récitateur révèle des écarts qu'on ne perçoit
 * pas en récitant.
 */

import * as quran from '../../data-access/quran.js';
import * as progress from '../../core/progress.js';
import * as recorder from '../../core/recorder.js';
import { render, tokenize } from '../../data-access/tajweed.js';
import { audioUrl, segments, reciters } from '../../core/audio-player.js';
import { decodeMono, compare, envelope } from '../../core/analysis.js';
import { store } from '../../core/store.js';

const M = '05-recitation';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const stepOf = (key) => `m5:${key}`;
let active = null;   // enregistrement en cours, à annuler au démontage

/* ─────────────────────────── liste ─────────────────────────── */

async function screenIndex(el, surahArg) {
  const surahId = Number(surahArg) || 114;
  const [list, meta, verses] = await Promise.all([
    quran.surahs(), quran.surah(surahId), quran.ayahs(surahId)
  ]);
  const states = await Promise.all(verses.map((v) => progress.get(stepOf(v.key))));

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Récitation</h2>
        <p class="muted small">Écoute le verset, enregistre-toi, compare. L’application
          mesure ton rythme — les allongements trop courts, les mots précipités.
          La justesse des lettres, c’est toi qui l’entends.</p>
        <label class="row"><span>Sourate</span>
          <select id="pick-surah">
            ${list.map((s) => `<option value="${s.id}"${s.id === surahId ? ' selected' : ''}>
               ${s.id}. ${esc(s.name_translit)} — ${esc(s.name_fr)}</option>`).join('')}
          </select></label>
      </section>

      <section class="card">
        <h3>${esc(meta.name_fr)}</h3>
        <p class="small muted">${verses.length} versets —
          ${states.filter((s) => s?.status === 'done').length} validés</p>
      </section>

      <div class="grid">
        ${verses.map((v, i) => {
          const done = states[i]?.status === 'done';
          return `<a class="card card-link" href="${link('verset/' + v.key)}">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <span class="ayah-n">${v.n}</span>
              <span class="ar ar-quran" style="flex:1;font-size:var(--fs-ar)">${v.text}</span>
              ${done ? '<span class="badge badge-done">Validé</span>' : ''}
            </div></a>`;
        }).join('')}
      </div>
    </div>`;

  el.querySelector('#pick-surah').addEventListener('change', (e) => {
    location.hash = link('s/' + e.target.value);
  });
}

/* ─────────────────────────── un verset ─────────────────────────── */

async function screenVerset(el, key) {
  const [s] = key.split(':');
  const [verse, meta, rules, voices, trad] = await Promise.all([
    quran.ayah(key), quran.surah(s), quran.tajweed(s), reciters(),
    quran.translation(s)
  ]);
  if (!verse) { el.innerHTML = '<div class="card"><p>Verset inconnu.</p></div>'; return; }

  const prefs = store.get();
  const reciterId = voices.some((r) => r.id === prefs.reciter) ? prefs.reciter : voices[0].id;
  const words = tokenize(verse.text).filter((t) => t.word).map((t) => t.text);
  const done = await progress.get(stepOf(key));

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <p class="small muted" style="margin-bottom:var(--sp-1)">
          ${esc(meta.name_fr)} <span class="ref">${esc(key)}</span></p>
        <p class="ar ar-quran" id="verse">${render(verse.text, rules.get(key) ?? [])}</p>
        ${trad.get(key) ? `<p class="trad">${esc(trad.get(key))}</p>` : ''}
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
          <button class="btn btn-ghost" type="button" id="listen">Écouter la référence</button>
          <span class="small muted" id="ref-state"></span>
        </div>
      </section>

      <section class="card">
        <h3>Ton enregistrement</h3>
        ${recorder.available() ? `
          <div class="rec-row">
            <button class="btn rec-btn" type="button" id="rec">Enregistrer</button>
            <div class="level"><i id="level"></i></div>
          </div>
          <p class="small muted" id="rec-state">Le micro ne s’active qu’au moment
            où tu appuies, et se coupe dès que tu arrêtes.</p>
        ` : `<p class="no-voice small">Ce navigateur ne permet pas d’enregistrer
             (getUserMedia ou MediaRecorder indisponible).</p>`}
      </section>

      <div id="result"></div>

      <section class="card">
        <h3>Validation</h3>
        <p class="small muted">Quand tu estimes réciter ce verset correctement,
          valide-le pour passer au suivant.</p>
        <button class="btn${done?.status === 'done' ? ' btn-ghost' : ''}" type="button" id="validate">
          ${done?.status === 'done' ? 'Verset validé' : 'Je valide ce verset'}</button>
      </section>

      <section class="card" id="history"><h3>Historique</h3>
        <div class="loading">Chargement…</div></section>
    </div>`;

  /* ---- référence ---- */

  let refSamples = null;
  let refSegments = null;
  const refAudio = new Audio();
  refAudio.crossOrigin = 'anonymous';

  const url = await audioUrl(reciterId, key);
  refAudio.src = url;

  el.querySelector('#listen').addEventListener('click', () => {
    if (refAudio.paused) refAudio.play(); else { refAudio.pause(); refAudio.currentTime = 0; }
  });

  async function loadReference() {
    if (refSamples) return refSamples;
    const state = el.querySelector('#ref-state');
    state.textContent = 'Chargement de la référence…';
    const res = await fetch(url);
    if (!res.ok) throw new Error('audio de référence indisponible');
    refSamples = await decodeMono(await res.arrayBuffer());
    const map = await segments(reciterId, Number(s));
    refSegments = map.get(key)?.s ?? [];
    state.textContent = '';
    return refSamples;
  }

  /* ---- enregistrement ---- */

  const recBtn = el.querySelector('#rec');
  if (recBtn) {
    const level = el.querySelector('#level');
    const state = el.querySelector('#rec-state');

    recBtn.addEventListener('click', async () => {
      if (active) {
        // Arrêt
        recBtn.disabled = true;
        state.textContent = 'Analyse…';
        const blob = await active.stop();
        active = null;
        recBtn.classList.remove('is-rec');
        recBtn.textContent = 'Enregistrer';
        level.style.width = '0%';

        try {
          const [ref, buf] = await Promise.all([loadReference(), blob.arrayBuffer()]);
          const user = await decodeMono(buf);
          const analysis = compare(ref, user, refSegments, words);
          analysis.envelope = Array.from(envelope(analysis.userEnergy, 120));

          await recorder.save({ verseKey: key, blob, reciter: reciterId, analysis });
          showResult(el, analysis, words);
          await fillHistory(el, key);
          state.textContent = '';
        } catch (err) {
          state.textContent = 'Analyse impossible : ' + err.message;
        }
        recBtn.disabled = false;
        return;
      }

      // Démarrage
      try {
        state.textContent = 'Enregistrement… appuie de nouveau pour arrêter.';
        active = await recorder.record((v) => { level.style.width = Math.round(v * 100) + '%'; });
        recBtn.classList.add('is-rec');
        recBtn.textContent = 'Arrêter';
      } catch (err) {
        state.textContent = err.name === 'NotAllowedError'
          ? 'Micro refusé. Autorise l’accès dans les réglages du navigateur.'
          : 'Micro indisponible : ' + err.message;
      }
    });
  }

  el.querySelector('#validate').addEventListener('click', async (e) => {
    await progress.record(stepOf(key), { done: true });
    e.target.textContent = 'Verset validé';
    e.target.classList.add('btn-ghost');
  });

  await fillHistory(el, key);

  // Le flux micro doit se fermer même si l'utilisateur quitte l'écran en cours
  // d'enregistrement — sinon le voyant du micro reste allumé.
  el._cleanup = () => { active?.cancel(); active = null; refAudio.pause(); };
}

/* ─────────────────────────── résultat ─────────────────────────── */

function showResult(el, a, words) {
  const host = el.querySelector('#result');
  const pct = Math.round(a.rhythm * 100);
  const off = a.perWord.filter((w) => w.verdict !== 'ok');

  const bar = (env, cls) => `<svg class="wave ${cls}" viewBox="0 0 120 40" preserveAspectRatio="none">
      ${Array.from(env).map((v, i) =>
        `<rect x="${i}" y="${20 - v * 19}" width="0.8" height="${Math.max(0.6, v * 38)}" />`).join('')}
    </svg>`;

  host.innerHTML = `
    <section class="card">
      <h3>Comparaison</h3>
      ${a.usable
        ? `<p class="quiz-score ${pct >= 80 ? 'ok' : 'ko'}">${pct} %
             <span class="small muted">de mots à la bonne durée</span></p>`
        : `<p class="no-voice small">Ton enregistrement dure
             ${a.durationRatio < 1 ? 'beaucoup moins' : 'beaucoup plus'} longtemps que
             la référence (${(a.userDuration / 1000).toFixed(1)} s contre
             ${(a.refDuration / 1000).toFixed(1)} s). Le score de rythme n’aurait
             pas de sens ici — vérifie que tu as bien récité ce verset, en entier,
             sans long silence avant ou après.</p>`}
      <p class="small muted">Référence ${(a.refDuration / 1000).toFixed(1)} s —
        toi ${(a.userDuration / 1000).toFixed(1)} s.</p>

      <div class="waves">
        <div><span class="small muted">Référence</span>${bar(envelope(a.refEnergy, 120), 'wave-ref')}</div>
        <div><span class="small muted">Toi</span>${bar(envelope(a.userEnergy, 120), 'wave-user')}</div>
      </div>

      ${a.usable && off.length ? `
        <h4 style="margin:var(--sp-4) 0 var(--sp-2)">Mots à revoir</h4>
        <ul class="timing-list">
          ${off.map((w) => `<li>
            <span class="ar ar-quran">${esc(w.text)}</span>
            <span class="small ${w.verdict === 'court' ? 'too-short' : 'too-long'}">
              ${w.verdict === 'court' ? 'trop court' : 'trop long'}</span>
            <span class="small muted">${(w.userDur / 1000).toFixed(2)} s contre
              ${(w.refDur / 1000).toFixed(2)} s</span>
          </li>`).join('')}
        </ul>
        <p class="small cue">Un mot « trop court » est souvent un allongement avalé :
          repère s’il porte un madd.</p>`
        : a.usable
          ? '<p class="small cue">Toutes les durées sont proches de la référence.</p>'
          : ''}

      <p class="small muted" style="margin-top:var(--sp-4)">
        Cette mesure porte sur le <strong>rythme</strong>, pas sur la justesse des
        points d’articulation — aucune mesure fiable de cela n’existe dans un
        navigateur. Réécoute-toi juste après la référence pour juger le reste.</p>
    </section>`;
}

/* ─────────────────────────── historique ─────────────────────────── */

async function fillHistory(el, key) {
  const host = el.querySelector('#history');
  const list = await recorder.history(key);

  if (!list.length) {
    host.innerHTML = `<h3>Historique</h3>
      <p class="small muted">Aucun enregistrement pour ce verset.</p>`;
    return;
  }

  host.innerHTML = `<h3>Historique</h3>
    <p class="small muted">${list.length} prise${list.length > 1 ? 's' : ''} —
      conservées sur cet appareil uniquement.</p>
    <ul class="rec-list">
      ${list.map((r) => `<li data-id="${r.id}">
        <button class="btn btn-ghost small-btn play-rec" type="button">▶</button>
        <span class="small">${new Date(r.date).toLocaleString('fr-FR',
          { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        ${r.rhythm != null ? `<span class="badge">${Math.round(r.rhythm * 100)} %</span>` : ''}
        <span class="small muted">${((r.blob?.size ?? 0) / 1024).toFixed(0)} Ko</span>
        <button class="btn btn-ghost small-btn del-rec" type="button" aria-label="Supprimer">✕</button>
      </li>`).join('')}
    </ul>`;

  const players = new Map();
  host.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = Number(li.dataset.id);

    if (e.target.closest('.play-rec')) {
      let audio = players.get(id);
      if (!audio) {
        const rec = list.find((r) => r.id === id);
        audio = new Audio(URL.createObjectURL(rec.blob));
        players.set(id, audio);
      }
      if (audio.paused) audio.play(); else { audio.pause(); audio.currentTime = 0; }
    }

    if (e.target.closest('.del-rec')) {
      await recorder.remove(id);
      await fillHistory(el, key);
    }
  });
}

export default {
  title: 'Récitation',

  async mount(el, { path = '' } = {}) {
    const [head, arg] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 's') return screenIndex(el, arg);
    if (head === 'verset') return screenVerset(el, arg);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() {
    active?.cancel();
    active = null;
  }
};
