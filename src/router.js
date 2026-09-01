/**
 * Routeur par hash. Le hash est imposé par GitHub Pages, qui ne sait pas réécrire
 * les URL profondes vers index.html.
 *
 * Chaque écran est chargé paresseusement (import dynamique) et expose le même
 * contrat : { title, mount(el, params), unmount() }. unmount() est appelé
 * systématiquement avant de quitter un écran -- sans lui, l'audio d'une leçon
 * continue de jouer après la navigation, défaut classique de ce type d'application.
 */

const ROUTES = [
  { re: /^\/$/,                    load: () => import('./modules/dashboard/index.js') },
  { re: /^\/modules$/,             load: () => import('./modules/dashboard/liste.js') },
  { re: /^\/reviser$/,             load: () => import('./modules/dashboard/reviser.js') },
  { re: /^\/reglages$/,            load: () => import('./modules/dashboard/reglages.js') },
  { re: /^\/sources$/,             load: () => import('./modules/dashboard/sources.js') },
  { re: /^\/m\/([\w-]+)(?:\/(.*))?$/, load: (id) => import(`./modules/${id}/index.js`),
    params: (m) => ({ moduleId: m[1], path: m[2] || '' }) }
];

let current = null;
let el = null;

function parse() {
  const raw = location.hash.slice(1) || '/';
  return raw.startsWith('/') ? raw : '/' + raw;
}

function match(path) {
  for (const route of ROUTES) {
    const m = path.match(route.re);
    if (m) return { route, m, params: route.params ? route.params(m) : {} };
  }
  return null;
}

function syncChrome(path, title) {
  document.getElementById('app-title').textContent = title || 'Apprendre l\u2019arabe';
  document.getElementById('btn-back').hidden = path === '/';
  for (const a of document.querySelectorAll('[data-nav]')) {
    const target = a.dataset.nav;
    const active = target === '/' ? path === '/' : path.startsWith(target);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

async function render() {
  const path = parse();
  const hit = match(path);

  if (current?.unmount) {
    try { await current.unmount(); } catch (e) { console.error('unmount', e); }
  }
  current = null;
  el.innerHTML = '<div class="loading">Chargement\u2026</div>';

  if (!hit) {
    el.innerHTML = `<div class="card"><h2>Page introuvable</h2>
      <p class="muted">La route <code>${path}</code> n\u2019existe pas.</p>
      <a class="btn" href="#/">Retour à l\u2019accueil</a></div>`;
    syncChrome(path, 'Page introuvable');
    return;
  }

  try {
    const mod = (await hit.route.load(hit.params.moduleId)).default;
    current = mod;
    el.innerHTML = '';
    syncChrome(path, mod.title);
    await mod.mount(el, hit.params);
    el.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    console.error('Chargement de la route', path, e);
    el.innerHTML = `<div class="card"><h2>Écran indisponible</h2>
      <p class="muted small">${e.message}</p>
      <a class="btn btn-ghost" href="#/">Retour à l\u2019accueil</a></div>`;
  }
}

export function initRouter(container) {
  el = container;
  addEventListener('hashchange', render);
  document.getElementById('btn-back').addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.hash = '#/';
  });
  return render();
}

export const navigate = (path) => { location.hash = '#' + path; };
