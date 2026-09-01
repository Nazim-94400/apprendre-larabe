/**
 * Génère data/quran/tajweed/NNN.json à partir de tools/.cache/tajweed.json.
 *
 *   node tools/build-tajweed.mjs
 *
 * ─── Le problème que ce script résout ───────────────────────────────────────────
 *
 * Les annotations de cpfair sont des intervalles de points de code dans le texte
 * Uthmani de Tanzil — mais dans la version d'avril 2017, dont l'encodage a depuis
 * légèrement changé. Appliquer ces offsets au texte Tanzil d'aujourd'hui colore la
 * mauvaise lettre sur environ 2 800 versets, sans provoquer la moindre erreur.
 *
 * Deux mauvaises solutions ont été écartées :
 *   - figer le texte de 2017 comme texte affiché : on renoncerait aux corrections
 *     d'encodage apportées depuis, et aux marques de pause qu'un apprenant doit voir ;
 *   - retirer les marques de pause pour se rapprocher du texte de 2017 : il resterait
 *     422 annotations fausses, et le texte perdrait une information de récitation.
 *
 * La solution retenue : garder le texte Tanzil actuel comme texte affiché, et
 * réaligner chaque annotation du texte de 2017 vers celui d'aujourd'hui, verset par
 * verset. L'alignement est exact — pas heuristique — et le résultat est revérifié.
 *
 * ─── Contrôles ─────────────────────────────────────────────────────────────────
 *
 *   1. bornes     — 0 <= start < end <= longueur du verset
 *   2. codepoints — aucune paire de substitution UTF-16, sinon les index JS ne
 *                   correspondraient plus aux offsets en points de code
 *   3. sémantique — après réalignement, un intervalle « hamzat_wasl » doit contenir
 *                   un alif wasla (ٱ) et un « lam_shamsiyyah » un lâm (ل)
 *
 * Le script n'écrit rien si un seul contrôle échoue : une annotation décalée colore
 * la mauvaise lettre, ce qui est pire que pas de couleur du tout.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', '.cache');
const TEXT = join(ROOT, 'data', 'quran', 'text');
const OUT = join(ROOT, 'data', 'quran', 'tajweed');

const META = {
  source: 'cpfair/quran-tajweed',
  url: 'https://github.com/cpfair/quran-tajweed',
  license: 'CC BY 4.0',
  base_text: 'Tanzil uthmani (avril 2017), offsets réalignés sur l\'édition courante',
  generated: new Date().toISOString().slice(0, 10)
};

const pad = (n) => String(n).padStart(3, '0');
const ALIF_WASLA = 'ٱ';
const LAM = 'ل';

/** Contrôles sémantiques : la lettre attendue doit figurer dans l'intervalle. */
const EXPECT = {
  hamzat_wasl: (frag) => frag.includes(ALIF_WASLA),
  lam_shamsiyyah: (frag) => frag.includes(LAM)
};

/**
 * Construit la table de correspondance des positions de `from` vers `to`.
 * Renvoie un tableau de longueur from.length + 1.
 *
 * Les deux textes ne diffèrent que par quelques signes insérés ou retirés. On élimine
 * donc d'abord le préfixe et le suffixe communs, ce qui réduit la programmation
 * dynamique à une fenêtre de quelques caractères au lieu du verset entier — sans quoi
 * le verset 2:282, long de plus de mille caractères, coûterait à lui seul des millions
 * de cellules.
 */
function positionMap(from, to) {
  const n = from.length, m = to.length;

  let p = 0;
  while (p < n && p < m && from[p] === to[p]) p++;

  let s = 0;
  while (s < n - p && s < m - p && from[n - 1 - s] === to[m - 1 - s]) s++;

  const map = new Int32Array(n + 1);
  for (let i = 0; i <= p; i++) map[i] = i;
  for (let i = 0; i <= s; i++) map[n - i] = m - i;

  const a = from.slice(p, n - s);
  const b = to.slice(p, m - s);

  if (a.length === 0) return map;

  if (b.length === 0) {
    for (let i = 0; i < a.length; i++) map[p + i] = p;
    return map;
  }

  // Plus longue sous-séquence commune sur la fenêtre divergente.
  const w = b.length + 1;
  const dp = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] === b[j]
        ? dp[(i + 1) * w + j + 1] + 1
        : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }

  // Remontée. En cas d'égalité, on consomme la suppression AVANT l'insertion.
  //
  // L'ordre importe. Le texte actuel écrit إبراهيم avec « ـۧ » (tatweel + yeh
  // suscrit) là où celui de 2017 avait le seul « ۦ ». Traiter d'abord l'insertion
  // ferait pointer le caractère supprimé après le groupe qui le remplace : le madd
  // se retrouverait sur le م suivant, ou l'intervalle s'annulerait. En rattachant la
  // suppression à la position courante, l'intervalle recouvre bien son remplaçant.
  let i = 0, j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { map[p + i] = p + j; i++; j++; }
    else if (j >= b.length || dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
      map[p + i] = p + j; i++;
    } else { j++; }
  }
  return map;
}

async function main() {
  const [rawTaj, ref2017] = await Promise.all([
    readFile(join(CACHE, 'tajweed.json'), 'utf8'),
    readFile(join(CACHE, 'quran-uthmani-2017.txt'), 'utf8')
  ]);
  const raw = JSON.parse(rawTaj);

  // Texte de référence (2017), sur lequel les offsets sont exprimés.
  const refText = new Map();
  for (const line of ref2017.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const p = t.split('|');
    if (p.length < 3) continue;
    refText.set(`${Number(p[0])}:${Number(p[1])}`, p.slice(2).join('|'));
  }

  // Texte courant, celui que l'application affiche.
  const curText = new Map();
  for (const f of (await readdir(TEXT)).filter((n) => n.endsWith('.json'))) {
    const { surah, ayahs } = JSON.parse(await readFile(join(TEXT, f), 'utf8'));
    for (const [a, v] of Object.entries(ayahs)) curText.set(`${surah}:${a}`, v.text);
  }

  const bySurah = new Map();
  const rules = new Map();
  const errors = [];
  let annotations = 0, checked = 0, realigned = 0, identical = 0;

  for (const entry of raw) {
    const key = `${entry.surah}:${entry.ayah}`;
    const cur = curText.get(key);
    const ref = refText.get(key);

    if (cur == null) { errors.push(`${key} : absent du texte généré`); continue; }
    if (ref == null) { errors.push(`${key} : absent du texte de référence 2017`); continue; }

    if ([...cur].length !== cur.length || [...ref].length !== ref.length) {
      errors.push(`${key} : caractères hors BMP, les index ne sont plus des points de code`);
      continue;
    }

    let map = null;
    if (cur === ref) identical++;
    else { map = positionMap(ref, cur); realigned++; }

    const list = [];
    for (const ann of entry.annotations) {
      annotations++;
      const start = map ? map[ann.start] : ann.start;
      const end = map ? map[ann.end] : ann.end;
      const rule = ann.rule;

      if (!(Number.isInteger(start) && Number.isInteger(end) &&
            start >= 0 && start < end && end <= cur.length)) {
        errors.push(`${key} : ${rule} [${start},${end}] hors du verset (${cur.length})`);
        continue;
      }

      const check = EXPECT[rule];
      if (check) {
        checked++;
        if (!check(cur.slice(start, end))) {
          errors.push(`${key} : ${rule} [${start},${end}] ne contient pas la lettre attendue`);
        }
      }

      rules.set(rule, (rules.get(rule) ?? 0) + 1);
      list.push({ rule, start, end });
    }

    if (!bySurah.has(entry.surah)) bySurah.set(entry.surah, {});
    bySurah.get(entry.surah)[key] = list;
  }

  if (errors.length) {
    console.error(`✗ ${errors.length} anomalie(s) — rien n'a été écrit.\n`);
    for (const e of errors.slice(0, 20)) console.error('  ' + e);
    if (errors.length > 20) console.error(`  … et ${errors.length - 20} autres`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  for (const [surah, obj] of bySurah) {
    await writeFile(
      join(OUT, `${pad(surah)}.json`),
      JSON.stringify({ _meta: META, surah, ayahs: obj })
    );
  }

  console.log(`✓ ${annotations} annotations sur ${bySurah.size} sourates`);
  console.log(`  ${identical} versets identiques à la référence, ${realigned} réalignés`);
  console.log(`  ${checked} vérifications sémantiques passées, 0 anomalie`);
  console.log('\n  Règles présentes :');
  for (const [r, n] of [...rules].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${r.padEnd(22)} ${String(n).padStart(6)}`);
  }
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
