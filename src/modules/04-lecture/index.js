/**
 * Module 4 — Lecture progressive et lecture guidée.
 *
 * Deux entrées :
 *  - le parcours, qui va des syllabes aux sourates dans l'ordre de difficulté de
 *    tracé et de lecture, et non dans l'ordre alphabétique ;
 *  - le lecteur guidé, utilisable sur n'importe quelle sourate, avec audio, vitesse
 *    réglable et surlignage mot à mot.
 *
 * Les tableaux de syllabes sont engendrés, non recopiés : 28 lettres croisées avec
 * les voyelles brèves puis longues, exactement la matrice des manuels de type qâ'ida.
 */

import * as quran from '../../data-access/quran.js';
import * as lessons from '../../data-access/lessons.js';
import * as progress from '../../core/progress.js';
import * as speech from '../../core/speech.js';
import { render } from '../../data-access/tajweed.js';
import { createPlayer, reciters, downloadSurah } from '../../core/audio-player.js';
import { store } from '../../core/store.js';

const M = '04-lecture';
const link = (r) => `#/m/${M}${r ? '/' + r : ''}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let player = null;

/* ─────────────────────────── parcours ─────────────────────────── */

/**
 * Étapes de lecture. L'ordre suit la difficulté de tracé et d'articulation :
 * on commence par des lettres au trait simple et au son familier, on ajoute les
 * emphatiques et les gutturales ensuite. C'est la logique des méthodes progressives
 * francophones, et elle diffère volontairement de l'ordre alphabétique.
 */
const PARCOURS = [
  { id: 'syll-1', kind: 'syllabes', title: 'Premières syllabes',
    letters: ['ba', 'ta', 'tha', 'nun', 'ya'], vowels: 'short',
    desc: 'Cinq lettres de même squelette, qui ne diffèrent que par les points.' },
  { id: 'syll-2', kind: 'syllabes', title: 'Lettres à boucle',
    letters: ['jim', 'ha_hutti', 'kha', 'mim', 'ha'], vowels: 'short',
    desc: 'Le geste change : on ferme une boucle.' },
  { id: 'syll-3', kind: 'syllabes', title: 'Lettres qui ne se lient pas',
    letters: ['dal', 'dhal', 'ra', 'zay', 'waw'], vowels: 'short',
    desc: 'Après elles, le trait s’interrompt.' },
  { id: 'syll-4', kind: 'syllabes', title: 'Sifflantes et emphatiques',
    letters: ['sin', 'shin', 'sad', 'dad', 'ta_mutbaqa', 'dha'], vowels: 'short',
    desc: 'Les paires à distinguer absolument : س/ص, ت/ط, ذ/ظ.' },
  { id: 'syll-5', kind: 'syllabes', title: 'Gorge et palais',
    letters: ['ayn', 'ghayn', 'fa', 'qaf', 'kaf', 'lam', 'alif', 'hamza'], vowels: 'short',
    desc: 'Les sons qui n’existent pas en français.' },
  { id: 'madd-1', kind: 'syllabes', title: 'Les prolongations',
    letters: ['ba', 'sin', 'mim', 'nun', 'ra', 'lam'], vowels: 'long',
    desc: 'La même syllabe, tenue deux temps.' },
  { id: 'sukun-1', kind: 'syllabes', title: 'Le soukoun',
    letters: ['ba', 'ta', 'dal', 'jim', 'qaf'], vowels: 'sukun',
    desc: 'Lettres sans voyelle — et les cinq de la qalqala.' },

  { id: 'sourate-114', kind: 'sourate', surah: 114, title: 'An-Nâs', desc: '6 versets' },
  { id: 'sourate-113', kind: 'sourate', surah: 113, title: 'Al-Falaq', desc: '5 versets' },
  { id: 'sourate-112', kind: 'sourate', surah: 112, title: 'Al-Ikhlâs', desc: '4 versets' },
  { id: 'sourate-111', kind: 'sourate', surah: 111, title: 'Al-Masad', desc: '5 versets' },
  { id: 'sourate-110', kind: 'sourate', surah: 110, title: 'An-Nasr', desc: '3 versets' },
  { id: 'sourate-108', kind: 'sourate', surah: 108, title: 'Al-Kawthar', desc: '3 versets' },
  { id: 'sourate-107', kind: 'sourate', surah: 107, title: 'Al-Mâ‘ûn', desc: '7 versets' },
  { id: 'sourate-106', kind: 'sourate', surah: 106, title: 'Quraych', desc: '4 versets' },
  { id: 'sourate-105', kind: 'sourate', surah: 105, title: 'Al-Fîl', desc: '5 versets' },
  { id: 'sourate-1',   kind: 'sourate', surah: 1,   title: 'Al-Fâtiha', desc: '7 versets' }
];

const VOWELS = {
  short: [['َ', 'a'], ['ِ', 'i'], ['ُ', 'u']],
  long:  [['َا', 'â'], ['ِي', 'î'], ['ُو', 'û']],
  sukun: [['َ', 'a'], ['ْ', '(soukoun)']]
};

async function screenIndex(el) {
  const states = await Promise.all(PARCOURS.map((s) => progress.get(`m4:${s.id}`)));
  const { ratio } = await progress.moduleProgress(PARCOURS.map((s) => `m4:${s.id}`));

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>Lecture progressive</h2>
        <p class="muted small">On lit d’abord des syllabes, puis des mots, puis des
          sourates. L’ordre suit la difficulté du tracé et du son, pas l’alphabet.</p>
        <div class="progress" style="margin-top:var(--sp-3)"><i style="width:${ratio * 100}%"></i></div>
      </section>

      <section class="card">
        <h3>Lecture guidée libre</h3>
        <p class="small muted">N’importe quelle sourate, avec audio, vitesse réglable
          et surlignage mot à mot.</p>
        <a class="btn" href="${link('lire/1')}">Ouvrir le lecteur</a>
      </section>

      <h3 style="margin:var(--sp-4) 0 var(--sp-2)">Le parcours</h3>
      <div class="grid">
        ${PARCOURS.map((s, i) => {
          const p = states[i];
          const badge = p?.status === 'done'
            ? '<span class="badge badge-done">Fait</span>'
            : '<span class="badge badge-locked">À faire</span>';
          const href = s.kind === 'syllabes' ? link('syllabes/' + s.id) : link('lire/' + s.surah);
          return `<a class="card card-link" href="${href}">
            <div style="display:flex;gap:var(--sp-3);align-items:center">
              <span class="step-kind">${s.kind === 'syllabes' ? 'ﺏ' : '۩'}</span>
              <span style="flex:1"><strong>${esc(s.title)}</strong><br>
                <span class="small muted">${esc(s.desc)}</span></span>${badge}
            </div></a>`;
        }).join('')}
      </div>
    </div>`;
}

async function screenSyllabes(el, id) {
  const step = PARCOURS.find((s) => s.id === id);
  if (!step) { el.innerHTML = '<div class="card"><p>Étape inconnue.</p></div>'; return; }

  const idx = await lessons.letterIndex();
  const vowels = VOWELS[step.vowels];
  const rows = step.letters.map((lid) => idx.get(lid)).filter(Boolean);

  el.innerHTML = `
    <div class="stack">
      <section class="card">
        <h2>${esc(step.title)}</h2>
        <p class="muted small">${esc(step.desc)}</p>
        <p class="small muted">Lis chaque ligne à voix haute, de droite à gauche,
          sans t’arrêter. Touche une syllabe pour l’entendre.</p>
      </section>

      <section class="card">
        <table class="syll-table">
          <tbody>
            ${rows.map((l) => `
              <tr>
                ${vowels.map(([mark, tr]) => `
                  <td><button class="syll speak" type="button" data-text="${l.forms.isolated}${mark}">
                    <span class="ar ar-letter">${l.forms.isolated}${mark}</span>
                    <span class="small muted">${esc(l.translit.split(' ')[0])}${tr === '(soukoun)' ? '' : esc(tr)}</span>
                  </button></td>`).join('')}
                <th scope="row" class="small muted">${esc(l.name_fr)}</th>
              </tr>`).join('')}
          </tbody>
        </table>
      </section>

      <button class="btn" type="button" id="mark">J’ai lu ce tableau à voix haute</button>
    </div>`;

  el.addEventListener('click', (e) => {
    const b = e.target.closest('.speak');
    if (b) speech.speak(b.dataset.text);
  });
  el.querySelector('#mark').addEventListener('click', async (e) => {
    await progress.record(`m4:${step.id}`, { done: true });
    e.target.textContent = 'Étape validée';
    e.target.disabled = true;
  });
}

/* ─────────────────────────── lecteur guidé ─────────────────────────── */

async function screenLire(el, surahArg) {
  const surahId = Number(surahArg) || 1;
  const prefs = store.get();

  const [list, meta, verses, rules, voices] = await Promise.all([
    quran.surahs(), quran.surah(surahId), quran.ayahs(surahId),
    quran.tajweed(surahId), reciters()
  ]);

  const reciterId = voices.some((r) => r.id === prefs.reciter) ? prefs.reciter : voices[0].id;
  const rate = prefs.playbackRate ?? 1;

  el.innerHTML = `
    <div class="stack reader">
      <section class="card">
        <div class="reader-selects">
          <label class="row"><span>Sourate</span>
            <select id="pick-surah">
              ${list.map((s) => `<option value="${s.id}"${s.id === surahId ? ' selected' : ''}>
                 ${s.id}. ${esc(s.name_translit)} — ${esc(s.name_fr)}</option>`).join('')}
            </select></label>
          <label class="row"><span>Récitateur</span>
            <select id="pick-reciter">
              ${voices.map((r) => `<option value="${r.id}"${r.id === reciterId ? ' selected' : ''}>
                 ${esc(r.name)} — ${esc(r.style)}</option>`).join('')}
            </select></label>
        </div>
        <p class="small muted" style="margin:var(--sp-2) 0 0">
          ${esc(meta.name_fr)} — ${meta.ayah_count} versets, sourate ${esc(meta.revelation)}.
          Audio : EveryAyah (CC BY-NC).</p>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
          <button class="btn btn-ghost" type="button" id="dl">Télécharger l’audio hors ligne</button>
          <span class="small muted" id="dl-state"></span>
        </div>
      </section>

      <section class="card verses" id="verses">
        ${verses.map((v, i) => `
          <p class="ar ar-quran verse" data-key="${v.key}" data-i="${i}">
            ${render(v.text, rules.get(v.key) ?? [])}
            <span class="ayah-n">${v.n}</span>
          </p>`).join('')}
      </section>
    </div>

    <div class="playbar" role="group" aria-label="Lecture">
      <div class="playbar-inner">
        <button class="pb-btn" type="button" id="prev" aria-label="Verset précédent">⏮</button>
        <button class="pb-btn pb-main" type="button" id="play" aria-label="Lire">▶</button>
        <button class="pb-btn" type="button" id="next" aria-label="Verset suivant">⏭</button>
        <button class="pb-btn${''}" type="button" id="loop" aria-pressed="false"
                aria-label="Répéter le verset">↻</button>
        <label class="pb-rate">
          <span class="small muted" id="rate-val">${rate.toFixed(2)}×</span>
          <input type="range" id="rate" min="0.5" max="1.5" step="0.05" value="${rate}"
                 aria-label="Vitesse de lecture">
        </label>
        <span class="small muted pb-pos" id="pos"></span>
      </div>
    </div>`;

  const versesEl = el.querySelector('#verses');
  const keys = verses.map((v) => v.key);

  let currentVerse = null;
  const clearWord = () => versesEl.querySelectorAll('.w-active')
    .forEach((n) => n.classList.remove('w-active'));

  player = createPlayer({
    onVerse(key) {
      versesEl.querySelectorAll('.verse.is-current').forEach((n) => n.classList.remove('is-current'));
      currentVerse = versesEl.querySelector(`.verse[data-key="${key}"]`);
      currentVerse?.classList.add('is-current');
      currentVerse?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      clearWord();
    },
    onWord(i) {
      clearWord();
      if (i != null) currentVerse?.querySelector(`.w[data-w="${i}"]`)?.classList.add('w-active');
    },
    onState(s) {
      el.querySelector('#play').textContent = s.playing ? '⏸' : '▶';
      el.querySelector('#play').setAttribute('aria-label', s.playing ? 'Pause' : 'Lire');
      el.querySelector('#pos').textContent = s.key ? `${s.index + 1} / ${s.total}` : '';
      el.querySelector('#loop').setAttribute('aria-pressed', String(s.loop));
      el.querySelector('#loop').classList.toggle('is-on', s.loop);
      if (s.error) el.querySelector('#dl-state').textContent = s.error;
    }
  });

  await player.setQueue(keys, { reciterId });
  player.setRate(rate);

  el.querySelector('#play').addEventListener('click', () => player.toggle());
  el.querySelector('#next').addEventListener('click', () => player.next());
  el.querySelector('#prev').addEventListener('click', () => player.prev());

  const loopBtn = el.querySelector('#loop');
  loopBtn.addEventListener('click', () => {
    const on = loopBtn.getAttribute('aria-pressed') !== 'true';
    player.setLoop(on);
  });

  const rateInput = el.querySelector('#rate');
  rateInput.addEventListener('input', () => {
    const v = Number(rateInput.value);
    el.querySelector('#rate-val').textContent = v.toFixed(2) + '×';
    player.setRate(v);
    store.set({ playbackRate: v });
  });

  versesEl.addEventListener('click', (e) => {
    const p = e.target.closest('.verse');
    if (p) player.goto(Number(p.dataset.i));
  });

  el.querySelector('#pick-surah').addEventListener('change', (e) => {
    location.hash = link('lire/' + e.target.value);
  });
  el.querySelector('#pick-reciter').addEventListener('change', async (e) => {
    await store.set({ reciter: e.target.value });
    await player.setReciter(e.target.value);
  });

  el.querySelector('#dl').addEventListener('click', async (e) => {
    const state = el.querySelector('#dl-state');
    e.target.disabled = true;
    state.textContent = 'Téléchargement…';
    try {
      await downloadSurah(reciterId, surahId, meta.ayah_count,
        (done, total) => { state.textContent = `${done} / ${total} versets`; });
      state.textContent = 'Disponible hors ligne.';
    } catch (err) {
      state.textContent = 'Échec : ' + err.message;
      e.target.disabled = false;
    }
  });

  // Une sourate ouverte et écoutée compte comme faite si elle est au parcours.
  const step = PARCOURS.find((s) => s.surah === surahId);
  if (step) await progress.record(`m4:${step.id}`, { done: true });
}

export default {
  title: 'Lecture progressive',

  async mount(el, { path = '' } = {}) {
    const [head, arg] = path.split('/');
    if (!head) return screenIndex(el);
    if (head === 'syllabes') return screenSyllabes(el, arg);
    if (head === 'lire') return screenLire(el, arg);

    el.innerHTML = `<div class="card"><p>Écran inconnu.</p>
      <a class="btn btn-ghost" href="${link('')}">Retour au module</a></div>`;
  },

  unmount() {
    player?.destroy();
    player = null;
    speech.stop();
  }
};
