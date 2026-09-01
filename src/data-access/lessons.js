/**
 * Accès aux données pédagogiques : alphabet, makhârij, règles, parcours, vocabulaire.
 *
 * Même stratégie que pour le Coran : un fetch par fichier, mémoïsé, le service
 * worker se chargeant de la persistance hors ligne.
 */

const BASE = new URL('../../data/lessons/', import.meta.url);
const cache = new Map();

function load(file) {
  if (!cache.has(file)) {
    cache.set(file, fetch(new URL(file, BASE)).then((r) => {
      if (!r.ok) throw new Error(`${file} : HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { cache.delete(file); throw e; }));
  }
  return cache.get(file);
}

export const alphabet = () => load('alphabet.json');
export const makharij = () => load('makharij.json');
export const tajweedRules = () => load('tajweed-rules.json');
export const curriculum = () => load('curriculum.json');

/** Une lettre par son identifiant. */
export async function letter(id) {
  const { letters } = await alphabet();
  return letters.find((l) => l.id === id) ?? null;
}

/** Index identifiant → lettre, pratique pour résoudre les listes de makhârij. */
export async function letterIndex() {
  const { letters } = await alphabet();
  return new Map(letters.map((l) => [l.id, l]));
}
