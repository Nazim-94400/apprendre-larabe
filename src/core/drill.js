/**
 * Tirage des questions d'exercice.
 *
 * ── Le problème ─────────────────────────────────────────────────────────────────
 *
 * Un tirage uniforme sur 29 lettres qui n'en propose que 12 laisse, à chaque
 * session, plus de la moitié de l'alphabet de côté — et rien n'empêche de
 * retomber trois fois de suite sur les mêmes. Quelqu'un qui fait deux séances et
 * s'arrête n'aura vu qu'une fraction du matériau, et pas celle qu'il maîtrise le
 * moins.
 *
 * ── Le tirage retenu ────────────────────────────────────────────────────────────
 *
 * Chaque item porte un poids :
 *
 *     poids = (1 + 2 × ratés) / (1 + vus)
 *
 * Un item jamais rencontré vaut 1 ; un item vu dix fois sans erreur vaut 0,09 ;
 * un item vu deux fois et raté deux fois vaut 1,67. L'inconnu passe donc avant le
 * su, et l'erreur revient plus vite — sans jamais exclure quoi que ce soit, ce qui
 * garderait un item raté hors de portée.
 *
 * Le tirage reste aléatoire, pondéré : deux séances de suite ne donnent pas la
 * même liste, mais elles couvrent l'ensemble bien plus vite qu'un tirage uniforme.
 */

import { db } from './db.js';

let cache = null;

async function all() {
  if (cache) return cache;
  const keys = await db.keys('drill').catch(() => []);
  const values = await Promise.all(keys.map((k) => db.get('drill', k)));
  cache = new Map(keys.map((k, i) => [k, values[i]]));
  return cache;
}

/** Enregistre le passage sur un item. */
export async function record(id, ok) {
  const map = await all();
  const prev = map.get(id) ?? { seen: 0, wrong: 0, last: null };
  const next = {
    seen: prev.seen + 1,
    wrong: prev.wrong + (ok ? 0 : 1),
    last: new Date().toISOString()
  };
  map.set(id, next);
  await db.set('drill', id, next);
  return next;
}

/** Enregistre une série de résultats en une fois, à la fin d'un exercice. */
export async function recordAll(results) {
  for (const { id, ok } of results) await record(id, ok);
}

/**
 * Tire `n` items pondérés par ce qui reste à apprendre.
 *
 * @param {Array} items      objets quelconques
 * @param {number} n
 * @param {(item:any)=>string} keyOf  identifiant stable de l'item
 */
export async function pick(items, n, keyOf = (x) => x.id) {
  const stats = await all();
  const pool = items.map((item) => {
    const s = stats.get(keyOf(item)) ?? { seen: 0, wrong: 0 };
    return { item, weight: (1 + 2 * s.wrong) / (1 + s.seen) };
  });

  const out = [];
  while (out.length < n && pool.length) {
    let total = 0;
    for (const p of pool) total += p.weight;
    let r = Math.random() * total;
    let i = 0;
    while (i < pool.length - 1 && (r -= pool[i].weight) > 0) i++;
    out.push(pool.splice(i, 1)[0].item);
  }
  return out;
}

/** Couverture d'un ensemble : combien d'items ont déjà été rencontrés. */
export async function coverage(items, keyOf = (x) => x.id) {
  const stats = await all();
  const seen = items.filter((i) => (stats.get(keyOf(i))?.seen ?? 0) > 0).length;
  return { seen, total: items.length, ratio: items.length ? seen / items.length : 0 };
}

export function reset() { cache = null; }
