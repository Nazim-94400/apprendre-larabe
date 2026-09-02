/**
 * Prononciation d'une lettre ou d'une syllabe — trois sources, par ordre de valeur.
 *
 *   1. Un enregistrement réel, déposé dans assets/audio/letters/ et déclaré dans
 *      data/lessons/letter-audio.json. C'est la seule source qui fasse autorité.
 *   2. Pour trois lettres, l'audio du Coran lui-même. Les lettres liminaires de
 *      certaines sourates sont récitées isolément : ص (38:1), ق (50:1), ن (68:1)
 *      forment à elles seules tout leur verset. Al-Husary les y prononce donc
 *      seules — une référence authentique, déjà sous licence, pour trois lettres
 *      sur vingt-huit.
 *   3. La synthèse vocale du navigateur, quand une voix arabe est installée.
 *      Utile pour repérer, jamais pour imiter : les points d'articulation fins,
 *      précisément ceux du Module 2, y sont approximatifs.
 *
 * Faute des trois, le bouton est désactivé et dit pourquoi. Un bouton d'écoute
 * muet est pire que pas de bouton : l'apprenant croit son appareil en panne.
 */

import * as speech from './speech.js';
import { audioUrl } from './audio-player.js';

const BASE = new URL('../../data/lessons/', import.meta.url);

/**
 * Lettres que le Coran prononce isolément, dans les lettres liminaires.
 * Chacune constitue à elle seule le premier verset de sa sourate.
 */
const FROM_QURAN = {
  sad: { verse: '38:1', surah: 'Sâd' },
  qaf: { verse: '50:1', surah: 'Qâf' },
  nun: { verse: '68:1', surah: 'Al-Qalam' }
};

/** Suffixe de fichier par voyelle. `name` est le nom de la lettre. */
const VOWEL_KEY = { 'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ْ': 'sukun', '': 'name' };

let manifest = null;
const load = () => (manifest ??= fetch(new URL('letter-audio.json', BASE))
  .then((r) => (r.ok ? r.json() : { base: '', clips: {} }))
  .catch(() => ({ base: '', clips: {} })));

let current = null;

function play(url) {
  current?.pause();
  current = new Audio(url);
  current.crossOrigin = 'anonymous';
  return current.play().then(() => true).catch(() => false);
}

/**
 * Qu'est-ce qui est disponible pour cette lettre et cette voyelle ?
 * @returns {Promise<{kind:'recording'|'quran'|'speech'|'none', note?:string}>}
 */
export async function sourceFor(letterId, mark = '') {
  // Un signe inconnu — une prolongation « َا » du Module 4, par exemple — n'a pas
  // de fichier prévu. Il ne doit surtout pas retomber sur la clé « name », sinon
  // le bouton jouerait le nom de la lettre à la place de la syllabe demandée.
  const key = Object.prototype.hasOwnProperty.call(VOWEL_KEY, mark)
    ? VOWEL_KEY[mark] : null;
  const m = await load();

  if (key && m.clips?.[letterId]?.[key]) return { kind: 'recording' };

  if (key === 'name' && FROM_QURAN[letterId]) {
    const q = FROM_QURAN[letterId];
    return {
      kind: 'quran',
      note: `Prononcée par Al-Husary dans la sourate ${q.surah} (${q.verse}), où cette lettre forme à elle seule le verset.`
    };
  }

  if (speech.available()) {
    return {
      kind: 'speech',
      note: 'Voix de synthèse du navigateur — utile pour repérer le son, pas pour l’imiter.'
    };
  }

  return {
    kind: 'none',
    note: 'Aucun enregistrement pour cette lettre, et aucune voix arabe installée sur cet appareil.'
  };
}

/**
 * Joue la prononciation. Renvoie la source réellement utilisée, pour que
 * l'interface puisse dire à l'apprenant ce qu'il vient d'entendre.
 */
export async function pronounce(letterId, text, mark = '', reciterId = 'husary_muallim') {
  const src = await sourceFor(letterId, mark);

  if (src.kind === 'recording') {
    const m = await load();
    const file = m.clips[letterId][VOWEL_KEY[mark] ?? 'name'];
    if (await play(new URL(m.base + file, document.baseURI).href)) return src;
  }

  if (src.kind === 'quran') {
    const url = await audioUrl(reciterId, FROM_QURAN[letterId].verse);
    if (await play(url)) return src;
  }

  if (src.kind === 'speech') {
    await speech.speak(text);
    return src;
  }

  return src;
}

export function stop() {
  current?.pause();
  current = null;
  speech.stop();
}

/** Combien de lettres disposent d'un vrai enregistrement. Pour l'écran Réglages. */
export async function coverage() {
  const m = await load();
  const ids = Object.keys(m.clips ?? {});
  return {
    letters: ids.length,
    clips: ids.reduce((n, id) => n + Object.keys(m.clips[id]).length, 0),
    fromQuran: Object.keys(FROM_QURAN).length
  };
}

export { FROM_QURAN };
