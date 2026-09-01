# Modèle de données

## Principe directeur : une clé pivot unique

Tout dans l'application se rattache à une **référence canonique** :

| Objet | Clé | Exemple |
|---|---|---|
| Sourate | `"<s>"` | `"112"` |
| Verset | `"<s>:<a>"` | `"2:255"` |
| Mot | `"<s>:<a>:<w>"` | `"2:255:1"` |
| Lettre (leçon) | `"letter:<id>"` | `"letter:dhad"` |
| Règle tajweed | `"rule:<id>"` | `"rule:ikhfa"` |

Ces clés sont celles employées par le Quranic Arabic Corpus et l'API Quran.com, ce qui
permet d'y raccorder n'importe quelle source externe sans table de correspondance.

C'est **la** décision structurante : les timings audio, les annotations de tajweed, le
vocabulaire, la progression Hifz et l'historique d'enregistrements sont tous indexés par
cette même clé. Ajouter une nouvelle couche de données (un tafsir, un second réciter,
une deuxième traduction) ne demande alors aucun changement de schéma.

## Seconde décision : annotations par offsets, jamais par réécriture

La licence Tanzil interdit de modifier le texte. Ce serait de toute façon une mauvaise
idée : un texte truffé de balises devient impossible à réutiliser. Le texte est donc
stocké comme une chaîne intacte, et **toutes** les annotations sont des intervalles
`{start, end}` en points de code Unicode pointant dans cette chaîne.

Le moteur de rendu fusionne les intervalles en spans au moment de l'affichage. Cela
permet d'activer/désactiver chaque famille de règles indépendamment, et de superposer
plusieurs couches (tajweed + mot courant surligné par l'audio) sans conflit.

---

## Données de contenu (statiques, versionnées, en lecture seule)

### `/data/quran/surahs.json`
```json
{
  "_meta": { "source": "Tanzil.net", "url": "https://tanzil.net/download/",
             "license": "Tanzil terms — verbatim only", "generated": "2026-09-01" },
  "surahs": [
    { "id": 1, "name_ar": "الفاتحة", "name_translit": "Al-Fatiha",
      "name_fr": "L'ouverture", "ayah_count": 7, "revelation": "mecquoise",
      "juz": [1], "difficulty": 1 }
  ]
}
```

### `/data/quran/text/<sourate>.json` — un fichier par sourate (chargement à la demande)
```json
{
  "_meta": { "edition": "uthmani-pause-sajdah", "sha256": "…" },
  "surah": 112,
  "ayahs": {
    "1": { "text": "قُلْ هُوَ ٱللَّهُ أَحَدٌ", "translit": "qul huwa llāhu aḥad" }
  }
}
```
Le `sha256` est vérifié par le script de build : si le texte Tanzil change, les offsets
de tajweed sont invalidés au lieu d'être appliqués silencieusement au mauvais texte.

### `/data/quran/tajweed/<sourate>.json`
```json
{
  "112:1": [
    { "rule": "madd_2", "start": 12, "end": 14 },
    { "rule": "lam_shamsiyyah", "start": 8, "end": 10 }
  ]
}
```

### `/data/quran/words/<sourate>.json`
```json
{
  "112:1": [
    { "w": 1, "ar": "قُلْ", "translit": "qul", "fr": "dis",
      "root": "ق و ل", "occurrences": 1722, "lemma": "قَالَ" }
  ]
}
```

### `/data/audio/reciters.json`
```json
{
  "reciters": [
    { "id": "husary_mujawwad", "name": "Mahmoud Khalil Al-Husary",
      "style": "mujawwad", "base_url": "https://everyayah.com/data/Husary_128kbps/",
      "pattern": "{s:3}{a:3}.mp3", "license": "CC BY-NC",
      "attribution_url": "https://everyayah.com", "has_segments": true }
  ]
}
```
Le `pattern` évite de coder en dur la logique d'URL de chaque réciter : ajouter un
réciter, c'est ajouter une ligne dans ce fichier.

### `/data/audio/segments/<reciter>/<sourate>.json` — timings mot à mot (mode karaoké)
```json
{ "112:1": { "duration_ms": 4120, "segments": [[1, 0, 620], [2, 620, 1180]] } }
```

---

## Données pédagogiques

### `/data/lessons/alphabet.json`
```json
{
  "letters": [
    { "id": "dhad", "name_ar": "ضاد", "name_fr": "Dâd", "translit": "ḍ",
      "forms": { "isolated": "ض", "initial": "ضـ", "medial": "ـضـ", "final": "ـض" },
      "makhraj": "lateral_tongue",
      "stroke_path": "assets/strokes/dhad.svg",
      "audio": { "isolated": "…", "fatha": "…", "kasra": "…", "damma": "…", "sukun": "…" },
      "confusable_with": ["dal", "za", "ta_emphatic"],
      "sifat": ["jahr", "shidda", "istila", "itbaq"] }
  ]
}
```
`confusable_with` alimente directement les exercices de discrimination auditive du
Module 2 — pas besoin d'une liste d'exercices séparée à maintenir.

### `/data/lessons/makharij.json`
Groupes de points d'articulation → zone anatomique, description FR, lettres concernées,
identifiant de la zone dans le schéma SVG (surlignage par `id`).

### `/data/lessons/tajweed-rules.json`
```json
{
  "rules": [
    { "id": "ikhfa", "family": "noon_sakinah", "name_ar": "إخفاء",
      "name_fr": "Ikhfâ'", "order": 4,
      "short": "Son nasalisé intermédiaire, ni clair ni assimilé.",
      "explanation_md": "…",
      "duration_beats": 2,
      "color": "--tj-ikhfa",
      "examples": ["2:3:4", "112:4:2"],
      "exercise_verses": ["78:1", "78:5"],
      "prerequisites": ["ghunna"] }
  ]
}
```
Chaque règle référence des exemples par **clé de mot**, donc l'exemple audio et la
coloration sont obtenus gratuitement via les couches existantes.

### `/data/lessons/curriculum.json` — le squelette du parcours
```json
{
  "steps": [
    { "id": "f1-letters-isolated", "module": 1, "title": "Les lettres isolées",
      "type": "lesson", "unlocks": ["f1-letters-forms"],
      "requires": [], "mastery": { "type": "quiz", "threshold": 0.8 } }
  ]
}
```
C'est ce fichier qui définit la progression Nourania. Réordonner le parcours pédagogique
ne demande alors **aucune modification de code**.

---

## Données utilisateur (IndexedDB, un seul profil local)

| Store | Clé | Contenu |
|---|---|---|
| `profile` | `"default"` | préférences, thème, taille de texte, réciter, vitesse |
| `progress` | `step_id` | statut, score, tentatives, dates |
| `srs` | `card_id` (clé pivot) | `ease`, `interval`, `due`, `reps`, `lapses` (SM-2) |
| `recordings` | auto-inc | `Blob` audio, `verse_key`, date, durée, score, features |
| `stats` | date | temps passé, séries, versets validés |

`localStorage` n'est utilisé que pour le thème et la dernière page visitée — c'est-à-dire
ce qui doit être lu **avant** le premier rendu, pour éviter le flash de thème clair.

Le store `srs` accepte indifféremment `"2:255"` et `"letter:dhad"` comme identifiant de
carte : la répétition espacée couvre donc aussi bien la mémorisation de sourates
(Module 6) que la révision des lettres et des règles, sans second système.

---

## Ce que le modèle rend facile plus tard

- ajouter un réciter → une ligne dans `reciters.json`
- ajouter une traduction → un dossier `/data/quran/translations/<code>/`
- ajouter une règle de tajweed → une entrée dans `tajweed-rules.json` + une couleur CSS
- ajouter une sourate → aucun code, les fichiers sont chargés à la demande par numéro
- changer l'ordre du parcours → `curriculum.json` uniquement
