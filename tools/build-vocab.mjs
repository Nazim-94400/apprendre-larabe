/**
 * Génère data/vocab/frequency.json : les mots les plus fréquents du Coran.
 *
 *   node tools/build-vocab.mjs
 *
 * Les occurrences sont **comptées dans le texte**, pas reprises d'une liste
 * recopiée. C'est la seule façon d'être sûr des chiffres, et cela permet de
 * régénérer la liste si le texte source change.
 *
 * Les formes sont regroupées après normalisation : on retire le tashkîl et on
 * unifie les variantes graphiques de l'alif, du yâ' final et du tâ' marbûta.
 * Sans cela, « ٱللَّهُ », « ٱللَّهِ » et « ٱللَّهَ » compteraient pour trois mots
 * différents alors que c'est le même, décliné.
 *
 * Le sens français vient de tools/vocab-gloss.json, rédigé à la main : aucune
 * source libre ne fournit de traduction mot à mot fiable en français. Un mot sans
 * glose est conservé dans la liste mais exclu des quiz — mieux vaut un vocabulaire
 * plus court qu'une traduction inventée.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWord } from '../src/data-access/tajweed.js';
import { normalize } from '../src/data-access/vocab.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = join(ROOT, 'data', 'quran', 'text');
const OUT = join(ROOT, 'data', 'vocab');

// 2 000 formes couvrent environ les trois quarts du texte. Au-delà, la longue
// traîne des hapax n'apporte plus rien à un apprenant et alourdit le fichier.
const TOP = 2000;

// La normalisation est importée de src/data-access/vocab.js : c'est la même que
// celle utilisée à l'affichage pour retrouver le mot dans ses exemples. Deux
// definitions separees finiraient par diverger, et le mot ne serait plus surligne
// dans ses propres versets.

async function main() {
  const files = (await readdir(TEXT)).filter((n) => n.endsWith('.json')).sort();

  const counts = new Map();     // clé normalisée → occurrences
  const forms = new Map();      // clé normalisée → Map(forme vocalisée → n)
  const places = new Map();     // clé normalisée → [{key, len}]
  let totalWords = 0;

  for (const f of files) {
    const { surah, ayahs } = JSON.parse(await readFile(join(TEXT, f), 'utf8'));
    for (const [a, v] of Object.entries(ayahs)) {
      const key = `${surah}:${a}`;
      const tokens = v.text.split(/\s+/).filter((t) => t && isWord(t));
      for (const t of tokens) {
        const n = normalize(t);
        if (n.length < 2) continue;            // particules d'une lettre : sans intérêt isolées
        totalWords++;
        counts.set(n, (counts.get(n) ?? 0) + 1);

        if (!forms.has(n)) forms.set(n, new Map());
        const fm = forms.get(n);
        fm.set(t, (fm.get(t) ?? 0) + 1);

        if (!places.has(n)) places.set(n, []);
        const p = places.get(n);
        if (p.length < 400) p.push({ key, len: v.text.length, surah: Number(surah) });
      }
    }
  }

  let gloss = {};
  try {
    gloss = JSON.parse(await readFile(join(ROOT, 'tools', 'vocab-gloss.json'), 'utf8')).words ?? {};
  } catch {
    console.warn('  (tools/vocab-gloss.json absent : liste sans traductions)');
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP);

  let cumulative = 0;
  const words = ranked.map(([norm, n], i) => {
    cumulative += n;

    // Forme d'affichage : la graphie vocalisée la plus fréquente.
    const form = [...forms.get(norm).entries()].sort((a, b) => b[1] - a[1])[0][0];

    // Exemples : versets courts, du Juz 'Amma en priorité — familiers et lisibles.
    const examples = places.get(norm)
      .sort((a, b) => (b.surah >= 78 ? 0 : 1) - (a.surah >= 78 ? 0 : 1) || a.len - b.len)
      .slice(0, 3)
      .map((p) => p.key);

    const g = gloss[norm] ?? null;
    return {
      id: norm,
      form,
      occurrences: n,
      rank: i + 1,
      cumulative_pct: +((cumulative / totalWords) * 100).toFixed(2),
      examples,
      ...(g ? { fr: g.fr, root: g.root ?? null, theme: g.theme ?? 'autre' } : {})
    };
  });

  const withGloss = words.filter((w) => w.fr).length;

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'frequency.json'), JSON.stringify({
    _meta: {
      source: 'Comptage sur le texte Tanzil (data/quran/text/)',
      gloss_source: 'tools/vocab-gloss.json — rédigé pour le projet, à faire relire',
      total_words: totalWords,
      distinct_forms: counts.size,
      listed: words.length,
      with_gloss: withGloss,
      generated: new Date().toISOString().slice(0, 10)
    },
    words
  }));

  console.log(`✓ ${totalWords} mots comptés, ${counts.size} formes distinctes`);
  console.log(`  ${words.length} retenues, dont ${withGloss} traduites`);
  console.log(`  les ${TOP} premières couvrent ${words.at(-1).cumulative_pct} % du texte`);
  console.log('\n  Top 20 :');
  for (const w of words.slice(0, 20)) {
    console.log(`    ${String(w.occurrences).padStart(5)}  ${w.form.padEnd(14)} ${w.id.padEnd(10)} ${w.fr ?? '—'}`);
  }
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
