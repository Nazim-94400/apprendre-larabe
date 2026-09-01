/**
 * Génère data/quran/surahs.json et data/quran/text/NNN.json
 * à partir des sources téléchargées par fetch-sources.mjs.
 *
 *   node tools/build-quran.mjs
 *
 * Le texte n'est jamais modifié : la licence Tanzil autorise la copie verbatim et
 * interdit l'altération. Il est seulement redécoupé par sourate pour permettre le
 * chargement à la demande.
 *
 * Chaque fichier porte le sha256 de son texte. C'est ce qui permet à
 * build-tajweed.mjs de refuser d'appliquer des offsets à un texte qui aurait changé
 * — sans cela, une mise à jour de Tanzil décalerait silencieusement toutes les
 * annotations d'un caractère.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', '.cache');
const OUT = join(ROOT, 'data', 'quran');

const META = {
  source: 'Tanzil.net',
  url: 'https://tanzil.net/download/',
  edition: 'uthmani-pause-sajdah',
  license: 'Copie verbatim autorisée, modification interdite, source à citer.',
  generated: new Date().toISOString().slice(0, 10)
};

const pad = (n) => String(n).padStart(3, '0');
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

/** Métadonnées des 114 sourates, depuis quran-data.xml. */
function parseSurahs(xml, namesFr) {
  const out = [];
  const re = /<sura\s+([^/>]+)\/>/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = Object.fromEntries(
      [...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])
    );
    const id = Number(attrs.index);
    out.push({
      id,
      name_ar: attrs.name,
      name_translit: attrs.tname,
      name_en: attrs.ename,
      name_fr: namesFr[String(id)] ?? attrs.ename,
      ayah_count: Number(attrs.ayas),
      revelation: attrs.type === 'Meccan' ? 'mecquoise' : 'médinoise',
      revelation_order: Number(attrs.order),
      rukus: Number(attrs.rukus)
    });
  }
  return out;
}

/** Texte au format « sourate|verset|texte », lignes de commentaire préfixées de #. */
function parseText(txt) {
  const bySurah = new Map();
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('|');
    const j = t.indexOf('|', i + 1);
    if (i < 0 || j < 0) continue;
    const s = Number(t.slice(0, i));
    const a = Number(t.slice(i + 1, j));
    const text = t.slice(j + 1);
    if (!bySurah.has(s)) bySurah.set(s, new Map());
    bySurah.get(s).set(a, text);
  }
  return bySurah;
}

async function main() {
  const [xml, txt, namesRaw] = await Promise.all([
    readFile(join(CACHE, 'quran-data.xml'), 'utf8'),
    readFile(join(CACHE, 'quran-uthmani.txt'), 'utf8'),
    readFile(join(ROOT, 'tools', 'surah-names-fr.json'), 'utf8')
  ]);

  const namesFr = JSON.parse(namesRaw).names;
  const surahs = parseSurahs(xml, namesFr);
  const bySurah = parseText(txt);

  if (surahs.length !== 114) throw new Error(`${surahs.length} sourates au lieu de 114`);

  await mkdir(join(OUT, 'text'), { recursive: true });

  let totalAyahs = 0;
  const hashes = {};

  for (const s of surahs) {
    const ayahs = bySurah.get(s.id);
    if (!ayahs) throw new Error(`Sourate ${s.id} absente du texte`);
    if (ayahs.size !== s.ayah_count) {
      throw new Error(`Sourate ${s.id} : ${ayahs.size} versets, ${s.ayah_count} attendus`);
    }

    const ordered = {};
    for (let a = 1; a <= s.ayah_count; a++) {
      const text = ayahs.get(a);
      if (text == null) throw new Error(`Verset ${s.id}:${a} manquant`);
      ordered[a] = { text };
    }

    // Le hash porte sur le texte concaténé dans l'ordre : il change dès qu'un seul
    // caractère bouge, ce qui est exactement le signal recherché.
    const hash = sha256(Object.values(ordered).map((v) => v.text).join('\n'));
    hashes[s.id] = hash;

    await writeFile(
      join(OUT, 'text', `${pad(s.id)}.json`),
      JSON.stringify({ _meta: { ...META, sha256: hash }, surah: s.id, ayahs: ordered }, null, 0)
    );
    totalAyahs += s.ayah_count;
  }

  await writeFile(
    join(OUT, 'surahs.json'),
    JSON.stringify({ _meta: META, hashes, surahs }, null, 2)
  );

  console.log(`✓ 114 sourates, ${totalAyahs} versets`);
  console.log(`  data/quran/surahs.json`);
  console.log(`  data/quran/text/001.json … 114.json`);
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
