/**
 * Génère data/audio/segments/<reciteur>/NNN.json : les horodatages mot à mot
 * qui permettent le surlignage synchronisé du Module 4.
 *
 *   node tools/build-segments.mjs
 *
 * Source : cpfair/quran-align, CC BY 4.0. Les noms de fichiers du jeu de données
 * correspondent exactement aux dossiers d'EveryAyah — l'audio joué et les
 * horodatages proviennent donc bien du même enregistrement, ce qui n'allait pas
 * de soi et évite une resynchronisation approximative.
 *
 * Le script vérifie que les index de mots de la source tombent dans le découpage
 * du texte tel que l'application le fait. Sans ce contrôle, un décalage de
 * découpage surlignerait le mauvais mot sans jamais lever d'erreur.
 *
 * Prérequis : le zip décompressé dans tools/.cache/align/ (voir README).
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWord } from '../src/data-access/tajweed.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALIGN = join(ROOT, 'tools', '.cache', 'align');
const TEXT = join(ROOT, 'data', 'quran', 'text');
const OUT = join(ROOT, 'data', 'audio', 'segments');

/**
 * Récitateurs retenus. Chacun pèse environ 2,2 Mo une fois découpé par sourate ;
 * en embarquer douze alourdirait le dépôt sans servir l'apprentissage.
 *
 * Husary mu'allim vient en premier : c'est une récitation d'enseignement, lente et
 * détachée, faite pour être répétée.
 */
const RECITERS = [
  { id: 'husary_muallim', file: 'Husary_Muallim_128kbps.json',
    name: 'Mahmoud Khalil Al-Husary', style: "mu'allim (enseignement)",
    everyayah: 'Husary_Muallim_128kbps' },
  { id: 'husary', file: 'Husary_64kbps.json',
    name: 'Mahmoud Khalil Al-Husary', style: 'murattal',
    everyayah: 'Husary_64kbps' },
  { id: 'alafasy', file: 'Alafasy_128kbps.json',
    name: 'Mishary Rashid Al-Afasy', style: 'murattal',
    everyayah: 'Alafasy_128kbps' }
];

const META = {
  source: 'cpfair/quran-align',
  url: 'https://github.com/cpfair/quran-align',
  license: 'CC BY 4.0',
  audio_source: 'EveryAyah.com — CC BY-NC',
  generated: new Date().toISOString().slice(0, 10)
};

const pad = (n) => String(n).padStart(3, '0');

/**
 * Même définition du mot que le rendu de l'application, importée et non recopiée :
 * un jeton compte s'il contient une lettre arabe.
 *
 * Le texte Uthmani sépare par des espaces des symboles qui n'en sont pas — marques
 * de pause (ۖ ۗ ۚ), rub el hizb (۞). L'aligneur ne les compte pas ; les compter ici
 * décalerait tout le surlignage d'un mot sur chaque verset qui en contient, sans
 * qu'aucun contrôle de bornes ne s'en aperçoive.
 */
const words0 = (t) => t.split(/\s+/).filter((x) => x && isWord(x));
const wordCount = (t) => words0(t).length;

/**
 * La basmala n'est pas écrite en dur : elle est lue dans le texte lui-même, au
 * verset 1:1. Une constante recopiée à la main diffère presque toujours du texte
 * réel par un point de code — la représentation du dagger alif, par exemple — et la
 * comparaison échoue alors silencieusement.
 */

async function main() {
  // Texte et nombre de mots par verset, selon le découpage de l'application.
  const words = new Map();
  const textOf = new Map();
  for (const f of (await readdir(TEXT)).filter((n) => n.endsWith('.json'))) {
    const { surah, ayahs } = JSON.parse(await readFile(join(TEXT, f), 'utf8'));
    for (const [a, v] of Object.entries(ayahs)) {
      const key = `${surah}:${a}`;
      textOf.set(key, v.text);
      words.set(key, wordCount(v.text));
    }
  }

  // Le verset 1:1 est exactement la basmala.
  const BASMALA_WORDS = words0(textOf.get('1:1'));
  const BASMALA_N = BASMALA_WORDS.length;
  const startsWithBasmala = (text) => {
    const w = words0(text);
    return w.length > BASMALA_N && BASMALA_WORDS.every((b, i) => w[i] === b);
  };

  const report = [];

  for (const r of RECITERS) {
    const raw = JSON.parse(await readFile(join(ALIGN, r.file), 'utf8'));

    const bySurah = new Map();
    let entries = 0, segments = 0, mismatches = 0, missing = 0, shifted = 0, partial = 0;

    for (const e of raw) {
      const key = `${e.surah}:${e.ayah}`;
      const n = words.get(key);
      if (n == null) { missing++; continue; }

      let segs = (e.segments ?? [])
        .filter((s) => Array.isArray(s) && s.length >= 4)
        .map(([from, to, start, end]) => [from, to, start, end]);

      if (!segs.length) continue;

      const maxIdx = Math.max(...segs.map((s) => s[1]));

      // Décalage de la basmala.
      //
      // Le texte Tanzil préfixe la basmala au premier verset de chaque sourate (sauf
      // la 1re, où elle EST le verset 1, et la 9e, qui n'en a pas). Les fichiers
      // d'EveryAyah, eux, ne la contiennent pas : leurs index de mots démarrent au
      // premier mot du verset proprement dit.
      //
      // Sans correction, le surlignage de « qul huwa llâhu ahad » éclaire les mots
      // de la basmala — et rien ne le signale, puisque les index restent dans les
      // bornes. C'est exactement le genre d'erreur qu'un contrôle de dépassement
      // seul laisse passer : il fallait aussi vérifier le manque.
      // Un index qui dépasse le nombre de mots est une vraie incohérence.
      if (maxIdx > n) { mismatches++; continue; }

      // Le décalage n'est appliqué que sur la signature exacte : premier verset
      // d'une sourate qui porte la basmala, et couverture qui s'arrête pile quatre
      // mots avant la fin. Un aligneur qui laisse simplement des mots de fin non
      // segmentés produit maxIdx < n sans que rien ne soit décalé — ne pas
      // confondre les deux, sous peine de tout déplacer de quatre mots.
      const isFirstWithBasmala = e.ayah === 1 && e.surah !== 1
        && startsWithBasmala(textOf.get(key));

      if (isFirstWithBasmala && maxIdx === n - BASMALA_N) {
        segs = segs.map(([from, to, start, end]) =>
          [from + BASMALA_N, to + BASMALA_N, start, end]);
        shifted++;
      }

      // Couverture partielle : l'aligneur n'a pas segmenté tous les mots. Ce n'est
      // pas fatal — le surlignage s'éteint simplement sur ces mots — mais un taux
      // qui grimpe signale une dérive entre le texte et les données d'alignement.
      if (Math.max(...segs.map((s) => s[1])) !== n) partial++;

      const duration = Math.max(...segs.map((s) => s[3]));

      if (!bySurah.has(e.surah)) bySurah.set(e.surah, {});
      bySurah.get(e.surah)[key] = { d: duration, s: segs };
      entries++;
      segments += segs.length;
    }

    const dir = join(OUT, r.id);
    await mkdir(dir, { recursive: true });
    for (const [surah, obj] of bySurah) {
      await writeFile(
        join(dir, `${pad(surah)}.json`),
        JSON.stringify({ _meta: META, reciter: r.id, surah, ayahs: obj })
      );
    }

    report.push({ ...r, entries, segments, mismatches, missing, shifted, surahs: bySurah.size });
    console.log(`✓ ${r.id.padEnd(16)} ${String(entries).padStart(5)} versets, ` +
      `${String(segments).padStart(6)} segments` +
      (shifted ? `, ${shifted} recalés (basmala)` : '') +
      (mismatches ? `, ${mismatches} écartés (découpage incohérent)` : '') +
      (partial ? `, ${partial} couverture partielle` : '') +
      (missing ? `, ${missing} hors texte` : ''));
  }

  await writeFile(
    join(ROOT, 'data', 'audio', 'reciters.json'),
    JSON.stringify({
      _meta: META,
      // `pattern` évite de coder en dur l'URL de chaque récitateur : ajouter une
      // voix, c'est ajouter une ligne ici.
      base: 'https://everyayah.com/data/',
      pattern: '{folder}/{s3}{a3}.mp3',
      reciters: report.map((r) => ({
        id: r.id, name: r.name, style: r.style, folder: r.everyayah,
        license: 'CC BY-NC — usage non commercial, attribution requise',
        attribution_url: 'https://everyayah.com',
        has_segments: true, verses_with_segments: r.entries
      }))
    }, null, 2)
  );

  console.log(`\n  data/audio/reciters.json — ${report.length} récitateurs`);
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
