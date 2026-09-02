/**
 * Génère data/quran/translations/<code>/NNN.json — la traduction française.
 *
 *   node tools/build-translation.mjs
 *
 * ── Pourquoi Hamidullah et non Kazimirski ───────────────────────────────────────
 *
 * La traduction de Kazimirski (1869) est dans le domaine public et son texte
 * intégral est sur Wikisource. C'était le premier choix, et il a été abandonné pour
 * une raison mesurée, pas supposée : sur les 114 sourates, seules 55 découpent en
 * autant de versets que la numérotation de Hafs employée ici. Les traductions du
 * XIXᵉ siècle suivent la numérotation européenne de Flügel, qui diffère sur des
 * dizaines de versets.
 *
 * Aligner malgré tout attacherait la traduction du verset 5 au verset 4 — une
 * erreur invisible à la lecture, et grave dans une application de récitation.
 *
 * Hamidullah, distribué par Tanzil, est fourni au format « sourate|verset|texte »
 * et provient de la même source que le texte arabe : les 6 236 versets
 * correspondent un pour un, sans le moindre alignement à deviner.
 *
 * ── Licence ─────────────────────────────────────────────────────────────────────
 *
 * Tanzil énonce que les traductions qu'il diffuse le sont « for non-commercial
 * purposes only », et qu'un autre usage demande l'accord du traducteur ou de
 * l'éditeur. Ce projet est non commercial par construction — l'audio EveryAyah
 * l'impose déjà. L'attribution et le lien vers Tanzil sont donc obligatoires, et
 * figurent sur l'écran « Sources » de l'application.
 *
 * Ce n'est pas une licence libre : c'est une autorisation d'usage énoncée par le
 * diffuseur. La distinction est notée dans docs/03-sources-et-licences.md, et elle
 * compte si le projet devait un jour changer de nature.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', '.cache');
const OUT = join(ROOT, 'data', 'quran', 'translations');

const TRANSLATION = {
  code: 'fr-hamidullah',
  file: 'fr.hamidullah.txt',
  name: 'Muhammad Hamidullah',
  lang: 'fr',
  source: 'Tanzil.net',
  url: 'https://tanzil.net/trans/',
  license: 'Usage non commercial autorisé par Tanzil ; accord du traducteur ou de l’éditeur requis pour tout autre usage.'
};

const pad = (n) => String(n).padStart(3, '0');

async function main() {
  const raw = await readFile(join(CACHE, TRANSLATION.file), 'utf8');

  const bySurah = new Map();
  let count = 0;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const p = t.split('|');
    if (p.length < 3) continue;
    const s = Number(p[0]);
    if (!bySurah.has(s)) bySurah.set(s, {});
    bySurah.get(s)[`${s}:${Number(p[1])}`] = p.slice(2).join('|').trim();
    count++;
  }

  // Contrôle : un verset traduit manquant afficherait une traduction vide sans
  // rien signaler, et l'apprenant croirait le verset sans équivalent français.
  const { surahs } = JSON.parse(
    await readFile(join(ROOT, 'data', 'quran', 'surahs.json'), 'utf8'));

  const missing = [];
  for (const s of surahs) {
    for (let a = 1; a <= s.ayah_count; a++) {
      if (!bySurah.get(s.id)?.[`${s.id}:${a}`]) missing.push(`${s.id}:${a}`);
    }
  }
  if (missing.length) {
    console.error(`✗ ${missing.length} verset(s) sans traduction — rien n'a été écrit.`);
    console.error('  ' + missing.slice(0, 12).join(', '));
    process.exit(1);
  }

  const meta = { ...TRANSLATION, generated: new Date().toISOString().slice(0, 10) };
  const dir = join(OUT, TRANSLATION.code);
  await mkdir(dir, { recursive: true });

  for (const [surah, ayahs] of bySurah) {
    await writeFile(join(dir, `${pad(surah)}.json`),
      JSON.stringify({ _meta: meta, surah, ayahs }));
  }

  await writeFile(join(OUT, 'index.json'), JSON.stringify({
    _meta: { generated: meta.generated },
    default: TRANSLATION.code,
    translations: [{
      code: TRANSLATION.code, name: TRANSLATION.name, lang: TRANSLATION.lang,
      source: TRANSLATION.source, url: TRANSLATION.url, license: TRANSLATION.license
    }]
  }, null, 2));

  console.log(`✓ ${count} versets traduits, ${bySurah.size} sourates`);
  console.log(`  data/quran/translations/${TRANSLATION.code}/`);
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
