/**
 * Catalogue des modules pédagogiques. Le routeur charge `src/modules/<id>/index.js`
 * à la demande : ajouter un module = déposer un dossier + une entrée ici.
 *
 * `phase` renvoie à la feuille de route (docs/02-architecture-fichiers.md).
 * `state` décrit ce qui est réellement implémenté, pour que l'accueil ne promette
 * rien qui n'existe pas encore.
 */

export const MODULES = [
  { id: '01-fondations',  n: 1, phase: 1, state: 'todo',
    title: 'Fondations',
    subtitle: 'Alphabet, formes, tracé, tashkîl',
    icon: '\u0623' },

  { id: '02-makharij',    n: 2, phase: 1, state: 'todo',
    title: 'Makhârij al-Hurûf',
    subtitle: 'Points d\u2019articulation et discrimination auditive',
    icon: '\u0639' },

  { id: '03-tajweed',     n: 3, phase: 2, state: 'todo',
    title: 'Règles de Tajweed',
    subtitle: 'Noun sâkina, madd, qalqala, ghunna, râ, lâm',
    icon: '\u062C' },

  { id: '04-lecture',     n: 4, phase: 2, state: 'todo',
    title: 'Lecture progressive',
    subtitle: 'Des syllabes aux sourates, en lecture guidée',
    icon: '\u0642' },

  { id: '05-recitation',  n: 5, phase: 3, state: 'todo',
    title: 'Récitation',
    subtitle: 'Enregistrement, comparaison, validation verset par verset',
    icon: '\u062A' },

  { id: '06-hifz',        n: 6, phase: 4, state: 'todo',
    title: 'Mémorisation',
    subtitle: 'Masquage progressif et révision espacée',
    icon: '\u062D' },

  { id: '07-vocabulaire', n: 7, phase: 4, state: 'todo',
    title: 'Vocabulaire coranique',
    subtitle: 'Mots fréquents, racines trilitères, quiz sur versets',
    icon: '\u0643' }
];

export const byId = (id) => MODULES.find((m) => m.id === id);

export const PHASES = {
  1: 'Fondations',
  2: 'Lecture guidée',
  3: 'Récitation active',
  4: 'Mémorisation et suivi'
};
