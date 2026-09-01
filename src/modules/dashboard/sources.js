/**
 * Écran d'attribution. Obligatoire, pas décoratif : les conditions de Tanzil,
 * la licence CC BY-NC d'EveryAyah et la GPL du corpus exigent toutes une mention
 * de la source et un lien. Voir docs/03-sources-et-licences.md.
 */

const SOURCES = [
  { name: 'Tanzil Project', url: 'https://tanzil.net/',
    what: 'Texte coranique, édition Uthmani',
    license: 'Copie verbatim autorisée, modification interdite, source à citer.' },
  { name: 'quran-tajweed (cpfair)', url: 'https://github.com/cpfair/quran-tajweed',
    what: 'Annotations des règles de tajweed, par offsets de caractères',
    license: 'CC BY 4.0' },
  { name: 'EveryAyah', url: 'https://everyayah.com/',
    what: 'Audio de récitation, verset par verset',
    license: 'CC BY-NC \u2014 usage non commercial, lien retour obligatoire.' },
  { name: 'Quranic Arabic Corpus', url: 'https://corpus.quran.com/',
    what: 'Découpage mot à mot, racines trilitères, morphologie',
    license: 'GNU GPL \u2014 source à citer.' },
  { name: 'Amiri et Scheherazade New', url: 'https://software.sil.org/scheherazade/',
    what: 'Polices arabes',
    license: 'SIL Open Font License 1.1' }
];

export default {
  title: 'Sources et licences',

  async mount(el) {
    el.innerHTML = `
      <div class="stack">
        <p class="muted small">Cette application est un projet d\u2019apprentissage
          non commercial. Chaque source de données est citée ci-dessous, conformément
          à sa licence.</p>
        ${SOURCES.map((s) => `
          <section class="card">
            <h3 style="margin-bottom:var(--sp-1)">
              <a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></h3>
            <p class="small" style="margin-bottom:var(--sp-1)">${s.what}</p>
            <p class="small muted" style="margin:0">${s.license}</p>
          </section>`).join('')}
      </div>`;
  },

  unmount() {}
};
