/**
 * Enregistrement de la voix de l'apprenant.
 *
 * Le flux du micro est fermé dès la fin de l'enregistrement : laisser un
 * MediaStream ouvert garde le voyant du micro allumé, ce qui est à la fois
 * inquiétant et impoli.
 *
 * Les traitements automatiques du navigateur (réduction de bruit, contrôle
 * automatique de gain) sont désactivés : l'AGC comprime les écarts de volume, or
 * l'écart de volume entre une ghunna tenue et une lettre brève est justement une
 * information à conserver.
 */

import { db } from './db.js';

/** Le navigateur permet-il d'enregistrer ici ? */
export function available() {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

/** Format retenu parmi ceux que le navigateur sait produire. */
function pickMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm'
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
}

/**
 * Démarre un enregistrement.
 * @param {(level:number)=>void} [onLevel] niveau sonore 0–1, pour un retour visuel
 * @returns {Promise<{stop:()=>Promise<Blob>, cancel:()=>void}>}
 */
export async function record(onLevel) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

  // Retour visuel du niveau, pour que l'apprenant sache que ça capte.
  let ctx = null, raf = 0;
  if (onLevel) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 6));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  const cleanup = () => {
    cancelAnimationFrame(raf);
    ctx?.close();
    for (const t of stream.getTracks()) t.stop();
  };

  rec.start();

  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => {
        cleanup();
        resolve(new Blob(chunks, { type: mime || 'audio/webm' }));
      };
      rec.stop();
    }),
    cancel: () => { try { rec.stop(); } catch {} cleanup(); }
  };
}

/* ─────────────────────────── historique ─────────────────────────── */

/**
 * Enregistre une prise. Le Blob va tel quel dans IndexedDB : le réencoder ferait
 * perdre en qualité pour un gain de place négligeable à cette échelle.
 */
export async function save({ verseKey, blob, reciter, analysis }) {
  return db.add('recordings', {
    verse_key: verseKey,
    date: new Date().toISOString(),
    reciter,
    blob,
    duration: analysis?.userDuration ?? null,
    rhythm: analysis?.rhythm ?? null,
    // Les enveloppes servent au graphique de l'historique ; les MFCC ne sont pas
    // conservés, ils se recalculent en quelques dizaines de millisecondes.
    envelope: analysis?.envelope ?? null
  });
}

/** Prises d'un verset, de la plus récente à la plus ancienne. */
export async function history(verseKey) {
  const all = await db.getAll('recordings').catch(() => []);
  return all
    .filter((r) => !verseKey || r.verse_key === verseKey)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const remove = (id) => db.del('recordings', id);

/** Place occupée par les enregistrements, pour l'écran de stockage. */
export async function usage() {
  const all = await db.getAll('recordings').catch(() => []);
  return {
    count: all.length,
    bytes: all.reduce((n, r) => n + (r.blob?.size ?? 0), 0)
  };
}
