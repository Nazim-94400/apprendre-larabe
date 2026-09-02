/**
 * Révision — file unique, tous types de cartes confondus.
 *
 * Le store `srs` mélange délibérément versets et mots de vocabulaire : c'est le
 * même geste mental — se souvenir — et scinder l'écran en deux ferait qu'on
 * n'en ouvrirait qu'un. L'affichage s'adapte au type, déduit de l'identifiant.
 */

import * as srs from '../../core/srs.js';
import * as quran from '../../data-access/quran.js';
import * as vocab from '../../data-access/vocab.js';
import { render } from '../../data-access/tajweed.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const isVerse = (id) => /^\d+:\d+$/.test(id);

/** Recto et verso d'une carte, selon son type. */
async function faces(card) {
  if (isVerse(card.id)) {
    const [s] = card.id.split(':');
    const [v, meta, rules] = await Promise.all([
      quran.ayah(card.id), quran.surah(s), quran.tajweed(s)
    ]);
    return {
      kind: 'Verset',
      label: `${esc(meta.name_fr)} <span class="ref">${esc(card.id)}</span>`,
      question: '<p class="small muted">Récite ce verset de mémoire, puis dévoile.</p>',
      hidden: `<p class="ar ar-quran hifz-verse all-hidden">${render(v.text, rules.get(card.id) ?? [])}</p>`,
      answer: `<p class="ar ar-quran">${render(v.text, rules.get(card.id) ?? [])}</p>`
    };
  }

  if (card.id.startsWith('vocab:')) {
    const w = await vocab.byId(card.id.slice(6));
    if (!w) return null;
    return {
      kind: 'Vocabulaire',
      label: `${w.occurrences} occurrences`,
      question: '<p class="small muted">Que signifie ce mot ?</p>',
      hidden: `<p class="ar ar-quran" style="font-size:calc(2.6rem * var(--text-scale));text-align:center">${w.form}</p>`,
      answer: `<p class="ar ar-quran" style="font-size:calc(2.6rem * var(--text-scale));text-align:center">${w.form}</p>
               <p style="text-align:center;font-size:var(--fs-lg)"><strong>${esc(w.fr)}</strong></p>
               ${w.root ? `<p class="small muted" style="text-align:center">Racine
                 <span class="ar-inline">${w.root}</span></p>` : ''}`
    };
  }

  return null;
}

export default {
  title: 'Réviser',

  async mount(el) {
    const cards = await srs.due('', 40);

    if (!cards.length) {
      const all = await srs.all();
      const next = all.filter((c) => c.due > Date.now()).sort((a, b) => a.due - b.due)[0];
      el.innerHTML = `
        <div class="card">
          <h2>Rien à réviser</h2>
          <p class="muted small">${all.length
            ? `${all.length} carte${all.length > 1 ? 's' : ''} en mémoire.` +
              (next ? ` La prochaine revient le ${new Date(next.due).toLocaleDateString('fr-FR')}.` : '')
            : 'Travaille un verset dans Mémorisation ou un mot dans Vocabulaire : ils apparaîtront ici.'}</p>
          <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-3)">
            <a class="btn btn-ghost" href="#/m/06-hifz">Mémorisation</a>
            <a class="btn btn-ghost" href="#/m/07-vocabulaire">Vocabulaire</a>
          </div>
        </div>`;
      return;
    }

    let i = 0;
    let revealed = false;
    let done = 0;

    const draw = async () => {
      if (i >= cards.length) {
        el.innerHTML = `<div class="card"><h2>Séance terminée</h2>
          <p class="muted small">${done} carte${done > 1 ? 's' : ''} révisée${done > 1 ? 's' : ''}.</p>
          <a class="btn" href="#/">Accueil</a></div>`;
        return;
      }

      const card = cards[i];
      const f = await faces(card);
      if (!f) { i++; return draw(); }

      el.innerHTML = `
        <div class="stack">
          <section class="card">
            <header class="quiz-head">
              <span class="small muted">${i + 1} / ${cards.length} — ${f.kind}</span>
              <div class="progress" style="flex:1"><i style="width:${(i / cards.length) * 100}%"></i></div>
            </header>
            <p class="small muted">${f.label}</p>
            ${revealed ? f.answer : f.hidden}
            ${revealed ? '' : f.question +
              '<button class="btn" type="button" id="show">Dévoiler</button>'}
          </section>

          ${revealed ? `<section class="card">
            <h3>Comment ça s’est passé ?</h3>
            <div class="grade-row">
              ${srs.GRADES.map((g) => `<button class="grade g-${g.key}" type="button" data-grade="${g.id}">
                <strong>${g.label}</strong>
                <span class="small muted">${srs.nextLabel(card, g.id)}</span></button>`).join('')}
            </div></section>` : ''}
        </div>`;

      el.querySelector('#show')?.addEventListener('click', () => { revealed = true; draw(); });
      for (const b of el.querySelectorAll('.grade')) {
        b.addEventListener('click', async () => {
          await srs.review(card.id, Number(b.dataset.grade));
          done++; i++; revealed = false; draw();
        });
      }
    };

    await draw();
  },

  unmount() {}
};
