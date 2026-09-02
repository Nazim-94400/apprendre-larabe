# Apprendre l'arabe — du tracé des lettres à la récitation

**En ligne : https://nazim-94400.github.io/apprendre-larabe/**

PWA hors ligne, en HTML/CSS/JS sans étape de build, destinée à GitHub Pages.
Parcours progressif : alphabet et tashkîl → makhârij al-hurûf → règles de tajweed →
lecture guidée → récitation et auto-évaluation → mémorisation → vocabulaire coranique.

**Projet non commercial.** L'audio de récitation prévu est sous licence CC BY-NC, qui
interdit tout usage commercial, et le vocabulaire issu du Drive est en CC BY-NC-SA.
Voir `docs/03-sources-et-licences.md`.

## Prérequis

Node.js 20 ou plus, uniquement pour régénérer les données — l'application elle-même
n'en a pas besoin, elle ne sert que des fichiers statiques.

Sur ce poste, Node 24 LTS est installé en version portable dans `%LOCALAPPDATA%\node`
et ajouté au PATH utilisateur. Aucun droit administrateur n'a été nécessaire ;
supprimer ce dossier suffit à le désinstaller.

## Lancer en local

Un service worker exige une origine `http(s)` : ouvrir `index.html` en `file://` ne
permet pas de tester le mode hors ligne.

```bash
npm run serve
```

Puis http://localhost:8080. Le serveur n'utilise que HttpListener, fourni avec Windows.

## Régénérer les données coraniques

```bash
npm run build:data
```

Télécharge les sources dans `tools/.cache/` (ignoré par Git), puis produit
`data/quran/`. La génération échoue bruyamment si les annotations de tajweed ne
s'alignent pas sur le texte — voir `docs/03-sources-et-licences.md`, section 9.

## État actuel

| | |
|---|---|
| Coquille PWA, manifest, service worker | fait |
| Routeur par hash, thème clair/sombre, taille de texte | fait |
| IndexedDB (profil, progression, SRS, enregistrements) | schéma posé |
| Polices arabes — Amiri, Amiri Quran, Scheherazade New | embarquées (OFL) |
| Texte coranique — 114 sourates, 6 236 versets | généré |
| Tajweed — 60 057 annotations, 18 règles | généré, 0 anomalie |
| Couche d'accès aux données et moteur de coloration | fait |
| Inventaire du Drive (8 PDF) | fait — `docs/00-inventaire-drive.md` |
| Écran Sources et licences | fait |
| Module 1 — alphabet, formes, tashkîl, trois quiz | fait |
| Module 2 — makhârij, schéma SVG, discrimination | fait |
| Module 3 — 18 règles, exemples réels, exercices | fait |
| Module 4 — lecture guidée, audio, surlignage mot à mot | fait |
| Horodatages mot à mot — 3 récitateurs, 6 236 versets | générés |
| Modules 5 à 7 | squelettes |
| Traduction française des versets | licence non résolue |

## Documentation

- `docs/00-inventaire-drive.md` — ce que les documents personnels apportent, et ce qui manque
- `docs/01-modele-de-donnees.md` — clé pivot, schémas JSON, stores IndexedDB
- `docs/02-architecture-fichiers.md` — arborescence, contrat des modules, stratégie de cache
- `docs/03-sources-et-licences.md` — chaque source, sa licence, ses contraintes, et les
  deux pièges d'encodage rencontrés à l'intégration

## Règle de contribution des données

Aucun fichier n'entre dans `data/` sans une entrée correspondante dans
`docs/03-sources-et-licences.md` et un bloc `_meta` en tête de fichier
(source, URL, licence, date de génération).
