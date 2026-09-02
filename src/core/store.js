/**
 * État applicatif partagé + abonnements. Volontairement minuscule : l'application
 * n'a qu'un profil local et pas de synchronisation, un magasin observable suffit.
 */

import { db } from './db.js';

const DEFAULTS = {
  theme: 'auto',          // auto | light | dark
  textScale: 1,           // 0.9 .. 1.6
  reciter: 'husary_muallim',
  playbackRate: 1,        // 0.5 .. 1.5
  tajweedColors: true,
  showTashkil: true,
  showTranslit: true,
  showTranslation: true,
  translation: 'fr'
};

const listeners = new Set();
let state = { ...DEFAULTS, ready: false };

export const store = {
  get: () => state,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Met a jour l'etat, prévient les abonnés, et persiste les préférences. */
  async set(patch) {
    state = { ...state, ...patch };
    for (const fn of listeners) fn(state);
    const prefs = { ...state };
    delete prefs.ready;
    await db.set('profile', 'default', prefs);
  },

  async load() {
    const saved = await db.get('profile', 'default').catch(() => null);
    state = { ...DEFAULTS, ...(saved || {}), ready: true };
    for (const fn of listeners) fn(state);
    return state;
  }
};
