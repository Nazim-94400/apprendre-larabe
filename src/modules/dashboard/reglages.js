import { store } from '../../core/store.js';
import { db } from '../../core/db.js';
import { applyTheme, applyTextScale } from '../../ui/theme.js';
import * as recorder from '../../core/recorder.js';

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
          <label class="row"><span>Afficher la traduction française</span>
            <input id="f-trad" type="checkbox" ${s.showTranslation ? 'checked' : ''}></label>
          <p class="ar ar-center" style="margin:var(--sp-4) 0 0">\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650</p>
          <p class="small muted ar-center" style="text-align:center">Aperçu de la taille de lecture</p>
        </section>

        <section class="card">
          <h2>Stockage</h2>
          <p class="small muted">${fmtUsage(usage)}</p>
          <p class="small muted">L\u2019audio de récitation n\u2019est jamais téléchargé
            automatiquement : il se télécharge sourate par sourate, à ta demande.</p>

          <div class="row"><span>Audio hors ligne
              <span class="small muted" id="audio-info">…</span></span>
            <button class="btn btn-ghost small-btn" type="button" id="clear-audio">Libérer</button></div>

          <div class="row"><span>Tes enregistrements
              <span class="small muted" id="rec-info">…</span></span>
            <button class="btn btn-ghost small-btn" type="button" id="clear-rec">Supprimer</button></div>
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
    el.querySelector('#f-trad').onchange = (e) => store.set({ showTranslation: e.target.checked });

    /* ---- stockage ---- */

    const fmtSize = (b) => (b > 1048576
      ? `${(b / 1048576).toFixed(1)} Mo`
      : `${Math.max(1, Math.round(b / 1024))} Ko`);

    // Le cache audio n'expose pas sa taille : on additionne les Content-Length des
    // réponses stockées. C'est un aller-retour par fichier, mais tout est déjà en
    // cache — donc local et rapide.
    async function audioStats() {
      if (!('caches' in window)) return null;
      const c = await caches.open('audio').catch(() => null);
      if (!c) return null;
      const keys = await c.keys();
      let bytes = 0;
      for (const k of keys) {
        const r = await c.match(k);
        const len = Number(r?.headers.get('content-length') ?? 0);
        bytes += len || (await r.clone().blob()).size;
      }
      return { count: keys.length, bytes };
    }

    async function refreshStorage() {
      const [audio, rec] = await Promise.all([audioStats(), recorder.usage()]);
      const a = el.querySelector('#audio-info');
      const r = el.querySelector('#rec-info');
      if (a) {
        a.textContent = audio
          ? (audio.count ? `— ${audio.count} versets, ${fmtSize(audio.bytes)}` : '— aucun')
          : '— indisponible';
        el.querySelector('#clear-audio').disabled = !audio?.count;
      }
      if (r) {
        r.textContent = rec.count ? `— ${rec.count} prises, ${fmtSize(rec.bytes)}` : '— aucune';
        el.querySelector('#clear-rec').disabled = !rec.count;
      }
    }

    el.querySelector('#clear-audio').onclick = async () => {
      if (!confirm('Supprimer tout l’audio téléchargé ? Il faudra le retélécharger pour écouter hors ligne.')) return;
      await caches.delete('audio');
      await refreshStorage();
    };

    el.querySelector('#clear-rec').onclick = async () => {
      if (!confirm('Supprimer tous tes enregistrements ? Ils ne sont nulle part ailleurs.')) return;
      await db.clear('recordings');
      await refreshStorage();
    };

    refreshStorage();

    el.querySelector('#f-reset').onclick = async () => {
      if (!confirm('Effacer toute la progression, les révisions et les enregistrements ?')) return;
      await Promise.all(['progress', 'srs', 'recordings', 'stats'].map((st) => db.clear(st)));
      location.hash = '#/';
    };
  },

  unmount() {}
};
