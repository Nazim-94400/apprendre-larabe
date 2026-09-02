/**
 * Service worker.
 *
 * Trois caches, trois politiques distinctes :
 *   app-shell  code et polices        -> précaché à l'installation, cache first
 *   data       JSON de contenu        -> stale-while-revalidate, rempli à l'usage
 *   audio      MP3 de récitation      -> JAMAIS automatique, uniquement sur demande
 *
 * L'audio est isolé parce que le Coran complet pèse plusieurs centaines de Mo :
 * le mettre en cache au fil de la navigation remplirait le quota du navigateur à
 * l'insu de l'utilisateur, qui verrait ensuite des écritures échouer sans raison
 * apparente.
 */

const VERSION = 'v18';
const SHELL = `app-shell-${VERSION}`;
const DATA  = `data-${VERSION}`;
const AUDIO = 'audio';                 // volontairement non versionné : jamais purgé

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/router.js',
  './src/core/db.js',
  './src/core/store.js',
  './src/ui/theme.js',
  './src/ui/styles/fonts.css',
  './src/ui/styles/tokens.css',
  './src/ui/styles/base.css',
  './src/ui/styles/rtl.css',
  './src/ui/styles/components.css',
  './src/ui/styles/tajweed.css',
  './src/modules/registry.js',
  './src/modules/dashboard/index.js',
  './src/modules/dashboard/liste.js',
  './src/modules/dashboard/reviser.js',
  './src/modules/dashboard/reglages.js',
  './src/modules/dashboard/sources.js',
  './assets/fonts/amiri-arabic-400-normal.woff2',
  './assets/fonts/scheherazade-new-arabic-400-normal.woff2',
  './assets/icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // `cache: 'reload'` contourne le cache HTTP du navigateur. Sans lui, une
    // nouvelle version du service worker peut précacher les anciens fichiers,
    // toujours présents dans le cache HTTP : on publie une mise à jour et les
    // utilisateurs continuent de voir la version précédente.
    //
    // Chaque ressource est ajoutée séparément plutôt que par addAll, qui échoue en
    // bloc dès qu'une seule manque — un fichier renommé rendrait alors toute
    // l'application inutilisable hors ligne.
    await Promise.all(SHELL_ASSETS.map(async (u) => {
      try {
        const res = await fetch(new Request(u, { cache: 'reload' }));
        if (res.ok) await cache.put(u, res);
        else console.warn('[sw] ressource ignorée', u, res.status);
      } catch (err) {
        console.warn('[sw] ressource ignorée', u, err);
      }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, DATA, AUDIO]);
    await Promise.all((await caches.keys())
      .filter((k) => !keep.has(k))
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/** Téléchargement explicite d'audio, déclenché par l'application. */
self.addEventListener('message', (e) => {
  const { type, urls } = e.data || {};
  if (type !== 'cache-audio' || !Array.isArray(urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(AUDIO);
    let done = 0;
    for (const url of urls) {
      try { await cache.add(url); } catch (err) { console.warn('[sw] audio', url, err); }
      done++;
      e.source?.postMessage({ type: 'cache-audio-progress', done, total: urls.length });
    }
    e.source?.postMessage({ type: 'cache-audio-done', total: urls.length });
  })());
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Audio : cache uniquement, jamais de mise en cache implicite.
  if (/\.(mp3|ogg|m4a)$/i.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then((c) =>
      c.match(request).then((hit) => hit || fetch(request))));
    return;
  }

  if (url.origin !== location.origin) return;

  // Données JSON : sert le cache, rafraîchit en arrière-plan.
  if (url.pathname.includes('/data/')) {
    e.respondWith((async () => {
      const cache = await caches.open(DATA);
      const hit = await cache.match(request);
      const net = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    })());
    return;
  }

  // Navigation : réseau d'abord, repli sur l'app shell quand il est injoignable.
  //
  // Renvoyer index.html à toute navigation ferait disparaître les fichiers réels
  // servis depuis la même origine : ouvrir directement un PDF ou un JSON afficherait
  // l'application à la place, avec des chemins relatifs cassés.
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // Reste du shell (y compris les modules chargés paresseusement) : cache first.
  e.respondWith((async () => {
    const hit = await caches.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok) (await caches.open(SHELL)).put(request, res.clone());
    return res;
  })());
});
