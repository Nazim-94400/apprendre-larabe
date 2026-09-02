/**
 * Génère data/lessons/letter-audio.json en scrutant assets/audio/letters/.
 *
 *   node tools/build-letter-audio.mjs
 *
 * ── Pour ajouter des enregistrements ────────────────────────────────────────────
 *
 * Déposer les fichiers dans assets/audio/letters/ en suivant cette convention,
 * puis relancer ce script. Aucun code à modifier.
 *
 *   <lettre>.mp3          le nom de la lettre          ba.mp3     → « bâ' »
 *   <lettre>-a.mp3        la lettre avec fatha         ba-a.mp3   → « ba »
 *   <lettre>-i.mp3        avec kasra                   ba-i.mp3   → « bi »
 *   <lettre>-u.mp3        avec damma                   ba-u.mp3   → « bu »
 *   <lettre>-sukun.mp3    avec soukoun                 ba-sukun.mp3
 *
 * Les identifiants de lettres sont ceux de data/lessons/alphabet.json : ba, ta,
 * tha, jim, ha_hutti, kha, dal, dhal, ra, zay, sin, shin, sad, dad, ta_mutbaqa,
 * dha, ayn, ghayn, fa, qaf, kaf, lam, mim, nun, ha, waw, ya, alif, hamza.
 *
 * Formats acceptés : mp3, ogg, m4a, wav. Le script vérifie que chaque identifiant
 * existe réellement dans l'alphabet — un fichier mal nommé serait autrement ignoré
 * en silence, et l'on chercherait longtemps pourquoi le son ne sort pas.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'audio', 'letters');
const OUT = join(ROOT, 'data', 'lessons', 'letter-audio.json');

const KEYS = { a: 'a', i: 'i', u: 'u', sukun: 'sukun' };
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.m4a', '.wav']);

async function main() {
  const { letters } = JSON.parse(
    await readFile(join(ROOT, 'data', 'lessons', 'alphabet.json'), 'utf8'));
  const valid = new Set(letters.map((l) => l.id));

  await mkdir(DIR, { recursive: true });
  const files = (await readdir(DIR)).filter((f) => AUDIO_EXT.has(extname(f).toLowerCase()));

  const clips = {};
  const ignored = [];

  for (const f of files) {
    const stem = basename(f, extname(f));
    const dash = stem.lastIndexOf('-');
    const maybeVowel = dash > 0 ? stem.slice(dash + 1) : null;

    const [id, key] = maybeVowel && KEYS[maybeVowel]
      ? [stem.slice(0, dash), KEYS[maybeVowel]]
      : [stem, 'name'];

    if (!valid.has(id)) { ignored.push(f); continue; }
    (clips[id] ??= {})[key] = f;
  }

  const total = Object.values(clips).reduce((n, c) => n + Object.keys(c).length, 0);

  await writeFile(OUT, JSON.stringify({
    _meta: {
      source: 'assets/audio/letters/ — enregistrements fournis pour le projet',
      note: 'Généré par tools/build-letter-audio.mjs. Déposer les fichiers et relancer.',
      letters_covered: Object.keys(clips).length,
      clips: total,
      generated: new Date().toISOString().slice(0, 10)
    },
    base: 'assets/audio/letters/',
    clips
  }, null, 2));

  if (ignored.length) {
    console.warn(`⚠ ${ignored.length} fichier(s) au nom inconnu, ignoré(s) :`);
    for (const f of ignored.slice(0, 10)) console.warn('   ' + f);
    console.warn('   Voir la convention de nommage en tête de ce script.');
  }

  console.log(total
    ? `✓ ${total} clips pour ${Object.keys(clips).length} lettres`
    : '✓ aucun enregistrement pour l’instant — manifeste vide écrit');
  console.log('  data/lessons/letter-audio.json');
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
