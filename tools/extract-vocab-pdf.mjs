/**
 * Extrait des sens français depuis « 80% des mots du Qour'ân » (AL-LAWH).
 *
 *   node tools/extract-vocab-pdf.mjs
 *
 * Produit tools/vocab-gloss-candidats.json : des propositions, PAS des données
 * finales. Elles sont destinées à être relues puis fondues dans vocab-gloss.json.
 *
 * ── Comment l'appariement est validé ────────────────────────────────────────────
 *
 * Le PDF présente deux colonnes, français à gauche et arabe à droite. En mode
 * `-table`, pdftotext restitue les deux sur la même ligne — mais rien ne garantit
 * qu'une ligne donnée soit bien une paire, ni que l'arabe ait été lu correctement.
 *
 * Le garde-fou est le texte coranique lui-même : chaque mot arabe extrait est
 * normalisé, puis cherché dans data/vocab/frequency.json, qui est comptée sur le
 * texte. Un mot qui ne s'y trouve pas est écarté. On ne retient donc que les
 * appariements dont le membre arabe existe réellement dans le Coran sous cette
 * forme — ce qui élimine d'un coup les lignes mal découpées et les glyphes mal lus.
 *
 * ── Normalisation ───────────────────────────────────────────────────────────────
 *
 * Le PDF encode l'arabe en Arabic Presentation Forms (U+FB50–FEFF), la forme
 * contextuelle des glyphes et non les lettres. NFKC les ramène aux lettres de base.
 * Sans cela, aucun mot ne correspondrait, alors qu'ils sont visuellement identiques.
 *
 * ── Licence ─────────────────────────────────────────────────────────────────────
 *
 * Le document est en CC BY-NC-SA 3.0 FR. Reprendre ses gloses impose l'attribution
 * et le partage à l'identique de cette partie. Voir docs/03-sources-et-licences.md.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from '../src/data-access/vocab.js';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PDF = join(ROOT, '_drive', '80_DES_MOTS_DU_QURAN.pdf');
const OUT = join(ROOT, 'tools', 'vocab-gloss-candidats.json');

/** Les fiches de vocabulaire commencent après l'introduction. */
const FIRST_PAGE = 20;
const LAST_PAGE = 58;

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const LATIN = /[A-Za-zÀ-ÿ]/;

/** Retire les marques bidi et les caractères de contrôle que pdftotext insère. */
const clean = (s) => s
  .replace(/[​-‏‪-‮⁦-⁩]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Chemin de pdftotext. Sur Windows, execFile n'applique pas la résolution de
 * PATHEXT : « pdftotext » seul échoue là où « pdftotext.exe » fonctionne.
 */
const CANDIDATES = process.platform === 'win32'
  ? ['pdftotext.exe', 'C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe']
  : ['pdftotext'];

let BIN = null;

/**
 * `pdftotext -v` affiche sa version puis sort avec le code 99 : execFile le traite
 * comme un échec. On sonde donc par une extraction réelle d'une page, et l'on
 * accepte tout binaire qui rend du texte.
 */
async function findBin() {
  for (const c of CANDIDATES) {
    try {
      const { stdout } = await run(c,
        ['-f', '1', '-l', '1', '-enc', 'UTF-8', '-q', PDF, '-']);
      if (stdout.length) return c;
    } catch {}
  }
  return null;
}

async function page(n) {
  const { stdout } = await run(BIN,
    ['-table', '-f', String(n), '-l', String(n), '-enc', 'UTF-8', '-q', PDF, '-']);
  return stdout;
}

async function main() {
  BIN = await findBin();
  if (!BIN) {
    console.error('pdftotext est introuvable. Il est fourni avec Git for Windows,');
    console.error('dans Program Files\\Git\\mingw64\\bin.');
    process.exit(1);
  }

  const freq = JSON.parse(await readFile(join(ROOT, 'data', 'vocab', 'frequency.json'), 'utf8'));
  const known = new Map(freq.words.map((w) => [w.id, w]));

  const existing = JSON.parse(
    await readFile(join(ROOT, 'tools', 'vocab-gloss.json'), 'utf8')).words;

  const found = new Map();
  let lines = 0, withBoth = 0, rejected = 0;

  for (let p = FIRST_PAGE; p <= LAST_PAGE; p++) {
    let txt = '';
    try { txt = await page(p); } catch { continue; }

    for (const raw of txt.split('\n')) {
      lines++;
      const line = clean(raw);
      if (!line || !ARABIC.test(line) || !LATIN.test(line)) continue;
      withBoth++;

      // Le français précède l'arabe dans la mise en page ; on coupe au premier
      // caractère arabe rencontré.
      const cut = [...line].findIndex((c) => ARABIC.test(c));
      if (cut <= 0) continue;

      const fr = clean(line.slice(0, cut))
        .replace(/^\d+\s*/, '')            // compteur d'occurrences en tête
        .replace(/\s*\[\.\.\.\]$/, '')
        .replace(/\s*\d+$/, '');           // appel de note
      const ar = clean(line.slice(cut));

      // Rejets. La colonne de gauche happe aussi les notes de bas de page et les
      // en-têtes de fiche ; sans ces filtres, un tiers des « sens » proposés sont
      // des fragments de commentaire.
      if (fr.length < 2 || fr.length > 60) continue;
      if (/^\(\d/.test(fr)) continue;                            // « (3) Nom spécifique… »
      if (/[«»]/.test(fr)) continue;                             // citation, pas une glose
      if (/^(CHALLENGE|REVISION|TOTAL|PROGRESSION|NOTES|REMARQUES)/i.test(fr)) continue;
      if (/(Selon l['’]avis|c['’]est-à-dire|Voir |cf\.)/i.test(fr)) continue;

      // NFKC ramène les Presentation Forms aux lettres de base, puis on applique
      // la normalisation du projet — la même que pour compter les occurrences.
      for (const token of ar.normalize('NFKC').split(/\s+/)) {
        const id = normalize(token.replace(/[()\[\]،.:]/g, ''));
        if (id.length < 2) continue;
        if (!known.has(id)) { rejected++; continue; }
        if (existing[id]) continue;                       // déjà traduit à la main
        if (!found.has(id)) found.set(id, { fr, page: p, rank: known.get(id).rank });
      }
    }
  }

  const sorted = [...found.entries()].sort((a, b) => a[1].rank - b[1].rank);

  await writeFile(OUT, JSON.stringify({
    _meta: {
      source: '« 80% des mots du Qour\'ân » — AL-LAWH',
      license: 'CC BY-NC-SA 3.0 FR — attribution et partage à l\'identique',
      contact: 'allawhou@gmail.com',
      note: 'CANDIDATS À RELIRE. Appariements extraits automatiquement puis filtrés : '
          + 'seuls les mots arabes réellement présents dans le Coran sous cette forme '
          + 'sont retenus. Le sens français, lui, n\'est pas vérifié.',
      pages: `${FIRST_PAGE}–${LAST_PAGE}`,
      generated: new Date().toISOString().slice(0, 10)
    },
    candidates: Object.fromEntries(sorted.map(([id, v]) =>
      [id, { fr: v.fr, rank: v.rank, page: v.page }]))
  }, null, 2));

  console.log(`lignes lues            ${lines}`);
  console.log(`lignes français+arabe  ${withBoth}`);
  console.log(`mots écartés (absents du Coran sous cette forme)  ${rejected}`);
  console.log(`\n✓ ${sorted.length} candidats nouveaux → tools/vocab-gloss-candidats.json`);
  console.log('\n  30 premiers, par fréquence :');
  for (const [id, v] of sorted.slice(0, 30)) {
    console.log(`    #${String(v.rank).padStart(3)}  ${id.padEnd(12)} ${v.fr}`);
  }
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
