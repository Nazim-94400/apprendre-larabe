/**
 * Jours d'activité, pour la série affichée sur l'accueil.
 *
 * Un jour compte dès qu'on y a travaillé : une réponse, une révision, une leçon
 * parcourue. Ouvrir l'accueil ou les réglages ne suffit pas : la série mesure
 * le travail, pas les visites.
 *
 * Stockage : le store `stats`, une entrée par jour local (clé AAAA-MM-JJ). Le
 * jour est celui de l'appareil, pas UTC — sinon une séance faite à 23 h à Paris
 * compterait pour le lendemain.
 */

import { db } from './db.js';

const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

let touched = null;   // dernier jour déjà écrit pendant cette session

/** Marque aujourd'hui comme actif. Une écriture par jour et par session au plus. */
export async function touch() {
  const key = dayKey();
  if (touched === key) return;
  touched = key;
  try {
    const prev = await db.get('stats', key);
    await db.set('stats', key, { n: (prev?.n ?? 0) + 1 });
  } catch {
    touched = null;   // base indisponible : on retentera au prochain exercice
  }
}

/**
 * Les `n` derniers jours, du plus ancien à aujourd'hui, et la série en cours.
 *
 * La série n'est pas rompue tant que la journée n'est pas finie : si rien n'a
 * été fait aujourd'hui, elle se compte jusqu'à hier. Annoncer « 0 jour » à
 * quelqu'un qui a travaillé chaque jour de la semaine, au réveil, serait faux.
 */
export async function recent(n = 7) {
  const keys = new Set(await db.keys('stats').catch(() => []));
  const today = new Date();
  today.setHours(12, 0, 0, 0);   // midi : un changement d'heure ne décale pas le jour

  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d, key: dayKey(d), done: keys.has(dayKey(d)), today: i === 0 });
  }

  let streak = 0;
  const d = new Date(today);
  if (!keys.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (keys.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }

  return { days, streak, total: keys.size };
}
