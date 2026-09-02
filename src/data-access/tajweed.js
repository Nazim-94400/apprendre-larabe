/**
 * Transforme un verset et ses annotations en HTML coloré.
 *
 * Le texte n'est jamais modifié : les annotations sont des intervalles de points de
 * code, et le rendu se contente de découper la chaîne à leurs frontières. C'est ce
 * qui permet de désactiver la coloration, de changer de jeu de règles, ou de
 * superposer le surlignage de lecture guidée sans jamais toucher au texte source.
 *
 * Deux difficultés réelles :
 *
 *   1. Les intervalles se chevauchent. Un madd peut recouvrir une ghunna. Un simple
 *      « une balise par règle » produirait des balises croisées, donc du HTML
 *      invalide. On procède par balayage : on découpe aux frontières, et chaque
 *      segment ne porte qu'une couleur, celle de la règle la plus prioritaire.
 *
 *   2. Certaines règles enjambent une espace — un noun sâkin en fin de mot dont
 *      l'ikhfâ dépend de la lettre initiale du mot suivant. Comme le découpage par
 *      mot est indispensable au surlignage synchronisé, on découpe d'abord par mot,
 *      puis on rogne les intervalles sur chaque mot. Le rendu est identique.
 */

/**
 * Priorité de coloration, du plus fort au plus faible. Une règle articulatoire
 * l'emporte sur un allongement, qui l'emporte sur une indication d'élision : quand
 * deux règles se recouvrent, on montre celle qui demande une action au lecteur.
 */
const PRIORITY = [
  'qalqalah',
  'iqlab',
  'idghaam_ghunnah', 'idghaam_no_ghunnah', 'idghaam_shafawi',
  'idghaam_mutajanisayn', 'idghaam_mutaqaribayn',
  'ikhfa', 'ikhfa_shafawi',
  'ghunnah',
  'madd_6', 'madd_muttasil', 'madd_munfasil', 'madd_246', 'madd_2',
  'lam_shamsiyyah',
  'hamzat_wasl',
  'silent'
];

const RANK = new Map(PRIORITY.map((r, i) => [r, i]));
const rank = (r) => RANK.get(r) ?? Number.MAX_SAFE_INTEGER;

const escape = (s) => s.replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Un jeton est un mot s'il contient au moins une lettre arabe.
 *
 * Le texte Uthmani sépare par des espaces des symboles qui n'en sont pas : marques
 * de pause (ۖ ۗ ۚ), signe de rub el hizb (۞), sajdah (۩). Les compter comme des mots
 * décale la numérotation, et le surlignage synchronisé éclaire alors le mot suivant
 * — silencieusement, puisque les index restent dans les bornes.
 *
 * Cette fonction est la définition unique du mot pour tout le projet : le rendu, les
 * exercices d'identification et la génération des horodatages l'utilisent tous. Deux
 * définitions séparées finiraient par diverger, et c'est exactement ce qui s'est
 * produit avant qu'elle n'existe.
 */
export const isWord = (token) => /[ء-يٮ-ۓۺ-ۿ]/.test(token);

/** Découpe un verset en jetons {text, isWord, start, end}, positions d'origine incluses. */
export function tokenize(text) {
  const out = [];
  let pos = 0;
  for (const chunk of text.split(/(\s+)/)) {
    if (!chunk.length) continue;
    const start = pos;
    pos += chunk.length;
    out.push({
      text: chunk,
      space: /^\s+$/.test(chunk),
      word: !/^\s+$/.test(chunk) && isWord(chunk),
      start,
      end: pos
    });
  }
  return out;
}

/**
 * Découpe [start, end) d'un texte en segments homogènes selon les règles actives.
 * Renvoie [{ from, to, rule }] où `rule` peut être null.
 */
function segments(rules, from, to) {
  const bounds = new Set([from, to]);
  for (const r of rules) {
    if (r.end > from && r.start < to) {
      bounds.add(Math.max(r.start, from));
      bounds.add(Math.min(r.end, to));
    }
  }

  const points = [...bounds].sort((a, b) => a - b);
  const out = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (a >= b) continue;

    let best = null;
    for (const r of rules) {
      if (r.start <= a && r.end >= b && (best === null || rank(r.rule) < rank(best))) {
        best = r.rule;
      }
    }
    out.push({ from: a, to: b, rule: best });
  }
  return out;
}

/**
 * Rend un verset en HTML.
 *
 * @param {string} text   texte du verset, intact
 * @param {Array}  rules  [{ rule, start, end }] — peut être vide
 * @param {object} [opts]
 * @param {boolean} [opts.words=true]  encapsuler chaque mot (surlignage guidé)
 * @returns {string} HTML
 */
export function render(text, rules = [], opts = {}) {
  const withWords = opts.words !== false;
  const html = [];
  let wordIndex = 0;

  // Découpage en conservant les espaces : les positions doivent rester celles du
  // texte d'origine, sur lesquelles portent les annotations.
  for (const t of tokenize(text)) {
    if (t.space) { html.push(t.text); continue; }

    const inner = segments(rules, t.start, t.end).map(({ from, to, rule }) => {
      const frag = escape(text.slice(from, to));
      return rule
        ? `<span class="tj tj-${rule}" style="--tj-color:var(--tj-${rule})">${frag}</span>`
        : frag;
    }).join('');

    // Une marque de pause est rendue, mais ne reçoit pas de numéro de mot.
    if (!withWords || !t.word) html.push(inner);
    else html.push(`<span class="w" data-w="${++wordIndex}">${inner}</span>`);
  }

  return html.join('');
}

/** Règles distinctes présentes dans un verset, triées par priorité. Sert aux légendes. */
export function rulesUsed(rules = []) {
  return [...new Set(rules.map((r) => r.rule))].sort((a, b) => rank(a) - rank(b));
}

export { PRIORITY };

/**
 * Indices des mots (1-based, comme `data-w` dans le rendu) touchés par une règle.
 *
 * Sert aux exercices d'identification : on demande de désigner le mot où la règle
 * s'applique, et la correction vient des annotations vérifiées plutôt que d'une
 * réponse saisie à la main.
 */
export function wordsWithRule(text, rules, ruleId) {
  const targets = rules.filter((r) => r.rule === ruleId);
  if (!targets.length) return new Set();

  const hits = new Set();
  let w = 0;
  for (const t of tokenize(text)) {
    if (!t.word) continue;
    w++;
    if (targets.some((r) => r.start < t.end && r.end > t.start)) hits.add(w);
  }
  return hits;
}
