/**
 * Prononciation des lettres et des syllabes.
 *
 * ── Pourquoi de la synthèse vocale, et non des enregistrements ──────────────────
 *
 * Il n'existe pas de banque libre d'enregistrements couvrant les 28 lettres et
 * leurs combinaisons avec chaque voyelle. Pour les versets, EveryAyah fournit de
 * vrais récitateurs ; pour « ba, bi, bu », rien.
 *
 * La synthèse vocale du navigateur est donc utilisée comme premier niveau. Elle est
 * imparfaite : selon l'appareil, la voix arabe peut manquer, ou rendre approximatifs
 * les points d'articulation les plus fins — précisément ceux du Module 2. C'est une
 * aide au repérage, pas une référence de prononciation, et l'interface doit le dire.
 *
 * Le jour où des enregistrements existeront, `play()` les préférera : la structure
 * de données prévoit déjà un champ `audio` par lettre.
 */

const SUPPORTED = typeof speechSynthesis !== 'undefined';

let voices = [];
let arabicVoice = null;

function pickVoice() {
  voices = speechSynthesis.getVoices();
  // Une voix explicitement arabe d'abord ; à défaut, toute voix dont la langue
  // commence par « ar ». Aucun repli sur une voix française : elle prononcerait
  // les lettres à la française, ce qui serait pire que pas de son du tout.
  arabicVoice = voices.find((v) => /^ar([-_]|$)/i.test(v.lang)) ?? null;
  return arabicVoice;
}

if (SUPPORTED) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

/** Une voix arabe est-elle réellement disponible sur cet appareil ? */
export function available() {
  if (!SUPPORTED) return false;
  if (!arabicVoice) pickVoice();
  return arabicVoice !== null;
}

/**
 * Prononce un texte arabe.
 * @param {string} text
 * @param {object} [opts]
 * @param {number} [opts.rate=0.7]  ralenti par défaut : on apprend un point d'articulation
 * @returns {Promise<boolean>} false si aucune voix arabe n'est disponible
 */
export function speak(text, opts = {}) {
  if (!available()) return Promise.resolve(false);

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = arabicVoice;
  u.lang = arabicVoice.lang;
  u.rate = opts.rate ?? 0.7;
  u.pitch = opts.pitch ?? 1;

  return new Promise((resolve) => {
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
    // Certains navigateurs n'émettent jamais `end` sur un énoncé très court.
    setTimeout(() => resolve(true), 4000);
  });
}

export function stop() {
  if (SUPPORTED) speechSynthesis.cancel();
}

/** Assemble une lettre et un signe de tashkîl en une syllabe prononçable. */
export function syllable(letter, mark = '') {
  return letter + mark;
}
