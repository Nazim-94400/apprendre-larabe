/**
 * Répétition espacée — SM-2 simplifié.
 *
 * Une carte est un identifiant, une facilité, un intervalle et une échéance. Le
 * store `srs` accepte indifféremment un verset (`"2:255"`), une lettre
 * (`"letter:dhad"`), une règle (`"rule:ikhfa"`) ou un mot (`"vocab:rabb"`) : un seul
 * moteur couvre donc la mémorisation du Coran, la révision des lettres et le
 * vocabulaire, au lieu de trois systèmes qui divergeraient.
 *
 * Écarts assumés par rapport au SM-2 d'origine :
 *
 *  - Quatre notes au lieu de six. Demander à quelqu'un qui récite de s'auto-évaluer
 *    sur une échelle de 0 à 5 produit du bruit ; « oublié / difficile / correct /
 *    facile » se répond sans réfléchir.
 *  - Un échec ne remet pas l'intervalle à un jour mais à dix minutes, dans la même
 *    séance. Un verset oublié doit être revu tout de suite, pas le lendemain.
 *  - La facilité est bornée à 1,3 pour éviter les cartes qui reviennent sans fin,
 *    et à 2,8 pour éviter qu'une carte trop vite jugée facile ne disparaisse un an.
 */

import { db } from './db.js';

export const GRADES = [
  { id: 0, key: 'again', label: 'Oublié',    hint: 'Revoir dans quelques minutes' },
  { id: 1, key: 'hard',  label: 'Difficile', hint: 'Retrouvé avec peine' },
  { id: 2, key: 'good',  label: 'Correct',   hint: 'Retrouvé sans hésiter' },
  { id: 3, key: 'easy',  label: 'Facile',    hint: 'Immédiat' }
];

const DAY = 86400000;
const MIN = 60000;
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const newCard = (id) => ({
  id, ease: 2.5, interval: 0, reps: 0, lapses: 0,
  due: Date.now(), created: new Date().toISOString(), last: null
});

/**
 * Applique une note et renvoie la carte mise à jour.
 * `interval` est en jours ; 0 signifie « dans la séance ».
 */
export function grade(card, g) {
  const c = { ...card };
  c.last = new Date().toISOString();

  if (g === 0) {
    c.lapses++;
    c.reps = 0;
    c.interval = 0;
    c.ease = clamp(c.ease - 0.2, EASE_MIN, EASE_MAX);
    c.due = Date.now() + 10 * MIN;
    return c;
  }

  c.reps++;

  if (g === 1) {
    c.ease = clamp(c.ease - 0.15, EASE_MIN, EASE_MAX);
    c.interval = c.interval < 1 ? 1 : Math.max(1, Math.round(c.interval * 1.2));
  } else if (g === 2) {
    c.interval = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(c.interval * c.ease);
  } else {
    c.ease = clamp(c.ease + 0.15, EASE_MIN, EASE_MAX);
    c.interval = c.reps === 1 ? 2 : c.reps === 2 ? 5 : Math.round(c.interval * c.ease * 1.3);
  }

  c.interval = Math.min(c.interval, 365);
  c.due = Date.now() + c.interval * DAY;
  return c;
}

/* ─────────────────────────── accès au store ─────────────────────────── */

export const get = (id) => db.get('srs', id);

export async function put(card) {
  await db.set('srs', card.id, card);
  return card;
}

/** Note une carte, en la créant si besoin. */
export async function review(id, g) {
  const card = (await get(id)) ?? newCard(id);
  return put(grade(card, g));
}

/** Cartes arrivées à échéance, les plus en retard d'abord. */
export async function due(prefix = '', limit = 50) {
  const list = await db.upTo('srs', 'due', Date.now()).catch(() => []);
  return list
    .filter((c) => !prefix || String(c.id).startsWith(prefix))
    .sort((a, b) => a.due - b.due)
    .slice(0, limit);
}

/** Toutes les cartes d'un préfixe, échues ou non. */
export async function all(prefix = '') {
  const list = await db.getAll('srs').catch(() => []);
  return prefix ? list.filter((c) => String(c.id).startsWith(prefix)) : list;
}

/**
 * Répartition d'un ensemble de cartes.
 * Le seuil de 21 jours marque le passage de « en cours » à « acquis » : c'est
 * l'intervalle à partir duquel un verset tient sans effort conscient.
 */
export function summarize(cards) {
  const now = Date.now();
  let learning = 0, known = 0, dueNow = 0;
  for (const c of cards) {
    if (c.due <= now) dueNow++;
    if (c.interval >= 21) known++; else learning++;
  }
  return { total: cards.length, learning, known, due: dueNow };
}

/** Formulation lisible du prochain rappel, pour les boutons de notation. */
export function nextLabel(card, g) {
  const c = grade(card ?? newCard('x'), g);
  if (c.interval === 0) return '10 min';
  if (c.interval === 1) return '1 jour';
  if (c.interval < 30) return `${c.interval} jours`;
  const months = Math.round(c.interval / 30);
  return months === 1 ? '1 mois' : `${months} mois`;
}
