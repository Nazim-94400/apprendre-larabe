/**
 * Comparaison d'une récitation avec un enregistrement de référence.
 *
 * ── Ce que ce module fait, et ce qu'il ne fait pas ──────────────────────────────
 *
 * Il compare le **rythme** : où l'apprenant accélère, traîne, ou raccourcit un
 * allongement par rapport au récitateur. C'est mesurable de façon fiable, et c'est
 * précisément ce que les règles de madd et de ghunna imposent — une durée.
 *
 * Il ne juge PAS la justesse d'un point d'articulation. Distinguer un ص d'un س dans
 * un signal enregistré au micro d'un téléphone demande un modèle acoustique entraîné,
 * qu'aucune bibliothèque librement disponible ne fournit avec une précision suffisante
 * pour ne pas décourager par des faux négatifs. Annoncer un « score de prononciation »
 * serait mentir sur ce que la mesure vaut.
 *
 * ── Comment ─────────────────────────────────────────────────────────────────────
 *
 * 1. Les deux signaux sont ramenés en mono à 16 kHz — la parole ne porte quasiment
 *    rien au-dessus de 8 kHz, et diviser le débit accélère tout le reste.
 * 2. Chacun est décrit par ses MFCC : 13 coefficients par fenêtre de 25 ms, toutes
 *    les 10 ms. Les MFCC décrivent le timbre en ignorant largement la hauteur de
 *    voix — c'est ce qui permet de comparer un adulte à un enfant.
 * 3. Un alignement temporel dynamique (DTW) met les deux séquences en correspondance
 *    malgré les différences de vitesse, et rend le chemin d'appariement.
 * 4. Les bornes de mots de la référence, connues exactement, sont projetées sur
 *    l'enregistrement par ce chemin. On obtient la durée passée par l'apprenant sur
 *    chaque mot, comparable à celle du récitateur.
 */

const TARGET_RATE = 16000;
const FRAME_MS = 25;
const HOP_MS = 10;
const N_MEL = 26;
const N_CEPS = 13;
const FFT_SIZE = 512;

/* ─────────────────────────── décodage ─────────────────────────── */

/**
 * Décode un fichier audio en mono à 16 kHz.
 * OfflineAudioContext fait le rééchantillonnage et le mixage mono en une passe.
 */
export async function decodeMono(arrayBuffer) {
  const tmp = new (window.AudioContext || window.webkitAudioContext)();
  let buf;
  try {
    buf = await tmp.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    tmp.close();
  }

  const frames = Math.max(1, Math.ceil(buf.duration * TARGET_RATE));
  const off = new OfflineAudioContext(1, frames, TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  return out.getChannelData(0);
}

/* ─────────────────────────── FFT ─────────────────────────── */

/** Table de bits inversés et facteurs de rotation, calculés une fois. */
function makeFFT(n) {
  const rev = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i++) {
    let x = i, r = 0;
    for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
    rev[i] = r;
  }
  const cos = new Float32Array(n / 2);
  const sin = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sin[i] = Math.sin((-2 * Math.PI * i) / n);
  }
  return { n, rev, cos, sin };
}

const FFT = makeFFT(FFT_SIZE);

/** FFT en place, radix 2. `re` et `im` font FFT_SIZE échantillons. */
function fft(re, im) {
  const { n, rev, cos, sin } = FFT;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < half; j++) {
        const k = j * step;
        const c = cos[k], s = sin[k];
        const a = i + j, b = a + half;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr;        im[a] += ti;
      }
    }
  }
}

/* ─────────────────────────── MFCC ─────────────────────────── */

const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700);
const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1);

/** Banc de filtres triangulaires en échelle mel. */
function melFilterbank(rate, fftSize, count) {
  const bins = fftSize / 2 + 1;
  const low = hzToMel(80);              // sous 80 Hz : bruit de manipulation
  const high = hzToMel(rate / 2);
  const points = new Float32Array(count + 2);
  for (let i = 0; i < points.length; i++) {
    points[i] = Math.floor(((fftSize + 1) * melToHz(low + ((high - low) * i) / (count + 1))) / rate);
  }

  const filters = [];
  for (let m = 1; m <= count; m++) {
    const f = new Float32Array(bins);
    const a = points[m - 1], b = points[m], c = points[m + 1];
    for (let k = a; k < b; k++) if (b > a) f[k] = (k - a) / (b - a);
    for (let k = b; k < c; k++) if (c > b) f[k] = (c - k) / (c - b);
    filters.push(f);
  }
  return filters;
}

const FILTERS = melFilterbank(TARGET_RATE, FFT_SIZE, N_MEL);

/** Matrice DCT-II précalculée : mel → cepstre. */
const DCT = (() => {
  const m = [];
  for (let i = 0; i < N_CEPS; i++) {
    const row = new Float32Array(N_MEL);
    for (let j = 0; j < N_MEL; j++) row[j] = Math.cos((Math.PI * i * (j + 0.5)) / N_MEL);
    m.push(row);
  }
  return m;
})();

const HAMMING = (() => {
  const len = Math.round((FRAME_MS / 1000) * TARGET_RATE);
  const w = new Float32Array(len);
  for (let i = 0; i < len; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (len - 1));
  return w;
})();

/**
 * Coefficients cepstraux d'un signal mono 16 kHz.
 * @returns {{frames: Float32Array[], hopMs: number, energy: Float32Array}}
 */
export function mfcc(samples) {
  const frameLen = HAMMING.length;
  const hop = Math.round((HOP_MS / 1000) * TARGET_RATE);
  const count = Math.max(0, Math.floor((samples.length - frameLen) / hop) + 1);

  const frames = [];
  const energy = new Float32Array(count);
  const re = new Float32Array(FFT_SIZE);
  const im = new Float32Array(FFT_SIZE);
  const bins = FFT_SIZE / 2 + 1;
  const power = new Float32Array(bins);

  for (let f = 0; f < count; f++) {
    const off = f * hop;

    re.fill(0); im.fill(0);
    let rms = 0;
    // Pré-accentuation : relève les hautes fréquences, où se jouent les consonnes.
    for (let i = 0; i < frameLen; i++) {
      const s = samples[off + i] - 0.97 * (off + i > 0 ? samples[off + i - 1] : 0);
      re[i] = s * HAMMING[i];
      rms += samples[off + i] * samples[off + i];
    }
    energy[f] = Math.sqrt(rms / frameLen);

    fft(re, im);
    for (let k = 0; k < bins; k++) power[k] = re[k] * re[k] + im[k] * im[k];

    const logMel = new Float32Array(N_MEL);
    for (let m = 0; m < N_MEL; m++) {
      let sum = 0;
      const filt = FILTERS[m];
      for (let k = 0; k < bins; k++) sum += power[k] * filt[k];
      logMel[m] = Math.log(sum + 1e-10);
    }

    const ceps = new Float32Array(N_CEPS);
    for (let i = 0; i < N_CEPS; i++) {
      let sum = 0;
      const row = DCT[i];
      for (let j = 0; j < N_MEL; j++) sum += logMel[j] * row[j];
      ceps[i] = sum;
    }
    frames.push(ceps);
  }

  // Normalisation cepstrale par la moyenne : annule l'effet du micro et de la pièce.
  // Sans elle, un enregistrement au casque et un enregistrement au téléphone
  // paraissent différents alors que la récitation est la même.
  if (frames.length) {
    const mean = new Float32Array(N_CEPS);
    for (const fr of frames) for (let i = 0; i < N_CEPS; i++) mean[i] += fr[i];
    for (let i = 0; i < N_CEPS; i++) mean[i] /= frames.length;
    for (const fr of frames) for (let i = 0; i < N_CEPS; i++) fr[i] -= mean[i];
  }

  return { frames, hopMs: HOP_MS, energy };
}

/* ─────────────────────────── DTW ─────────────────────────── */

/**
 * Alignement temporel dynamique entre deux séquences de vecteurs.
 *
 * Le premier coefficient (c0) porte l'énergie globale, donc surtout le volume
 * d'enregistrement : il est ignoré, sinon un micro plus fort ferait chuter le score
 * sans que la récitation ait changé.
 *
 * @returns {{distance:number, path:Int32Array}} path = index de b pour chaque index de a
 */
export function dtw(a, b) {
  const n = a.length, m = b.length;
  if (!n || !m) return { distance: Infinity, path: new Int32Array(0) };

  const cost = (i, j) => {
    const x = a[i], y = b[j];
    let s = 0;
    for (let k = 1; k < N_CEPS; k++) { const d = x[k] - y[k]; s += d * d; }
    return Math.sqrt(s);
  };

  const W = m + 1;
  const acc = new Float64Array((n + 1) * W).fill(Infinity);
  const from = new Uint8Array((n + 1) * W);
  acc[0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = cost(i - 1, j - 1);
      const diag = acc[(i - 1) * W + j - 1];
      const up = acc[(i - 1) * W + j];
      const left = acc[i * W + j - 1];
      let best = diag, dir = 0;
      if (up < best) { best = up; dir = 1; }
      if (left < best) { best = left; dir = 2; }
      acc[i * W + j] = c + best;
      from[i * W + j] = dir;
    }
  }

  // Remontée : pour chaque trame de `a`, la trame de `b` qui lui correspond.
  const path = new Int32Array(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    path[i - 1] = j - 1;
    const dir = from[i * W + j];
    if (dir === 0) { i--; j--; }
    else if (dir === 1) { i--; }
    else { j--; }
  }
  for (let k = 0; k < n; k++) if (path[k] < 0) path[k] = 0;

  return { distance: acc[n * W + m] / (n + m), path };
}

/* ─────────────────────────── comparaison ─────────────────────────── */

/**
 * Compare une récitation à sa référence.
 *
 * @param {Float32Array} refSamples   référence, mono 16 kHz
 * @param {Float32Array} userSamples  enregistrement, mono 16 kHz
 * @param {Array} segments            [[from, to, startMs, endMs]] mots de la référence
 * @param {string[]} words            les mots du verset, pour nommer les écarts
 */
export function compare(refSamples, userSamples, segments = [], words = []) {
  const ref = mfcc(refSamples);
  const usr = mfcc(userSamples);

  // DTW dans le sens référence → apprenant : on veut, pour chaque instant de la
  // référence, l'instant correspondant chez l'apprenant.
  const { distance, path } = dtw(ref.frames, usr.frames);

  const refMsToFrame = (ms) =>
    Math.max(0, Math.min(ref.frames.length - 1, Math.round(ms / HOP_MS)));
  const userFrameToMs = (f) => f * HOP_MS;

  const perWord = segments.map(([from, to, startMs, endMs]) => {
    const f0 = refMsToFrame(startMs);
    const f1 = refMsToFrame(endMs);
    const u0 = userFrameToMs(path[f0] ?? 0);
    const u1 = userFrameToMs(path[f1] ?? path[ref.frames.length - 1] ?? 0);

    const refDur = Math.max(1, endMs - startMs);
    const userDur = Math.max(0, u1 - u0);
    const ratio = userDur / refDur;

    // Seuils : un madd de 2 temps lu comme un 4 donne un rapport de 2 ; lu comme
    // un 6, de 3. Un rapport de 1,5 correspond déjà à un allongement d'une durée
    // entière — assez pour être signalé. En deçà de 0,65, la voyelle est avalée.
    // Plus serré provoquerait des faux positifs sur le bruit de fond et les bords
    // de l'alignement ; plus large laisserait passer une durée entière d'écart.
    let verdict = 'ok';
    if (ratio < 0.65) verdict = 'court';
    else if (ratio > 1.5) verdict = 'long';

    return {
      word: from + 1,
      text: words[from] ?? '',
      refDur: Math.round(refDur),
      userDur: Math.round(userDur),
      ratio,
      verdict
    };
  });

  const off = perWord.filter((w) => w.verdict !== 'ok');
  const rhythm = perWord.length ? 1 - off.length / perWord.length : 0;

  // Garde-fou : l'alignement dynamique trouve toujours un chemin, même entre deux
  // enregistrements sans rapport. Quand la durée totale s'écarte trop, le score de
  // rythme ne veut plus rien dire — mieux vaut le dire que d'afficher un chiffre.
  //
  // La distance timbrale ne sert PAS de garde-fou : mesurée entre deux versets
  // différents du même récitateur, elle vaut environ 14, soit l'ordre de grandeur
  // attendu entre deux voix différentes récitant le même verset. Elle ne sépare
  // donc pas « autre verset » de « autre personne », et l'afficher comme un score
  // de justesse serait trompeur.
  const refDur = ref.frames.length * HOP_MS;
  const userDur = usr.frames.length * HOP_MS;
  const durationRatio = refDur ? userDur / refDur : 0;
  const usable = durationRatio > 0.4 && durationRatio < 2.5;

  return {
    rhythm,                                   // part des mots à la bonne durée
    usable,                                   // le score de rythme a-t-il un sens ?
    durationRatio,
    distance,                                 // écart timbral, usage interne
    perWord,
    refDuration: ref.frames.length * HOP_MS,
    userDuration: usr.frames.length * HOP_MS,
    refEnergy: ref.energy,
    userEnergy: usr.energy,
    hopMs: HOP_MS
  };
}

/** Réduit une enveloppe d'énergie à `n` points, pour l'affichage. */
export function envelope(energy, n = 200) {
  const out = new Float32Array(n);
  if (!energy.length) return out;
  const step = energy.length / n;
  let max = 0;
  for (let i = 0; i < n; i++) {
    let peak = 0;
    for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step) && j < energy.length; j++) {
      if (energy[j] > peak) peak = energy[j];
    }
    out[i] = peak;
    if (peak > max) max = peak;
  }
  if (max > 0) for (let i = 0; i < n; i++) out[i] /= max;
  return out;
}
