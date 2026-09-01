/**
 * Accès IndexedDB. Enveloppe minimale a base de promesses : pas de dependance,
 * et un seul endroit ou le schéma est déclaré.
 *
 * Regle de migration : ne jamais réutiliser un nom de store pour un contenu
 * différent. Pour changer la forme des donnees, créer un nouveau store et migrer
 * dans onupgradeneeded, sinon les profils existants cassent silencieusement.
 */

const DB_NAME = 'arabe-coran';
const DB_VERSION = 1;

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
  }
};

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      for (let v = e.oldVersion + 1; v <= DB_VERSION; v++) MIGRATIONS[v]?.(db, req.transaction);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloquée par un autre onglet'));
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
