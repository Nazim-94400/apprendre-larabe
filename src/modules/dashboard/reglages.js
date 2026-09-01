import { store } from '../../core/store.js';
import { db } from '../../core/db.js';
import { applyTheme, applyTextScale } from '../../ui/theme.js';

const fmtUsage = (o) => o == null
  ? 'Indisponible sur ce navigateur'
  : `${(o.usage / 1048576).toFixed(1)} Mo utilisés sur ${(o.quota / 1073741824).toFixed(1)} Go disponibles`;

export default {
  title: 'Réglages',

  async mount(el) {
    const s = store.get();
    const usage = await db.usage();

    el.innerHTML = `
      <div class="stack">
        <section class="card">
          <h2>Affichage</h2>
          <label class="row"><span>Thème</span>
            <select id="f-theme">
              <option value="auto"  ${s.theme === 'auto'  ? 'selected' : ''}>Système</option>
              <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Clair</option>
              <option value="dark"  ${s.theme === 'dark'  ? 'selected' : ''}>Sombre</option>
            </select>
          </label>
          <label class="row"><span>Taille du texte</span>
            <input id="f-scale" type="range" min="0.9" max="1.6" step="0.05" value="${s.textScale}">
          </label>
          <label class="row"><span>Couleurs de tajweed</span>
            <input id="f-tajweed" type="checkbox" ${s.tajweedColors ? 'checked' : ''}></label>
          <label class="row"><span>Afficher le tashkîl</span>
            <input id="f-tashkil" type="checkbox" ${s.showTashkil ? 'checked' : ''}></label>
          <label class="row"><span>Afficher la translittération</span>
            <input id="f-translit" type="checkbox" ${s.showTranslit ? 'checked' : ''}></label>
          <p class="ar ar-center" style="margin:var(--sp-4) 0 0">\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650</p>
          <p class="small muted ar-center" style="text-align:center">Aperçu de la taille de lecture</p>
        </section>

        <section class="card">
          <h2>Stockage</h2>
          <p class="small muted">${fmtUsage(usage)}</p>
          <p class="small muted">L\u2019audio de récitation n\u2019est jamais téléchargé
            automatiquement : il se télécharge sourate par sourate, à ta demande.</p>
        </section>

        <section class="card">
          <h2>Données</h2>
          <p class="small muted">La progression est stockée uniquement sur cet appareil.
            Aucun compte, aucun serveur.</p>
          <button class="btn btn-ghost" id="f-reset">Réinitialiser la progression</button>
        </section>
      </div>`;

    el.querySelector('#f-theme').onchange = (e) => {
      applyTheme(e.target.value);
      store.set({ theme: e.target.value });
    };
    el.querySelector('#f-scale').oninput = (e) => {
      const v = Number(e.target.value);
      applyTextScale(v);
      store.set({ textScale: v });
    };
    el.querySelector('#f-tajweed').onchange = (e) => store.set({ tajweedColors: e.target.checked });
    el.querySelector('#f-tashkil').onchange = (e) => store.set({ showTashkil: e.target.checked });
    el.querySelector('#f-translit').onchange = (e) => store.set({ showTranslit: e.target.checked });

    el.querySelector('#f-reset').onclick = async () => {
      if (!confirm('Effacer toute la progression, les révisions et les enregistrements ?')) return;
      await Promise.all(['progress', 'srs', 'recordings', 'stats'].map((st) => db.clear(st)));
      location.hash = '#/';
    };
  },

  unmount() {}
};
