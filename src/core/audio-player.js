/**
 * Lecture audio des versets, avec surlignage synchronisé mot à mot.
 *
 * L'audio vient d'EveryAyah (un MP3 par verset) et les horodatages de cpfair/quran-align,
 * figés dans data/audio/segments/. Les deux proviennent du même enregistrement : le
 * surlignage est donc exact, pas estimé d'après la longueur des mots.
 *
 * Trois points qui méritaient attention :
 *
 *  - `audio.currentTime` suit le temps réel de l'enregistrement, indépendamment de
 *    `playbackRate`. Les horodatages se comparent donc directement, sans correction
 *    de vitesse — c'est contre-intuitif mais c'est ce qui rend le ralenti utilisable.
 *  - Le suivi se fait sur requestAnimationFrame et non sur `timeupdate`, qui ne se
 *    déclenche que trois ou quatre fois par seconde : bien trop grossier pour un mot
 *    qui dure parfois 300 ms.
 *  - Le verset suivant est préchargé pendant la lecture du courant, sans quoi une
 *    lecture enchaînée marque une coupure à chaque verset.
 */

const BASE = new URL('../../data/audio/', import.meta.url);
const pad3 = (n) => String(n).padStart(3, '0');

let config = null;
const segCache = new Map();

async function loadConfig() {
  if (!config) {
    config = fetch(new URL('reciters.json', BASE)).then((r) => r.json());
  }
  return config;
}

export async function reciters() {
  return (await loadConfig()).reciters;
}

export async function audioUrl(reciterId, key) {
  const cfg = await loadConfig();
  const r = cfg.reciters.find((x) => x.id === reciterId) ?? cfg.reciters[0];
  const [s, a] = key.split(':');
  return cfg.base + cfg.pattern
    .replace('{folder}', r.folder)
    .replace('{s3}', pad3(s))
    .replace('{a3}', pad3(a));
}

/** Segments d'une sourate pour un récitateur, indexés par clé de verset. */
export async function segments(reciterId, surah) {
  const k = `${reciterId}/${pad3(surah)}`;
  if (!segCache.has(k)) {
    segCache.set(k, fetch(new URL(`segments/${k}.json`, BASE))
      .then((r) => (r.ok ? r.json() : { ayahs: {} }))
      .then((j) => new Map(Object.entries(j.ayahs)))
      .catch(() => new Map()));
  }
  return segCache.get(k);
}

/**
 * Crée un lecteur.
 *
 * @param {object} handlers
 * @param {(key:string)=>void}            [handlers.onVerse]  verset courant
 * @param {(index:number|null)=>void}     [handlers.onWord]   mot courant, 1-based
 * @param {(state:object)=>void}          [handlers.onState]  {playing, key, rate, loop}
 * @param {()=>void}                      [handlers.onEnd]
 */
export function createPlayer(handlers = {}) {
  const audio = new Audio();
  audio.preload = 'auto';
  const preloader = new Audio();
  preloader.preload = 'auto';

  let queue = [];
  let at = -1;
  let reciter = 'husary_muallim';
  let segs = [];
  let raf = 0;
  let lastWord = null;
  let loopVerse = false;
  let repeatsLeft = 0;

  const state = () => ({
    playing: !audio.paused && !audio.ended,
    key: queue[at] ?? null,
    rate: audio.playbackRate,
    loop: loopVerse,
    index: at,
    total: queue.length
  });

  const emit = () => handlers.onState?.(state());

  function tick() {
    if (audio.paused || audio.ended) return;
    const ms = audio.currentTime * 1000;

    let w = null;
    for (const [from, to, start, end] of segs) {
      if (ms >= start && ms < end) { w = { from, to }; break; }
    }
    // `from`/`to` sont 0-based et bornés à droite ; le rendu numérote à partir de 1.
    const idx = w ? w.from + 1 : null;
    if (idx !== lastWord) { lastWord = idx; handlers.onWord?.(idx); }

    raf = requestAnimationFrame(tick);
  }

  async function loadAt(i) {
    at = i;
    const key = queue[at];
    const [s] = key.split(':');

    const [url, map] = await Promise.all([
      audioUrl(reciter, key),
      segments(reciter, Number(s))
    ]);

    segs = map.get(key)?.s ?? [];
    audio.src = url;
    lastWord = null;
    handlers.onVerse?.(key);
    handlers.onWord?.(null);

    // Précharge le suivant pendant qu'on écoute celui-ci.
    if (queue[at + 1]) audioUrl(reciter, queue[at + 1]).then((u) => { preloader.src = u; });
  }

  audio.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); emit(); });
  audio.addEventListener('pause', () => { cancelAnimationFrame(raf); emit(); });

  audio.addEventListener('ended', async () => {
    cancelAnimationFrame(raf);
    handlers.onWord?.(null);

    if (repeatsLeft > 0) { repeatsLeft--; audio.currentTime = 0; audio.play(); return; }
    if (loopVerse) { audio.currentTime = 0; audio.play(); return; }

    if (at + 1 < queue.length) { await loadAt(at + 1); audio.play(); }
    else { emit(); handlers.onEnd?.(); }
  });

  audio.addEventListener('error', () => {
    handlers.onState?.({ ...state(), error: 'Audio indisponible — es-tu hors ligne ?' });
  });

  return {
    /** @param {string[]} keys  clés de versets à enchaîner */
    async setQueue(keys, { reciterId = reciter, start = 0 } = {}) {
      reciter = reciterId;
      queue = keys;
      if (queue.length) await loadAt(Math.min(start, queue.length - 1));
      emit();
    },

    play: () => audio.play(),
    pause: () => audio.pause(),
    toggle: () => (audio.paused ? audio.play() : audio.pause()),

    async goto(i) {
      if (i < 0 || i >= queue.length) return;
      const was = !audio.paused;
      await loadAt(i);
      if (was) audio.play(); else emit();
    },

    next() { return this.goto(at + 1); },
    prev() { return this.goto(at - 1); },

    setRate(r) { audio.playbackRate = Math.min(1.5, Math.max(0.5, r)); emit(); },
    setLoop(v) { loopVerse = !!v; emit(); },
    setRepeat(n) { repeatsLeft = Math.max(0, n); },

    async setReciter(id) {
      reciter = id;
      const was = !audio.paused;
      if (queue.length) await loadAt(at < 0 ? 0 : at);
      if (was) audio.play(); else emit();
    },

    state,

    destroy() {
      cancelAnimationFrame(raf);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      preloader.removeAttribute('src');
    }
  };
}

/**
 * Demande au service worker de mettre en cache l'audio d'une sourate.
 * Rien n'est téléchargé sans cette demande explicite : le Coran complet en MP3
 * dépasse le gigaoctet et remplirait le quota du navigateur à l'insu de l'utilisateur.
 */
export async function downloadSurah(reciterId, surah, ayahCount, onProgress) {
  const reg = await navigator.serviceWorker?.ready;
  if (!reg?.active) throw new Error('Service worker indisponible');

  const urls = [];
  for (let a = 1; a <= ayahCount; a++) urls.push(await audioUrl(reciterId, `${surah}:${a}`));

  return new Promise((resolve) => {
    const onMessage = (e) => {
      const { type, done, total } = e.data ?? {};
      if (type === 'cache-audio-progress') onProgress?.(done, total);
      if (type === 'cache-audio-done') {
        navigator.serviceWorker.removeEventListener('message', onMessage);
        resolve(total);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    reg.active.postMessage({ type: 'cache-audio', urls });
  });
}
