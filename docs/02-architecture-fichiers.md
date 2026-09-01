# Architecture de fichiers et choix techniques

## Stack retenue : JS vanilla en modules ES, sans étape de build

Raison : GitHub Pages sert du statique. Un bundler ajouterait une étape de compilation,
une source de panne, et n'apporterait rien ici — l'application n'a ni dépendance lourde
ni besoin de JSX. Les modules ES natifs sont supportés partout, et le service worker
met en cache des fichiers réels plutôt que des chunks opaques, ce qui rend le
fonctionnement offline plus simple à déboguer.

Un `/tools` en Node.js sert uniquement à **générer les données**, hors ligne, à la main.
Il ne fait pas partie du site déployé.

Routage par hash (`#/module/4/lecon/2`) : obligatoire sur GitHub Pages, qui ne sait pas
réécrire les URL vers `index.html`.

---

## Arborescence

```
/
├── index.html                  coquille unique (app shell)
├── manifest.webmanifest
├── sw.js                       service worker
├── 404.html                    → redirige vers index.html
├── README.md
│
├── assets/
│   ├── fonts/                  Amiri, Scheherazade New (OFL)
│   ├── icons/                  icônes PWA
│   └── strokes/                SVG du tracé des lettres
│
├── src/
│   ├── main.js                 point d'entrée, montage du shell
│   ├── router.js               routeur hash, chargement paresseux des écrans
│   │
│   ├── core/
│   │   ├── db.js               IndexedDB (wrapper minimal, promesses)
│   │   ├── store.js            état applicatif + abonnements
│   │   ├── progress.js         lecture/écriture de la progression, déblocage
│   │   ├── srs.js              algorithme SM-2
│   │   ├── audio-player.js     lecture, vitesse 0.5–1.5x, boucle, file d'attente
│   │   ├── recorder.js         MediaRecorder + capture Web Audio
│   │   ├── analysis.js         MFCC + DTW (comparaison de récitation)
│   │   ├── cache.js            téléchargement audio à la demande, quotas
│   │   └── loader.js           chargement paresseux des JSON, mémoïsation
│   │
│   ├── data-access/
│   │   ├── quran.js            versets, mots, traduction par clé pivot
│   │   ├── tajweed.js          fusion des intervalles → spans rendus
│   │   └── lessons.js          alphabet, makharij, règles, curriculum
│   │
│   ├── ui/
│   │   ├── theme.js            clair/sombre, taille de texte
│   │   ├── components/         éléments réutilisables (sans framework)
│   │   │   ├── ayah-view.js    rendu d'un verset + couches de surlignage
│   │   │   ├── arabic-text.js  gestion RTL, tailles, tashkîl on/off
│   │   │   ├── quiz.js         moteur de quiz générique
│   │   │   ├── audio-bar.js
│   │   │   └── waveform.js
│   │   └── styles/
│   │       ├── tokens.css      variables (couleurs, espacements, thèmes)
│   │       ├── base.css
│   │       ├── rtl.css
│   │       └── tajweed.css     une couleur par règle
│   │
│   └── modules/
│       ├── 01-fondations/      alphabet, formes, tracé, tashkîl
│       ├── 02-makharij/        fiches, schéma anatomique, discrimination auditive
│       ├── 03-tajweed/         leçons, exercices d'identification, glossaire
│       ├── 04-lecture/         progression Nourania, lecture guidée karaoké
│       ├── 05-recitation/      enregistrement, comparaison, validation
│       ├── 06-hifz/            masquage progressif, révision espacée
│       ├── 07-vocabulaire/     fiches mots, quiz contextualisés
│       └── dashboard/          accueil, progression globale
│
├── data/                       (voir docs/01-modele-de-donnees.md)
│   ├── quran/  audio/  lessons/  vocab/
│
├── tools/                      scripts Node — NON déployés
│   ├── fetch-sources.mjs       télécharge les sources dans tools/.cache/
│   ├── build-quran.mjs         Tanzil → JSON par sourate + sha256
│   ├── build-tajweed.mjs       offsets réalignés + vérification stricte
│   ├── surah-names-fr.json     noms français des 114 sourates
│   ├── serve.ps1               serveur statique local (HttpListener)
│   ├── build-words.mjs         (à venir) corpus → mot à mot + racines
│   └── build-segments.mjs      (à venir) timings audio figés en local
│
└── docs/
    ├── 00-inventaire-drive.md  (à produire — Phase 0)
    ├── 01-modele-de-donnees.md
    ├── 02-architecture-fichiers.md
    └── 03-sources-et-licences.md
```

---

## Chaque module expose la même interface

```js
export default {
  id: '03-tajweed',
  title: 'Règles de Tajweed',
  async mount(container, params) { /* rend l'écran */ },
  async unmount() { /* libère audio, timers, écouteurs */ }
}
```

Le routeur ne connaît rien des modules au-delà de ce contrat. Ajouter un module se fait
en déposant un dossier et en l'enregistrant dans une table de routes — sans toucher au
reste. `unmount()` est obligatoire : sans lui, l'audio d'une leçon continue de jouer
quand on navigue ailleurs, un défaut classique de ce type d'application.

---

## Stratégie de cache (service worker)

Trois caches distincts, avec des politiques différentes :

| Cache | Contenu | Politique |
|---|---|---|
| `app-shell-v<n>` | HTML, JS, CSS, polices, icônes | précaché à l'installation, *cache first* |
| `data-v<n>` | JSON de sourates, leçons | *stale-while-revalidate*, mis en cache à la consultation |
| `audio` | MP3 de récitation | **jamais automatique** — uniquement sur téléchargement explicite |

L'audio est le point sensible : le Coran complet en MP3 pèse plusieurs centaines de Mo.
Il est donc téléchargé sourate par sourate, sur action de l'utilisateur, avec affichage
de la taille avant et de l'espace utilisé après. Un écran « Gestion du stockage »
permet de libérer de la place.

Le premier chargement vise à rester sous ~2 Mo (shell + polices + données du Module 1).

---

## Module 5 — ce qui est réellement faisable dans un navigateur

À dire clairement dès maintenant, parce que cela conditionne la Phase 3 :

**Faisable, sans téléchargement de modèle :**
- enregistrement (MediaRecorder), affichage de la forme d'onde
- extraction MFCC + alignement DTW contre l'audio de référence
- score de **timing** par mot : allongements (madd) trop courts ou trop longs, pauses
  mal placées, rythme global. C'est mesurable de façon fiable et c'est précisément ce
  que les règles de madd et de ghunna exigent.
- superposition visuelle des deux courbes d'énergie, verset par verset

**Non fiable en l'état actuel :**
- juger automatiquement la justesse d'un **point d'articulation** (ص contre س), ou
  d'un tafkhîm. Aucun modèle librement disponible ne le fait avec une précision
  suffisante pour ne pas décourager l'apprenant par des faux négatifs.

**Piste optionnelle :** un modèle de reconnaissance vocale arabe (type Whisper via
transformers.js, ONNX quantifié) exécuté dans un Web Worker permettrait de vérifier que
les **mots** récités sont les bons. Coût : 40 à 80 Mo de téléchargement. À proposer en
option activable, jamais dans le chargement initial.

Proposition retenue : Phase 3 = timing + comparaison visuelle + **auto-validation par
l'utilisateur** (il s'écoute et valide lui-même). L'outil aide à entendre ses écarts ;
il ne prétend pas noter le tajweed à la place d'un professeur.

---

## Ce qui reste à trancher avant de coder

1. Traduction française — licence à sécuriser (voir `03-sources-et-licences.md`)
2. Réciter par défaut : Al-Husary *mu'allim* (lent, pédagogique) est le meilleur choix
   pour l'apprentissage ; Al-Afasy en option
3. Portée de la Phase 1 : Juz 'Amma seul (sourates 78–114) ou Coran complet dès le début

---

## Mise à jour du service worker

`sw.js` porte une constante `VERSION`. **Elle doit être incrémentée dès qu'un fichier
de `SHELL_ASSETS` change** — sinon les navigateurs qui ont déjà installé une version
continuent de servir l'ancien shell depuis leur cache.

Piège de développement rencontré : enchaîner `unregister()`, vidage des caches et
`register()` dans un même onglet laisse le navigateur dans un état où il renvoie un
worker déjà activé sans relancer `install`. Le précache paraît alors vide et le mode
hors ligne semble cassé alors que le code est correct. Pour vérifier un changement de
service worker, **ouvrir un onglet neuf** plutôt que recycler le précédent.

## Ce qui est effectivement précaché

22 ressources : la coquille HTML, le manifeste, les modules du tableau de bord, les
quatre feuilles de style, les deux polices arabes les plus utilisées et l'icône.

Le reste — modules pédagogiques, sourates, annotations, polices secondaires — est mis
en cache au fil de la consultation. Une sourate consultée une fois reste disponible
hors ligne ; les 114 ne sont jamais téléchargées d'office.
