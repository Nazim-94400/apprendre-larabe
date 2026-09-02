/**
 * Accès IndexedDB. Enveloppe minimale a base de promesses : pas de dependance,
 * et un seul endroit ou le schéma est déclaré.
 *
 * Regle de migration : ne jamais réutiliser un nom de store pour un contenu
 * différent. Pour changer la forme des donnees, créer un nouveau store et migrer
 * dans onupgradeneeded, sinon les profils existants cassent silencieusement.
 */

const DB_NAME = 'arabe-coran';
const DB_VERSION = 2;

/** Déclaration du schéma, version par version. */
const MIGRATIONS = {
  1(db) {
    db.createObjectStore('profile');                             // clé : 'default'
    db.createObjectStore('progress');                            // clé : step_id
    const srs = db.createObjectStore('srs');                     // clé : clé pivot
    srs.createIndex('due', 'due');                               // file de révision
    const rec = db.createObjectStore('recordings',
      { keyPath: 'id', autoIncrement: true });
    rec.createIndex('verse_key', 'verse_key');
    rec.createIndex('date', 'date');
    db.createObjectStore('stats');                               // clé : AAAA-MM-JJ
  },

  /**
   * `drill` retient, pour chaque item d'exercice, combien de fois il a été vu et
   * raté. Le tirage des questions s'en sert pour proposer d'abord ce qui n'a
   * jamais été vu, puis ce qui a été manqué — sans quoi un tirage uniforme
   * repose les mêmes lettres et en laisse d'autres jamais rencontrées.
   */
  2(db) {
    db.createObjectStore('drill');                               // clé : id d'item
  }
};

let dbPromise = null;

/**
 * Délai au-delà duquel on renonce à ouvrir la base.
 *
 * Une montée de version bloquée par un onglet qui ne relâche pas sa connexion
 * laisse la requête en attente indéfiniment : ni succès, ni erreur, ni même
 * `blocked` dans certains cas. L'application restait alors figée sur
 * « Chargement… », sans message ni recours.
 *
 * Mieux vaut échouer franchement : les lectures retombent sur leurs valeurs par
 * défaut, l'interface s'affiche, et seule la progression est indisponible.
 */
const OPEN_TIMEOUT = 5000;

/**
 * Mémoire courte des échecs.
 *
 * Sans elle, chaque lecture retente l'ouverture et attend son propre délai : un
 * écran qui interroge quatre stores mettait vingt-trois secondes à s'afficher au
 * lieu de cinq. Une nouvelle tentative reste possible passé ce court répit, pour
 * que la fermeture de l'onglet fautif suffise à rétablir la situation.
 */
const FAIL_MEMO = 3000;
let lastFailure = 0;
let lastError = null;

function open() {
  if (dbPromise) return dbPromise;
  if (Date.now() - lastFailure < FAIL_MEMO) return Promise.reject(lastError);
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    const timer = setTimeout(() => {
      dbPromise = null;   // une tentative ultérieure doit pouvoir réessayer
      lastFailure = Date.now();
      lastError = new Error(
        'La base de données ne répond pas. Ferme les autres onglets de '
        + 'l’application, puis recharge la page.');
      reject(lastError);
    }, OPEN_TIMEOUT);
    const settle = (fn) => (...args) => { clearTimeout(timer); fn(...args); };
    const ok = settle(resolve);
    const ko = settle((err) => { lastFailure = Date.now(); lastError = err; reject(err); });

    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (let v = e.oldVersion + 1; v <= DB_VERSION; v++) MIGRATIONS[v]?.(db, req.transaction);
    };

    req.onsuccess = () => {
      const db = req.result;
      lastFailure = 0;
      lastError = null;

      // Un autre onglet demande une montée de version : on libère la connexion,
      // sinon sa migration reste bloquée et SON application échoue au chargement.
      // C'est le cas courant de deux onglets ouverts pendant une mise à jour.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      ok(db);
    };

    req.onerror = () => { dbPromise = null; ko(req.error); };

    // Un onglet ancien qui ne relâche pas la base. Mieux vaut une consigne claire
    // qu'une erreur technique : l'utilisateur peut agir, le code non.
    req.onblocked = () => {
      dbPromise = null;
      ko(new Error(
        'La base de données est ouverte dans un autre onglet, ce qui empêche la '
        + 'mise à jour. Ferme les autres onglets, puis recharge la page.'));
    };
  });
  return dbPromise;
}

function run(storeName, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve(req ? req.result : undefined);
  }));
}

export const db = {
  get:    (store, key)        => run(store, 'readonly',  (s) => s.get(key)),
  getAll: (store)             => run(store, 'readonly',  (s) => s.getAll()),
  keys:   (store)             => run(store, 'readonly',  (s) => s.getAllKeys()),
  set:    (store, key, value) => run(store, 'readwrite', (s) => s.put(value, key)),
  add:    (store, value)      => run(store, 'readwrite', (s) => s.add(value)),
  del:    (store, key)        => run(store, 'readwrite', (s) => s.delete(key)),
  clear:  (store)             => run(store, 'readwrite', (s) => s.clear()),

  /** Entrees d'un index dont la valeur est <= max. Sert a la file de révision SRS. */
  upTo(store, index, max) {
    return run(store, 'readonly', (s) => s.index(index).getAll(IDBKeyRange.upperBound(max)));
  },

  /** Place occupée, pour l'écran de gestion du stockage. */
  async usage() {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  }
};
