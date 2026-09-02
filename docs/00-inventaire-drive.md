# Inventaire du Drive

Fait le 2026-09-01 sur 8 PDF (copiés dans `_drive/`, exclu de Git).
Texte extrait avec `pdftotext`, pages scannées inspectées visuellement.

**Deux fichiers annoncés sont absents** de `Downloads` et n'ont pas pu être examinés :
*Grammaire arabe. Théorie + Exercices + Corrigés* et *Kitab Al Ta'rifat*.
Un fichier non annoncé a été ajouté à l'inventaire : `1.alphabet arabe.pdf`.

---

## A. Directement exploitables comme source de données

### 1. `80_DES_MOTS_DU_QURAN.pdf` — 38 p. — la meilleure trouvaille

Fiches thématiques du vocabulaire coranique, par AL-LAWH, d'après « 80% of Quranic
Words » du Dr. AbdulAzeez Abdurraheem, lui-même fondé sur les statistiques de
Abou Al-Foutouh.

Contenu : sections *40% des mots*, *Noms divins*, *Création d'Allah*, *Religion, foi et
actes*, *Personnes*, *Verbes et dérivés*. Chaque entrée porte **son nombre d'occurrences
dans le Coran** (41, 51, 266…) et un pourcentage de progression cumulée.

> **Licence : Creative Commons BY-NC-SA 3.0 FR.** Explicitement modifiable et
> rediffusable. Compatible avec le projet, déjà non commercial du fait de l'audio
> EveryAyah. Attention au *Share Alike* : la partie de l'application qui intègre ces
> données devra être publiée sous la même licence.

> **Action prioritaire : les auteurs proposent les fichiers sources `.xls` sur demande**
> (page 2, note 5 — contact `allawhou@gmail.com`).
> L'extraction automatique du PDF produit des tableaux désalignés : le français et
> l'arabe atterrissent dans des colonnes séparées, et l'arabe est encodé en
> *Arabic Presentation Forms* qu'il faut renormaliser. Demander le `.xls` évite
> plusieurs heures de reconstruction et de relecture. **À faire avant de coder le
> Module 7.**

Bonus inattendu : une longue section méthodologique sur la mémorisation (les *10
consignes* et *10 stratégies* du Shaykh Al-Gouthâni). C'est de la matière directe pour
le Module 6 — pas des données, mais des principes d'interface : échauffement par
relecture de l'acquis, répétition rythmée, mémorisation par photographie visuelle du
verset.

Alimente : **Module 7** (données), **Module 6** (conception).

### 2. `ecriturearabe_50fiches.pdf` — 44 p. — structure la progression du Module 1

« L'écriture arabe en 50 fiches », document pédagogique scolaire francophone.

Sa valeur n'est pas son contenu mais **son ordre**. Les 50 fiches ne suivent pas l'ordre
alphabétique mais la **difficulté de tracé**, chaque fiche étant ancrée sur un mot cible :

| Fiche | Contenu | Mot |
|---|---|---|
| 1 | Préliminaires : gymnastique de la main, sens d'écriture | كريم وجميلة |
| 2 | RÂ' — fatha | كريم |
| 3 | MÎM | جميل |
| 5 | YÂ' — kasra — soukoun | كريمة |
| 6 | ALIF | كمال |
| 9 | BÂ' | جبل |
| 13 | CHADDA | تتكلّم |
| 20 | L'article | الكرة |
| 26–28 | HAMZA (1, 2, 3) | إسلام, الإسلام, سؤال |
| 44 | TANWÎN | — |
| 45 | Lettres solaires et lunaires | الشمس |
| 46–49 | WASLA et la liaison (1 à 4) | — |
| 50 | Lecture de mots | — |

Cet ordre a inspiré le parcours du Module 4, sans être transcrit tel quel :
l'extraction du PDF désalignait les colonnes du sommaire, et recopier un ordre mal lu
aurait été pire que d'en assumer un. Le parcours vit dans `data/lessons/curriculum.json` ;
si tu veux la progression exacte des 50 fiches, il suffit de la saisir dans ce fichier,
sans toucher au code.

L'approche phonétique de la fiche 1 est transposable telle quelle : faire compter les
**sons** avant d'introduire les **lettres**.

> **Licence : non déterminée.** Document d'origine scolaire (mention INRP sur la page de
> titre), auteurs et conditions à vérifier avant toute reprise de contenu.
> **L'ordre de progression, lui, est une méthode — pas une expression protégeable.**
> Recommandation : reprendre la structure, produire nos propres exercices.

Alimente : **Module 1** (progression), **Module 4** (ordre de lecture).

---

## B. Exploitables comme modèle pédagogique, pas comme données

### 3. `alphabet arabe 2.pdf` — 34 p. — *Apprentissage de l'alphabet arabe*, Éditions Erkam

Manuel de type **qaida / nourania** classique : pages entières de tableaux de syllabes —
HARF-MAD (prolongation), KASRA, DAMMA — combinaisons de deux et trois lettres à lire
à haute voix. C'est précisément le format du Module 4, phases « syllabes » et « mots ».

> **Livre édité commercialement — contenu non réutilisable.** Mais ces tableaux sont des
> combinaisons systématiques : `data/lessons/` peut les **générer par programme**
> (28 lettres × 3 voyelles brèves × 3 longues), sans rien copier. Le livre sert de
> référence pour valider l'ordre et le rythme d'introduction.

Fichier scanné, sans couche texte.

### 4. `Livre de médine 1.pdf` — 85 p. — *Lessons in Arabic Language, Book 1*

Édition anglaise du Tome 1 de Médine (Shaykh Dr. V. 'Abdur-Raheem, Université de
Médine). Scanné : seuls les en-têtes s'extraient.

> Chaque page porte « Courtesy of Fatwa-Online.Com, and by kind permission of
> Shaykh Dr. V. 'Abdur-Raheem ». **L'autorisation vise ce diffuseur, pas nous.**
> À ne pas intégrer.

Méthode de grammaire et de langue — hors du périmètre des 7 modules, dont l'objectif est
de lire et réciter, non de parler.

---

## C. Hors périmètre des sept modules

Ces documents relèvent de la grammaire (*nahw*, *sarf*). L'objectif étant la lecture et
la récitation, ils ne sont pas prioritaires — mais ils sont de bonne qualité et
pourraient alimenter un futur glossaire.

| Fichier | Contenu | Extraction |
|---|---|---|
| `La-traduction-en-francais-d-Al-Ajurrumiyyah.pdf` | Al-Ajurrûmiyyah, matn classique de grammaire, bilingue AR/FR | **Bonne** — arabe en Unicode correct. Pollué par un filigrane d'URL répété |
| `Valeur-des-formes-verbales-augmentees.pdf` (5 p.) | Formes verbales II à X, sens et exemples | Moyenne — arabe partiellement corrompu |
| `MEDINE_Vocabulaire_des_Tome_1_2_et_3.pdf` | Listes de vocabulaire Médine 1/2/3 et verbes | **Arabe illisible** — police non-Unicode à encodage propriétaire (`ĈŧƛĿ ĆƏŌÉ`). Le français s'extrait bien. Inexploitable sans table de correspondance |

## D. Non identifié

`1.alphabet arabe.pdf` — 20,7 Mo, aucune couche texte, et le navigateur refuse de
l'afficher : il déclenche un téléchargement au lieu d'un rendu. **À ouvrir toi-même**
et à me décrire. S'il double `alphabet arabe 2.pdf`, on l'écarte.

---

## Ce que le Drive ne couvre pas

C'est le point déterminant pour la suite. **Aucun des documents ne traite du tajweed ni
des makhârij al-hurûf.** Il n'y a pas davantage de texte coranique exploitable ni
d'audio.

| Besoin | Couvert par le Drive ? | Source |
|---|---|---|
| Texte coranique + tashkîl | non | Tanzil.net |
| Audio de récitation | non | EveryAyah (CC BY-NC) |
| Règles de tajweed | **non — lacune totale** | cpfair/quran-tajweed + rédaction à faire |
| Makhârij al-hurûf | **non — lacune totale** | à rédiger intégralement |
| Polices arabes | non | Amiri, Scheherazade New (OFL) |
| Vocabulaire coranique | **oui** — 80% des mots | Drive |
| Progression de lecture | **oui** — 50 fiches et qaida Erkam | Drive |
| Traduction française des versets | non | licence non résolue |

Autrement dit : le Drive apporte beaucoup à l'**entrée** du parcours (Module 1) et à sa
**sortie** (Module 7), et rien au milieu (Modules 2 et 3). Les contenus de tajweed et de
makhârij devront être rédigés, puis relus par quelqu'un de qualifié.

---

## Conséquences sur le modèle de données

Aucune incompatibilité avec `01-modele-de-donnees.md`. Trois ajustements :

1. **`vocab/frequency.json` gagne un champ `theme`.** Le document 80% est organisé par
   thème autant que par fréquence, et c'est ce qui fait sa valeur pédagogique.
   Prévoir `{ theme, subtheme, occurrences, cumulative_pct }`.
2. **`curriculum.json` peut accepter un mot cible par étape.** Les 50 fiches ancrent
   chaque étape sur un mot concret (fiche 2 → كريم). Le champ `anchor_word` n'est pas
   encore utilisé : il le deviendra si la progression des fiches est saisie.
3. **Normalisation Unicode obligatoire à l'import.** Les PDF exploitables encodent
   l'arabe en *Presentation Forms* (U+FE70–FEFF). Le script d'import doit appliquer
   NFKC puis vérifier le résultat — faute de quoi le texte s'affichera correctement
   tout en ne correspondant à aucune clé du texte coranique.
