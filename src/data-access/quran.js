/**
 * Accès au texte coranique. Chargement à la demande, une sourate à la fois.
 *
 * Les 114 sourates pèsent environ 1,8 Mo de texte et 4 Mo d'annotations : les charger
 * d'un bloc rendrait le premier affichage inutilement lent alors qu'une leçon ne
 * porte jamais que sur une sourate. Chaque fichier n'est lu qu'une fois, puis
 * conservé en mémoire ; le service worker s'occupe de la persistance hors ligne.
 */

const BASE = new URL('../../data/quran/', import.meta.url);
const pad = (n) => String(n).padStart(3, '0');

/** Une promesse par ressource : deux appels simultanés ne déclenchent qu'un fetch. */
const cache = new Map();

function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(new URL(path, BASE)).then((r) => {
      if (!r.ok) throw new Error(`${path} : HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
}

/** Métadonnées des 114 sourates. */
export const surahs = () => load('surahs.json').then((d) => d.surahs);

export async function surah(id) {
  const list = await surahs();
  return list.find((s) => s.id === Number(id));
}

/** Tous les versets d'une sourate : [{ key, n, text }]. */
export async function ayahs(surahId) {
  const d = await load(`text/${pad(surahId)}.json`);
  return Object.entries(d.ayahs).map(([n, v]) => ({
    key: `${d.surah}:${n}`,
    n: Number(n),
    text: v.text
  }));
}

/** Un verset, désigné par sa clé pivot (« 2:255 ») ou par sourate et numéro. */
export async function ayah(key, n) {
  const [s, a] = n == null ? String(key).split(':') : [key, n];
  const d = await load(`text/${pad(s)}.json`);
  const v = d.ayahs[String(a)];
  return v ? { key: `${Number(s)}:${Number(a)}`, n: Number(a), text: v.text } : null;
}

/**
 * Annotations de tajweed d'une sourate, indexées par clé de verset.
 * Renvoie une Map vide si le fichier est absent — la coloration est un enrichissement,
 * son absence ne doit jamais empêcher la lecture du texte.
 */
export async function tajweed(surahId) {
  try {
    const d = await load(`tajweed/${pad(surahId)}.json`);
    return new Map(Object.entries(d.ayahs));
  } catch {
    return new Map();
  }
}

/** Vide le cache mémoire. Utile aux tests ; sans effet sur le cache du service worker. */
export const clearCache = () => cache.clear();
