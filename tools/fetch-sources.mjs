/**
 * Télécharge les sources externes dans tools/.cache/ (ignoré par Git).
 *
 * Rien n'est téléchargé au moment de l'exécution de l'application : ces fichiers
 * servent uniquement à générer data/, qui est ensuite versionné. C'est ce qui
 * permet à la PWA de fonctionner hors ligne sans dépendre de la disponibilité de
 * Tanzil ou de GitHub.
 *
 *   node tools/fetch-sources.mjs
 */

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', '.cache');

/**
 * Le suffixe « pause-sajdah » du fichier de tajweed n'est pas décoratif : les offsets
 * de règles sont des positions de caractères dans CETTE variante exacte du texte.
 * Marques de pause et signes de sajdah inclus, rub-el-hizb et tatweel exclus.
 *
 * ATTENTION : ne jamais écrire `&tatweel=false`. Le formulaire Tanzil est un
 * formulaire à cases à cocher — une case décochée n'envoie rien du tout. Côté
 * serveur, seule la *présence* du paramètre compte : `tatweel=false` active le
 * tatweel exactement comme `tatweel=true`. Le texte gagne alors un caractère U+0640
 * dans les dagger alifs (ـٰ), et toutes les annotations qui suivent se décalent d'un
 * cran — sans la moindre erreur visible. Une option se désactive en l'omettant.
 */
const TANZIL_UTHMANI =
  'https://tanzil.net/pub/download/index.php' +
  '?quranType=uthmani&marks=true&sajdah=true' +
  '&outType=txt-2&agree=true';

const SOURCES = [
  { file: 'quran-data.xml',
    url: 'https://tanzil.net/res/text/metadata/quran-data.xml',
    note: 'Métadonnées des 114 sourates — Tanzil, CC BY' },

  { file: 'quran-uthmani.txt',
    url: TANZIL_UTHMANI,
    note: 'Texte coranique Uthmani — Tanzil, copie verbatim uniquement' },

  { file: 'tajweed.json',
    url: 'https://raw.githubusercontent.com/cpfair/quran-tajweed/master/' +
         'output/tajweed.hafs.uthmani-pause-sajdah.json',
    note: 'Annotations de tajweed par offsets — cpfair, CC BY 4.0' },

  // Texte de référence des annotations. Le README de cpfair est formel : l'encodage
  // du texte diffusé par Tanzil a changé depuis le calcul des offsets, et il faut
  // utiliser cette copie de 2017 sous peine d'annotations décalées. Elle ne sert
  // qu'au réalignement — le texte affiché reste l'édition Tanzil actuelle.
  { file: 'quran-uthmani-2017.txt',
    url: 'https://github.com/cpfair/quran-tajweed/files/7281388/quran-uthmani.txt',
    note: 'Texte de référence des offsets (Tanzil, instantané d\'avril 2017)' }
];

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  const force = process.argv.includes('--force');

  for (const src of SOURCES) {
    const dest = join(CACHE, src.file);

    if (!force && await exists(dest)) {
      console.log(`= ${src.file} (déjà présent, --force pour retélécharger)`);
      continue;
    }

    process.stdout.write(`↓ ${src.file} … `);
    const res = await fetch(src.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${src.url} → HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`${(buf.length / 1024).toFixed(0)} Ko — ${src.note}`);
  }

  console.log(`\nSources dans ${CACHE}`);
}

main().catch((e) => { console.error('\nÉchec :', e.message); process.exit(1); });
