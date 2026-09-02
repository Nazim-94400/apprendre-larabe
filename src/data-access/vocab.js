/**
 * Accès au vocabulaire coranique.
 *
 * `normalize` est la définition unique de la forme canonique d'un mot : elle sert
 * à compter les occurrences au moment de la génération et à retrouver le mot dans
 * un verset au moment de l'affichage. Deux définitions séparées finiraient par
 * diverger, et le mot ne serait plus surligné dans ses propres exemples.
 */

import { tokenize } from './tajweed.js';

const BASE = new URL('../../data/vocab/', import.meta.url);
let cache = null;

/**
 * Forme canonique : sans tashkîl ni tatweel, variantes graphiques unifiées.
 * On ne modifie jamais le texte affiché — cette forme ne sert que de clé.
 */
export function normalize(w) {
  return w
    .replace(/[ً-ِّ-ٰٕۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function load() {
  if (!cache) {
    cache = fetch(new URL('frequency.json', BASE))
      .then((r) => r.json())
      .catch((e) => { cache = null; throw e; });
  }
  return cache;
}

/** Mots traduits uniquement — les autres n'ont pas leur place dans un quiz. */
export async function glossed() {
  const { words } = await load();
  return words.filter((w) => w.fr);
}

export async function byId(id) {
  const { words } = await load();
  return words.find((w) => w.id === id) ?? null;
}

/** Thèmes présents, avec leur effectif. */
export async function themes() {
  const words = await glossed();
  const map = new Map();
  for (const w of words) map.set(w.theme, (map.get(w.theme) ?? 0) + 1);
  return [...map].sort((a, b) => b[1] - a[1]);
}

/** Indices des mots (1-based) d'un verset correspondant à une forme canonique. */
export function findInVerse(text, id) {
  const hits = new Set();
  let w = 0;
  for (const t of tokenize(text)) {
    if (!t.word) continue;
    w++;
    if (normalize(t.text) === id) hits.add(w);
  }
  return hits;
}
