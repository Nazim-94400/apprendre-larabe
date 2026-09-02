import { store } from './core/store.js';
import { initTheme, cycleTheme, cycleTextScale } from './ui/theme.js';
import { initRouter } from './router.js';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Une nouvelle version du service worker prend la main : on recharge une fois.
  //
  // Sans cela, le cache-first sert les fichiers de l'ancienne version pendant tout
  // le chargement en cours, et l'utilisateur voit une interface à moitié à jour —
  // une feuille de style périmée avec un code neuf, par exemple. Le drapeau évite
  // la boucle : `controllerchange` ne se déclenche qu'une fois par activation, mais
  // un rechargement pendant l'installation pourrait en produire un second.
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  const go = () => navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  // boot() étant asynchrone, l'événement `load` a souvent déjà été émis quand on
  // arrive ici : s'y abonner sans vérifier readyState n'enregistre jamais rien.
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}

async function boot() {
  await store.load();
  initTheme();

  document.getElementById('btn-theme').addEventListener('click', cycleTheme);
  document.getElementById('btn-text-size').addEventListener('click', cycleTextScale);

  // Préférences d'affichage exposées en attributs : le CSS s'y accroche sans JS.
  const syncFlags = (s) => {
    document.documentElement.dataset.tajweed = s.tajweedColors ? 'on' : 'off';
    document.documentElement.dataset.tashkil = s.showTashkil ? 'on' : 'off';
    document.documentElement.dataset.translation = s.showTranslation ? 'on' : 'off';
  };
  syncFlags(store.get());
  store.subscribe(syncFlags);

  await initRouter(document.getElementById('vue'));
  registerServiceWorker();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('vue').innerHTML =
    `<div class="card"><h2>Erreur au démarrage</h2>
     <p class="small muted">${e.message}</p></div>`;
});
