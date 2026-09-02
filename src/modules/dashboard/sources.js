/**
 * Écran d'attribution. Obligatoire, pas décoratif : les conditions de Tanzil, la
 * licence CC BY-NC d'EveryAyah et le partage à l'identique du document AL-LAWH
 * exigent tous une mention de la source et un lien.
 *
 * Cette liste ne cite que ce qui est réellement utilisé. Le Quranic Arabic Corpus y
 * a figuré un temps alors qu'il n'a jamais été intégré : une attribution de trop est
 * une affirmation fausse, au même titre qu'une attribution manquante.
 *
 * Voir docs/03-sources-et-licences.md pour le détail.
 */

const SOURCES = [
  { name: 'Tanzil Project', url: 'https://tanzil.net/',
    what: 'Texte coranique, édition Uthmani',
    license: 'Copie verbatim autorisée, modification interdite, source à citer.' },

  { name: 'quran-tajweed (cpfair)', url: 'https://github.com/cpfair/quran-tajweed',
    what: 'Annotations des règles de tajweed, par offsets de caractères',
    license: 'CC BY 4.0' },

  { name: 'quran-align (cpfair)', url: 'https://github.com/cpfair/quran-align',
    what: 'Horodatages mot à mot, pour le surlignage synchronisé',
    license: 'CC BY 4.0' },

  { name: 'EveryAyah', url: 'https://everyayah.com/',
    what: 'Audio de récitation, verset par verset',
    license: 'CC BY-NC — usage non commercial, lien retour obligatoire.' },

  { name: 'Muhammad Hamidullah, via Tanzil', url: 'https://tanzil.net/trans/',
    what: 'Traduction française des 6 236 versets',
    license: 'Usage non commercial autorisé par Tanzil ; accord du traducteur ou de l’éditeur requis pour tout autre usage.' },

  { name: '« 80% des mots du Qour’ân » — AL-LAWH',
    url: 'https://creativecommons.org/licenses/by-nc-sa/3.0/fr/',
    what: 'Une partie des sens français du vocabulaire, relus et corrigés',
    license: 'CC BY-NC-SA 3.0 FR — attribution et partage à l’identique.' },

  { name: 'Amiri, Amiri Quran et Scheherazade New', url: 'https://software.sil.org/scheherazade/',
    what: 'Polices arabes',
    license: 'SIL Open Font License 1.1' }
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default {
  title: 'Sources et licences',

  async mount(el) {
    el.innerHTML = `
      <div class="stack">
        <p class="muted small">Cette application est un projet d’apprentissage
          <strong>non commercial</strong>. Deux de ses sources l’imposent, et ce
          n’est pas une formalité : l’audio de récitation et une partie du
          vocabulaire sont sous licence non commerciale.</p>

        ${SOURCES.map((s) => `
          <section class="card">
            <h3 style="margin-bottom:var(--sp-1)">
              <a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)}</a></h3>
            <p class="small" style="margin-bottom:var(--sp-1)">${esc(s.what)}</p>
            <p class="small muted" style="margin:0">${esc(s.license)}</p>
          </section>`).join('')}

        <p class="small muted">Les contenus rédigés pour le projet — points
          d’articulation, règles de tajwîd, sens de vocabulaire, noms de sourates —
          sont à faire relire par une personne qualifiée. Ils sont signalés comme tels
          dans les fichiers de données.</p>
      </div>`;
  },

  unmount() {}
};
