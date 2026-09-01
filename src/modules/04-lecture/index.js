import { byId } from '../registry.js';
import * as quran from '../../data-access/quran.js';
import { render, rulesUsed } from '../../data-access/tajweed.js';

/**
 * Module « Lecture progressive » — squelette.
 *
 * Le module lui-même (progression Nourania, lecture guidée synchronisée sur l'audio,
 * vitesse réglable) arrive en Phase 2. En attendant, cet écran affiche le texte
 * coranique réel avec sa coloration de tajweed : c'est la vérification de bout en
 * bout que le texte Tanzil, les annotations réalignées et le moteur de rendu
 * fonctionnent ensemble.
 */

const NAMES = {
  qalqalah: 'Qalqala', iqlab: 'Iqlâb', ghunnah: 'Ghunna',
  idghaam_ghunnah: 'Idghâm avec ghunna', idghaam_no_ghunnah: 'Idghâm sans ghunna',
  idghaam_shafawi: 'Idghâm chafawi', idghaam_mutajanisayn: 'Idghâm mutajânisayn',
  idghaam_mutaqaribayn: 'Idghâm mutaqâribayn',
  ikhfa: 'Ikhfâ', ikhfa_shafawi: 'Ikhfâ chafawi',
  madd_2: 'Madd 2 temps', madd_246: 'Madd 2, 4 ou 6', madd_muttasil: 'Madd muttasil',
  madd_munfasil: 'Madd munfasil', madd_6: 'Madd lâzim 6 temps',
  lam_shamsiyyah: 'Lâm shamsiyya', hamzat_wasl: 'Hamzat al-wasl', silent: 'Lettre muette'
};

let onChange = null;

async function show(el, surahId) {
  const body = el.querySelector('#lecture-body');
  body.innerHTML = '<div class="loading">Chargement du texte…</div>';

  const [meta, verses, rules] = await Promise.all([
    quran.surah(surahId),
    quran.ayahs(surahId),
    quran.tajweed(surahId)
  ]);

  const used = new Set();
  const html = verses.map((v) => {
    const r = rules.get(v.key) ?? [];
    for (const x of rulesUsed(r)) used.add(x);
    return `<p class="ar ar-quran" lang="ar">${render(v.text, r)}
      <span class="ayah-n" aria-label="verset ${v.n}">${v.n}</span></p>`;
  }).join('');

  const legend = [...used].map((r) =>
    `<li><i style="--tj-color:var(--tj-${r})"></i>${NAMES[r] ?? r}</li>`).join('');

  body.innerHTML = `
    <section class="card">
      <h2 style="margin-bottom:var(--sp-1)">${meta.name_fr}</h2>
      <p class="small muted">${meta.name_translit} — ${meta.name_ar} —
         ${meta.ayah_count} versets, sourate ${meta.revelation}</p>
      <ul class="tj-legend" style="margin-top:var(--sp-3)">${legend}</ul>
    </section>
    <section class="card">${html}</section>`;
}

export default {
  title: 'Lecture progressive',

  async mount(el) {
    const m = byId('04-lecture');
    const list = await quran.surahs();

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>${m.title}</h2>
          <p class="muted" style="margin-bottom:var(--sp-3)">${m.subtitle}</p>
          <span class="badge badge-locked">Phase 2 — à venir</span>
          <p class="small muted" style="margin-top:var(--sp-3)">
            En attendant le module, voici le texte coranique et sa coloration de
            tajweed, tels qu'ils sont réellement stockés dans l'application.</p>
          <label class="row"><span>Sourate</span>
            <select id="pick-surah">
              ${list.map((s) => `<option value="${s.id}"${s.id === 1 ? ' selected' : ''}>
                 ${s.id}. ${s.name_translit} — ${s.name_fr}</option>`).join('')}
            </select>
          </label>
        </section>
        <div id="lecture-body"></div>
      </div>`;

    const select = el.querySelector('#pick-surah');
    onChange = () => show(el, select.value);
    select.addEventListener('change', onChange);
    await show(el, 1);
  },

  unmount() { onChange = null; }
};
