/**
 * Progression de l'apprenant.
 *
 * Une « étape » est la plus petite unité validable : une leçon lue, un quiz réussi,
 * un verset récité. Elle est identifiée par une chaîne stable de la forme
 * `<module>:<etape>` — jamais par un index, sinon réordonner le parcours
 * réinitialiserait la progression de tout le monde.
 *
 * Le seuil de réussite est délibérément à 80 % et non à 100 % : exiger le sans-faute
 * sur un quiz de 28 lettres bloque l'apprenant sur une erreur d'inattention.
 */

import { db } from './db.js';

export const MASTERY_THRESHOLD = 0.8;

const listeners = new Set();
let cache = null;

/** Charge toute la progression en mémoire. Quelques dizaines d'entrées au plus. */
async function all() {
  if (cache) return cache;
  const keys = await db.keys('progress').catch(() => []);
  const values = await Promise.all(keys.map((k) => db.get('progress', k)));
  cache = new Map(keys.map((k, i) => [k, values[i]]));
  return cache;
}

function notify() {
  for (const fn of listeners) fn();
}

export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function get(stepId) {
  return (await all()).get(stepId) ?? null;
}

/** Une étape est acquise si elle a été validée au moins une fois. */
export async function isDone(stepId) {
  return (await get(stepId))?.status === 'done';
}

/**
 * Enregistre une tentative. Le meilleur score est conservé : repasser un quiz
 * ne doit jamais faire régresser une étape déjà acquise.
 */
export async function record(stepId, { score = null, done = null } = {}) {
  const map = await all();
  const prev = map.get(stepId) ?? { attempts: 0, best: null, status: 'todo', first: null };

  const best = score == null ? prev.best : Math.max(prev.best ?? 0, score);
  const passed = done ?? (best != null && best >= MASTERY_THRESHOLD);

  const entry = {
    attempts: prev.attempts + 1,
    best,
    status: passed || prev.status === 'done' ? 'done' : 'wip',
    first: prev.first ?? new Date().toISOString(),
    updated: new Date().toISOString()
  };

  map.set(stepId, entry);
  await db.set('progress', stepId, entry);
  notify();
  return entry;
}

/** Avancement d'un module : part des étapes acquises parmi celles déclarées. */
export async function moduleProgress(stepIds) {
  const map = await all();
  if (!stepIds.length) return { done: 0, total: 0, ratio: 0 };
  const done = stepIds.filter((id) => map.get(id)?.status === 'done').length;
  return { done, total: stepIds.length, ratio: done / stepIds.length };
}

/** Vide le cache mémoire après une réinitialisation. */
export function reset() { cache = null; notify(); }
