# Sources de données et licences

État : **vérifié le 2026-09-01** par consultation directe des pages officielles.
Toute source ajoutée plus tard doit être documentée ici avant intégration.

---

## 1. Texte coranique

### Tanzil.net — RETENU (source primaire)
- URL : https://tanzil.net/download/
- Éditions : Simple (Plain / Minimal / Clean), **Uthmani**, Uthmani (Minimal)
- Formats : texte brut, texte + numéros d'aya, **XML**, SQL
- Options : marques de pause, signes de sajdah ۩, rub-el-hizb ۞, tatweel
- Licence (citation) : copie et distribution verbatim autorisées, **modification du texte
  interdite** ; utilisation en site ou application autorisée à condition d'indiquer
  clairement la source (Tanzil Project) et de faire un lien vers tanzil.net.
- Conséquence pour le projet : le texte est stocké **tel quel**, jamais réécrit.
  Toute annotation (tajweed, mots, translittération) est stockée **à côté** du texte,
  par offsets — jamais en modifiant la chaîne. Mention + lien obligatoires dans l'app
  (écran « Sources »).
- Édition choisie : `uthmani` avec marques de pause et sajdah, afin de rester alignée
  avec les offsets de la source tajweed ci-dessous.

---

## 2. Annotations de tajweed

### cpfair/quran-tajweed — RETENU
- URL : https://github.com/cpfair/quran-tajweed
- Produit : JSON `{sourate, aya, règle, start, end}` où start/end sont des **offsets en
  points de code Unicode** dans le texte coranique.
- Règles détectées (14) : ghunnah, idghaam (5 variantes), ikhfa (2 types), iqlab,
  madd (4 variantes), qalqalah, hamzat al-wasl, lam shamsiyyah, lettres muettes.
- Fichier prégénéré : `output/tajweed.hafs.uthmani-pause-sajdah.json`
- Licence : **CC BY 4.0** pour le fichier de données ; le texte coranique sous-jacent
  reste soumis aux conditions Tanzil.
- Point d'attention critique : les offsets ne sont valides que pour la variante
  **uthmani-pause-sajdah** exacte. Le script de build doit vérifier, verset par verset,
  que le texte Tanzil téléchargé correspond bien (hash) avant d'accepter les offsets.
  Normalisation Unicode : conserver la forme d'origine, ne pas appliquer NFC/NFD.

### Lacunes à combler manuellement
Le jeu ci-dessus ne couvre pas tout le programme du Module 3 :
- règles du **Ra** (tafkhîm / tarqîq) — absentes
- règles du **Lâm** dans le nom d'Allah — absentes
- distinction fine idhâr / idghâm **chafawi** (mîm sâkina) — partiellement absente
- durées de madd en temps (2 / 4 / 6) — à dériver des types de madd
→ à produire par règles déterministes dans `/tools`, avec relecture humaine.

---

## 3. Audio de récitation

### EveryAyah.com — RETENU avec réserve
- URL : https://everyayah.com/data/
- Structure : un MP3 par verset, URL directe prévisible (`<reciter>/001001.mp3`)
- Réciters incluant Al-Husary, Al-Afasy, Minshawi (dont versions « mu'allim »
  pédagogiques, particulièrement adaptées aux Modules 4 et 6)
- Licence : **CC BY-NC** — attribution + lien retour vers everyayah.com obligatoires,
  **usage commercial interdit**.
- Conséquence : l'application doit rester non commerciale. À acter explicitement.
- Fichiers de timings disponibles pour certains réciters (utiles au mode karaoké).

### API Quran.com / Quran Foundation — RETENU pour les timings mot à mot
- URL : https://api-docs.quran.foundation/
- Fournit les URL audio par verset et par sourate, et surtout des **segments**
  `[index_du_mot, début_ms, fin_ms]` — exactement ce qu'il faut pour le surlignage
  synchronisé du Module 4.
- Réserve : nécessite des identifiants d'application et un appel réseau. Stratégie :
  appeler l'API **au moment du build** (`/tools`) pour figer les segments en JSON local,
  afin de garder le fonctionnement offline et d'éviter toute clé d'API côté client.
- Alternative sans API : https://github.com/cpfair/quran-align (timings mot à mot
  précalculés, même auteur que la source tajweed).

---

## 4. Mot à mot, racines, morphologie

### Quranic Arabic Corpus — RETENU avec réserve de licence
- URL : https://corpus.quran.com/download/
- Contenu : 77 430 mots annotés (partie du discours, morphologie, racine trilitère)
- Licence : **GNU GPL**, source à indiquer clairement + lien vers corpus.quran.com
- Réserve : la GPL est contaminante. Le corpus sera donc traité comme une **donnée
  externe** placée dans un dossier `/data/corpus/` clairement identifié et attribué,
  et non fusionné dans le code applicatif. À confirmer avant intégration.
- Sert : Module 7 (racine trilitère, occurrences) et le découpage mot à mot.

---

## 5. Traduction française

**Lacune non résolue.** La traduction de Muhammad Hamidullah est la plus diffusée
(disponible via Tanzil, code `fr.hamidullah`) mais son statut de droits est ambigu
selon les distributions. À trancher avant la Phase 1 : soit s'appuyer sur une édition
dont la licence est explicite, soit limiter le Module 7 à la traduction mot à mot
(dérivable du corpus) plutôt qu'à une traduction complète des versets.

---

## 6. Polices

| Police | Licence | Usage prévu |
|---|---|---|
| Amiri | SIL OFL 1.1 — libre, redistribuable | interface + texte non coranique |
| Scheherazade New | SIL OFL 1.1 — libre, redistribuable | lettres isolées, Modules 1–2 (très lisible en grand corps) |
| KFGQPC / QCF (Uthmanic Hafs) | **restrictive** — explicitement exclue des autorisations de QUL | à éviter, ou usage à valider au cas par cas |

Décision : n'embarquer que des polices OFL. Le rendu « mushaf » page par page,
qui exige les polices QCF, est écarté au profit d'un rendu Unicode.

---

## 7. Ressources complémentaires repérées

- **QUL — Quranic Universal Library** (https://qul.tarteel.ai/) : agrégateur de scripts,
  polices, tafsirs, traductions. Licences **hétérogènes, à vérifier ressource par
  ressource** ; l'autorisation générale ne couvre ni les polices QCF ni les tafsirs.
  Utile comme point d'entrée, pas comme source à copier en bloc.

---

## Règle de fonctionnement

1. Aucune donnée n'entre dans `/data` sans une ligne dans ce fichier.
2. Chaque fichier généré porte un en-tête `_meta` : source, URL, licence, date, version
   du script de génération.
3. Un écran « Sources et licences » de l'application reprend ces attributions,
   accessible depuis les réglages.

---

## 8. Sources issues du Drive personnel

Inventaire complet et analyse : `docs/00-inventaire-drive.md`.

### « 80% des mots du Qour'ân » (AL-LAWH) — RETENU
- Licence : **CC BY-NC-SA 3.0 FR** (page 2, note 5)
- Contact : `allawhou@gmail.com` — **fichiers sources `.xls` disponibles sur demande**
- Alimente : Module 7 (vocabulaire, fréquences, thèmes)
- Contrainte : le *Share Alike* impose de publier sous la même licence la partie de
  l'application qui incorpore ces données. À arbitrer avant intégration.

### « L'écriture arabe en 50 fiches » — RETENU pour sa structure uniquement
- Licence : **non déterminée** (document scolaire, mention INRP)
- Ce qui est repris : l'**ordre de progression** des 50 fiches, qui est une méthode et
  non une expression protégeable. Les exercices seront produits par le projet.
- Alimente : Modules 1 et 4 (`curriculum.json`)

### Écartés pour raisons de droits
| Document | Motif |
|---|---|
| *Apprentissage de l'alphabet arabe*, Éditions Erkam | livre édité commercialement |
| *Lessons in Arabic Language, Book 1* (Médine) | autorisation accordée à Fatwa-Online, pas au projet |

Dans les deux cas, seule la **structure pédagogique** est reprise ; les tableaux de
syllabes sont générés par programme.

---

## 9. Pièges rencontrés à l'intégration (2026-09-02)

Deux pièges silencieux, tous deux détectés par la vérification automatique de
`tools/build-tajweed.mjs` et non par une inspection visuelle. À connaître avant de
toucher aux scripts.

### Le paramètre `tatweel` de Tanzil

Le formulaire de téléchargement Tanzil est un formulaire à cases à cocher : une case
décochée n'envoie **rien**. Côté serveur, seule la *présence* du paramètre compte.
Écrire `&tatweel=false` **active** donc le tatweel, exactement comme `&tatweel=true`.

Le texte gagne alors un U+0640 dans chaque dagger alif (ـٰ), et toutes les annotations
qui suivent se décalent d'un caractère — sans erreur, sans avertissement. Une option
se désactive en l'omettant de l'URL.

### Le texte de référence des annotations n'est plus celui distribué

Le README de cpfair est explicite : l'encodage des fichiers Tanzil a changé depuis le
calcul des offsets. Les annotations sont exprimées sur un instantané d'avril 2017,
conservé comme pièce jointe du dépôt.

| Texte utilisé | Échecs sur 15 985 vérifications |
|---|---|
| Tanzil actuel, marques + sajdah | 5 370 |
| Tanzil actuel, sans marques | 422 |
| Instantané de 2017 | **0** |

Le projet ne fige pas pour autant le texte de 2017 : il perdrait les corrections
d'encodage ultérieures et les marques de pause, qu'un apprenant doit voir. Le script
conserve le texte Tanzil actuel comme texte affiché et **réaligne** chaque annotation
de 2017 vers celui-ci, verset par verset (2 761 versets réalignés, 3 475 identiques).

L'alignement est exact, pas heuristique : élimination du préfixe et du suffixe communs,
puis plus longue sous-séquence commune sur la fenêtre divergente. En cas d'égalité, la
suppression est consommée avant l'insertion — sans quoi le madd de إبراهيم, écrit `ۦ`
en 2017 et `ـۧ` aujourd'hui, se retrouve sur le م suivant.

**Résultat : 60 057 annotations, 18 règles, 0 anomalie.**

### Règle de maintenance

Ne jamais désactiver les contrôles de `build-tajweed.mjs` pour « faire passer » une
génération. Une annotation décalée colore la mauvaise lettre et enseigne une erreur —
c'est pire que l'absence de couleur.
