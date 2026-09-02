/**
 * Génère docs/relecture.html — le document de relecture destiné à une personne
 * qualifiée en tajwîd.
 *
 *   node tools/build-review.mjs
 *
 * Il est produit à partir des fichiers de données eux-mêmes, jamais recopié : ce
 * qui est relu est donc exactement ce que l'application affiche, et le document se
 * régénère quand les données changent.
 *
 * Chaque point porte une référence stable (M-07, R-12, L-15…) pour que le relecteur
 * puisse dire « le point M-07 est faux » sans avoir à décrire de quoi il parle.
 *
 * DOUTES est mon propre registre d'incertitude : les endroits où j'ai tranché sans
 * être sûr. Les signaler vaut mieux que de les noyer dans la masse — un relecteur
 * qui sait où regarder d'abord ira plus vite et plus juste.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'relecture.html');

/**
 * Points où je ne suis pas certain, indexés par identifiant de donnée et non par
 * numéro de référence.
 *
 * La première version numérotait les doutes à la main : deux renvois tombaient déjà
 * à côté, dont un vers une règle qui n'existe pas. Les numéros étant calculés à la
 * génération, y renvoyer en dur les désynchronise dès qu'on insère une règle.
 */
const DOUTES = {
  letter: {
    alif:  'Je n’attribue aucune sifa à l’alif hormis « prolongation ». Est-ce la bonne façon de le présenter, ou faut-il en mentionner d’autres ?',
    hamza: 'La hamza est traitée comme une 29ᵉ entrée à côté des 28 lettres. Est-ce la présentation attendue pour un débutant francophone ?'
  },
  point: {
    jawf:        'Le yâ’ et le wâw figurent ici comme lettres de prolongation, et reparaissent plus bas comme consonnes. La double mention est-elle claire, ou source de confusion ?',
    lisan_wasat: 'J’y place le yâ’ consonne avec le jîm et le chîn. À confirmer.',
    lisan_ra:    'J’ai séparé le point du râ’ de celui du noun. Certains manuels les regroupent. Lequel enseigner ?',
    khayshum:    'Le khayshoum est présenté comme un 17ᵉ point à part entière. Certaines classifications le comptent autrement.'
  },
  rule: {
    ikhfa:         'La liste des quinze lettres d’ikhfâ : une omission ou un ajout ne se verrait pas à la lecture de l’application.',
    madd_munfasil: 'J’annonce 4 à 5 temps pour Hafs par Shâtibiyya. À confirmer — et faut-il mentionner la lecture à 2 temps ?',
    lam_rules:     'La liste des quatorze lettres solaires, même remarque que pour l’ikhfâ.'
  },
  bloc: {
    vocab:   'Les mots à sens multiples : « من » recouvre deux homographes distincts, la préposition et le pronom relatif, que j’ai fondus dans une seule glose. Même problème possible pour « ما », « إنّ », « لمّا », « إذ ».',
    sourates: 'Les noms français de sourates suivent l’usage courant, mais celui-ci varie d’une traduction à l’autre.'
  }
};

const doubtCount = Object.values(DOUTES)
  .reduce((n, group) => n + Object.keys(group).length, 0);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pad2 = (n) => String(n).padStart(2, '0');

function item(ref, body, doubt = null, extra = '') {
  return `<article class="item${doubt ? ' item--flag' : ''}" id="${ref}">
    <div class="item__ref"><a href="#${ref}">${ref}</a></div>
    <div class="item__body">
      ${body}
      ${doubt ? `<p class="flag"><span class="flag__tag">à vérifier en priorité</span>
        ${esc(doubt)}</p>` : ''}
      ${extra}
    </div>
  </article>`;
}

async function main() {
  const read = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

  const alpha = await read('data/lessons/alphabet.json');
  const mk = await read('data/lessons/makharij.json');
  const tj = await read('data/lessons/tajweed-rules.json');
  const gloss = await read('tools/vocab-gloss.json');
  const surahs = await read('tools/surah-names-fr.json');
  const freq = await read('data/vocab/frequency.json');

  const letterName = new Map(alpha.letters.map((l) => [l.id, l]));
  const nameOf = (id) => letterName.get(id)?.forms.isolated ?? id;
  const frOf = (id) => letterName.get(id)?.name_fr ?? id;

  /* ---- 1. Points d'articulation ---- */

  const makharij = mk.points.map((p) => item(
    `M-${pad2(p.order)}`,
    `<h3>${esc(p.name_fr)} <span class="ar">${p.name_ar}</span></h3>
     <p class="zone">${esc(mk.zones.find((z) => z.id === p.zone)?.name_fr ?? '')}</p>
     <p>${esc(p.desc)}</p>
     <p class="cue">${esc(p.cue)}</p>
     <p class="letters"><span class="lbl">Lettres</span>
       <span class="ar">${p.letters.map(nameOf).join(' ')}</span>
       <span class="tr">${p.letters.map(frOf).join(', ')}</span></p>`,
    DOUTES.point[p.id]
  )).join('');

  /* ---- 2. Lettres et sifât ---- */

  const lettres = alpha.letters.map((l) => item(
    `L-${pad2(l.order)}`,
    `<h3><span class="ar ar--big">${l.forms.isolated}</span>
       ${esc(l.name_fr)} <span class="ar">${l.name_ar}</span></h3>
     <p class="letters"><span class="lbl">Sifât</span>
       ${l.sifat.map((s) => esc(alpha.sifat[s]?.name_fr ?? s)).join(', ')}</p>
     <p class="letters"><span class="lbl">Confondue avec</span>
       <span class="ar">${l.confusable_with.map(nameOf).join(' ')}</span></p>
     ${l.note ? `<p>${esc(l.note)}</p>` : ''}`,
    DOUTES.letter[l.id]
  )).join('');

  /* ---- 3. Règles de tajwîd ---- */

  let n = 0;
  const regles = tj.familles.map((f) => {
    const rows = tj.rules.filter((r) => r.family === f.id).map((r) => item(
      `R-${pad2(++n)}`,
      `<h3>${esc(r.name_fr)} <span class="ar">${r.name_ar}</span>
         ${r.duration ? `<span class="beats">${r.duration} temps</span>` : ''}</h3>
       <p class="lede">${esc(r.short)}</p>
       <p>${esc(r.explanation)}</p>
       <p class="cue">${esc(r.cue)}</p>
       <p class="letters"><span class="lbl">Lettres</span>
         ${esc(r.letters_note || '—')}
         ${r.letters.length ? `<span class="ar">${r.letters.map(nameOf).join(' ')}</span>` : ''}</p>`,
      DOUTES.rule[r.id]
    )).join('');
    return `<div class="famille"><h3 class="famille__t">${esc(f.name_fr)}
      <span class="ar">${f.name_ar}</span></h3>
      <p class="famille__i">${esc(f.intro)}</p></div>${rows}`;
  }).join('');

  /* ---- 4. Vocabulaire ---- */

  const rank = new Map(freq.words.map((w) => [w.id, w]));
  const vocab = Object.entries(gloss.words)
    .sort((a, b) => (rank.get(a[0])?.rank ?? 999) - (rank.get(b[0])?.rank ?? 999))
    .map(([id, g]) => {
      const w = rank.get(id);
      return `<tr>
        <td class="num">${w?.rank ?? '—'}</td>
        <td class="ar">${w?.form ?? id}</td>
        <td>${esc(g.fr)}</td>
        <td class="ar tiny">${g.root ?? ''}</td>
        <td class="num">${w?.occurrences ?? ''}</td>
      </tr>`;
    }).join('');

  /* ---- 5. Noms de sourates ---- */

  // Deux tables côte à côte plutôt qu'une colonne unique : 114 lignes empilées
  // laissent la moitié de la largeur vide et obligent à faire défiler deux fois.
  const nomsAll = Object.entries(surahs.names);
  const half = Math.ceil(nomsAll.length / 2);
  const nomsTable = (rows) => `<div class="tablewrap">
    <table><thead><tr><th>Nº</th><th>Nom proposé</th></tr></thead><tbody>
    ${rows.map(([id, fr]) => `<tr><td class="num">${id}</td><td>${esc(fr)}</td></tr>`).join('')}
    </tbody></table></div>`;
  const noms = nomsTable(nomsAll.slice(0, half)) + nomsTable(nomsAll.slice(half));

  const html = `<title>Relecture du contenu pédagogique</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&family=Amiri:wght@400;700&display=swap">
<style>
/* Palette : papier froid et encre bleutée — le registre du document annoté,
   pas celui de l'application. Le vermillon est réservé aux points douteux ;
   il ne doit apparaître nulle part ailleurs, sinon il cesse d'alerter. */
:root {
  --paper:  #f7f8f9;
  --card:   #ffffff;
  --ink:    #1a1d21;
  --muted:  #5c6570;
  --faint:  #8a929c;
  --rule:   #dde1e5;
  --accent: #2f3e6e;
  --flag:   #b03a2e;
  --flag-bg:#fbf1ef;

  --f-display: Spectral, Georgia, serif;
  --f-ui: "IBM Plex Sans", system-ui, sans-serif;
  --f-mono: "IBM Plex Mono", ui-monospace, monospace;
  --f-ar: Amiri, "Times New Roman", serif;

  --measure: 68ch;
}

:root:not([data-theme="light"]) {
  @media (prefers-color-scheme: dark) {
    --paper: #14171a; --card: #1b1f23; --ink: #e8eaed;
    --muted: #9aa3ad; --faint: #6e7781; --rule: #2b3138;
    --accent: #8fa3d9; --flag: #e58b7f; --flag-bg: #2a1d1b;
  }
}
:root[data-theme="dark"] {
  --paper: #14171a; --card: #1b1f23; --ink: #e8eaed;
  --muted: #9aa3ad; --faint: #6e7781; --rule: #2b3138;
  --accent: #8fa3d9; --flag: #e58b7f; --flag-bg: #2a1d1b;
}

* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font-family: var(--f-ui); font-size: 16px; line-height: 1.65;
  -webkit-text-size-adjust: 100%;
}
.wrap { max-width: 860px; margin: 0 auto; padding: 0 20px 96px; }

/* En-tête : un cartouche de document, pas un héros. */
.head { padding: 56px 0 32px; border-bottom: 2px solid var(--ink); margin-bottom: 40px; }
.eyebrow {
  font-family: var(--f-mono); font-size: 12px; letter-spacing: .14em;
  text-transform: uppercase; color: var(--accent); margin: 0 0 14px;
}
h1 {
  font-family: var(--f-display); font-weight: 600; font-size: clamp(30px, 5vw, 44px);
  line-height: 1.12; margin: 0 0 18px; text-wrap: balance; letter-spacing: -.01em;
}
.head p { max-width: var(--measure); margin: 0 0 12px; color: var(--muted); }
.head strong { color: var(--ink); }

.toc { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 26px; }
.toc a {
  font-family: var(--f-mono); font-size: 12px; text-decoration: none;
  color: var(--accent); border: 1px solid var(--rule); border-radius: 3px;
  padding: 5px 10px; background: var(--card);
}
.toc a:hover { border-color: var(--accent); }

h2 {
  font-family: var(--f-display); font-weight: 600; font-size: 26px;
  margin: 64px 0 6px; padding-top: 20px; border-top: 1px solid var(--rule);
  scroll-margin-top: 16px;
}
.sec-note { color: var(--muted); max-width: var(--measure); margin: 0 0 28px; }
.count { font-family: var(--f-mono); font-size: 12px; color: var(--faint); }

/* Les numéros pendent dans la marge, comme sur une épreuve de correction ;
   ils repassent en ligne sous 720 px. */
.item { display: grid; grid-template-columns: 72px 1fr; gap: 18px; padding: 22px 0;
  border-bottom: 1px solid var(--rule); }
.item__ref a {
  font-family: var(--f-mono); font-size: 12px; color: var(--faint);
  text-decoration: none; letter-spacing: .04em;
}
.item__ref a:hover { color: var(--accent); }
.item__body > * { margin: 0 0 10px; }
.item__body > :last-child { margin-bottom: 0; }
.item h3 { font-family: var(--f-display); font-size: 20px; font-weight: 600; margin: 0 0 8px; }
.lede { font-weight: 500; }
.zone { font-family: var(--f-mono); font-size: 11px; letter-spacing: .1em;
  text-transform: uppercase; color: var(--faint); }
.cue { color: var(--muted); font-style: italic; }
.letters { font-size: 15px; }
.lbl {
  display: inline-block; min-width: 108px;
  font-family: var(--f-mono); font-size: 11px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--faint);
}
.beats {
  font-family: var(--f-mono); font-size: 11px; color: var(--accent);
  border: 1px solid var(--rule); border-radius: 3px; padding: 2px 7px;
  vertical-align: middle; margin-inline-start: 6px;
}
.tr { color: var(--muted); font-size: 14px; margin-inline-start: 10px; }

.ar { font-family: var(--f-ar); font-size: 1.35em; line-height: 1.9;
  direction: rtl; unicode-bidi: isolate; }
.ar--big { font-size: 1.9em; margin-inline-end: 8px; }
.tiny { font-size: 1.05em; }

/* Point douteux : filet vermillon ET étiquette explicite — la couleur seule ne
   doit jamais porter l'information. */
.item--flag { background: var(--flag-bg); }
.item--flag .item__ref a { color: var(--flag); font-weight: 500; }
.flag {
  border-inline-start: 3px solid var(--flag); padding: 10px 14px;
  background: var(--card); font-size: 15px;
}
.flag__tag {
  display: block; font-family: var(--f-mono); font-size: 10px;
  letter-spacing: .12em; text-transform: uppercase; color: var(--flag);
  margin-bottom: 4px;
}

.famille { margin: 40px 0 8px; }
.famille__t { font-family: var(--f-display); font-size: 19px; margin: 0 0 6px; color: var(--accent); }
.famille__i { color: var(--muted); max-width: var(--measure); margin: 0; }

.tablewrap { overflow-x: auto; border: 1px solid var(--rule); border-radius: 4px; background: var(--card); }
table { width: 100%; border-collapse: collapse; font-size: 15px; }
th, td { padding: 8px 12px; border-bottom: 1px solid var(--rule); text-align: start; }
tr:last-child td { border-bottom: 0; }
th {
  font-family: var(--f-mono); font-size: 11px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--faint); font-weight: 500;
  position: sticky; top: 0; background: var(--card);
}
.num { font-variant-numeric: tabular-nums; color: var(--muted); width: 1%; white-space: nowrap; }

.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; align-items: start; }

footer { margin-top: 72px; padding-top: 24px; border-top: 1px solid var(--rule);
  color: var(--faint); font-size: 14px; }

@media (max-width: 720px) {
  .item { grid-template-columns: 1fr; gap: 6px; }
  .item__ref a { border: 1px solid var(--rule); border-radius: 3px; padding: 2px 7px; }
  .lbl { min-width: 0; display: block; }
}

@media print {
  :root { --paper: #fff; --card: #fff; --ink: #000; --muted: #333; --rule: #bbb; }
  body { font-size: 11pt; }
  .toc { display: none; }
  .item, h2 { break-inside: avoid; }
  .item--flag { background: none; outline: 1px solid var(--flag); }
}
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>

<div class="wrap">
  <header class="head">
    <p class="eyebrow">Document de relecture · ${new Date().toISOString().slice(0, 10)}</p>
    <h1>Relecture du contenu pédagogique</h1>
    <p>Ce document rassemble <strong>tout ce qui a été rédigé</strong> pour une application
      d’apprentissage de la lecture et de la récitation du Coran : points d’articulation,
      caractéristiques des lettres, règles de tajwîd, sens de vocabulaire et noms de sourates.
      Rien n’y est cité d’une source établie — <strong>tout est à valider</strong>.</p>
    <p>Chaque point porte une référence stable. Pour signaler une correction, il suffit de
      citer la référence : « <span class="ar">M-07</span> est faux, le yâ’ consonne relève de… ».</p>
    <p>Les points sur <span style="color:var(--flag);font-weight:600">fond rosé</span>, marqués
      <em>à vérifier en priorité</em>, sont ceux où l’auteur du contenu s’est déclaré incertain.
      Les regarder d’abord fait gagner l’essentiel du temps.</p>
    <nav class="toc">
      <a href="#makharij">Points d’articulation</a>
      <a href="#lettres">Lettres et sifât</a>
      <a href="#regles">Règles de tajwîd</a>
      <a href="#vocab">Vocabulaire</a>
      <a href="#sourates">Noms de sourates</a>
    </nav>
  </header>

  <h2 id="makharij">Points d’articulation <span class="count">${mk.points.length} points</span></h2>
  <p class="sec-note">Classification en dix-sept points, celle d’Ibn al-Jazarî.
    La question posée n’est pas seulement l’exactitude : la formulation est destinée à un
    francophone débutant, et une description juste mais incompréhensible serait à corriger
    aussi.</p>
  ${makharij}

  <h2 id="lettres">Lettres et sifât <span class="count">${alpha.letters.length} entrées</span></h2>
  <p class="sec-note">Pour chaque lettre : ses caractéristiques, les lettres avec lesquelles un
    francophone la confond, et la remarque affichée sur sa fiche.</p>
  ${lettres}

  <h2 id="regles">Règles de tajwîd <span class="count">${tj.rules.length} règles</span></h2>
  <p class="sec-note">Riwâyat Hafs ‘an ‘Âsim, voie de ash-Shâtibiyya. Les durées annoncées en
    temps (haraka) sont celles affichées à l’apprenant.</p>
  ${regles}

  <h2 id="vocab">Vocabulaire <span class="count">${Object.keys(gloss.words).length} mots</span></h2>
  <p class="sec-note">Les mots les plus fréquents du Coran, classés par rang. Le nombre
    d’occurrences est compté sur le texte et n’est pas en cause ; <strong>seul le sens
    français est à relire</strong>.</p>
  <p class="flag"><span class="flag__tag">à vérifier en priorité</span>${esc(DOUTES.bloc.vocab)}</p>
  <div class="tablewrap">
    <table><thead><tr><th>Rang</th><th>Mot</th><th>Sens proposé</th><th>Racine</th><th>Occ.</th></tr></thead>
    <tbody>${vocab}</tbody></table>
  </div>

  <h2 id="sourates">Noms de sourates <span class="count">114 noms</span></h2>
  <p class="sec-note">Traductions françaises des noms, telles qu’elles apparaissent dans les
    listes de l’application.</p>
  <p class="flag"><span class="flag__tag">à vérifier en priorité</span>${esc(DOUTES.bloc.sourates)}</p>
  <div class="cols">${noms}</div>

  <footer>
    <p>Document généré depuis les fichiers de données de l’application, le
      ${new Date().toISOString().slice(0, 10)}. Il reflète donc exactement ce que
      l’application affiche.</p>
  </footer>
</div>`;

  await writeFile(OUT, html);
  const flagged = doubtCount;
  console.log(`✓ docs/relecture.html — ${(html.length / 1024).toFixed(0)} Ko`);
  console.log(`  ${mk.points.length} points, ${alpha.letters.length} lettres, ${tj.rules.length} règles,`);
  console.log(`  ${Object.keys(gloss.words).length} mots, 114 noms de sourates`);
  console.log(`  ${flagged} points signalés « à vérifier en priorité »`);
}

main().catch((e) => { console.error('Échec :', e.message); process.exit(1); });
