/**
 * Thème clair/sombre et taille de texte.
 *
 * Les deux sont aussi écrits dans localStorage, car le script inline de index.html
 * les lit avant le premier rendu. IndexedDB est asynchrone : s'y fier seul
 * provoquerait un flash de theme clair a chaque ouverture.
 */

import { store } from '../core/store.js';

const THEMES = ['auto', 'light', 'dark'];
const SCALES = [1, 1.15, 1.3, 1.5];

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark = theme === 'dark' ||
      (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    meta.content = dark ? '#12100e' : '#faf7f2';
  }
}

export function applyTextScale(scale) {
  document.documentElement.style.setProperty('--text-scale', String(scale));
  try { localStorage.setItem('textScale', String(scale)); } catch {}
}

export function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(store.get().theme) + 1) % THEMES.length];
  applyTheme(next);
  return store.set({ theme: next });
}

export function cycleTextScale() {
  const cur = store.get().textScale;
  const idx = SCALES.findIndex((s) => Math.abs(s - cur) < 0.01);
  const next = SCALES[(idx + 1) % SCALES.length];
  applyTextScale(next);
  return store.set({ textScale: next });
}

export function initTheme() {
  const { theme, textScale } = store.get();
  applyTheme(theme);
  applyTextScale(textScale);
  // Suit le systeme tant que l'utilisateur n'a pas choisi explicitement.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (store.get().theme === 'auto') applyTheme('auto');
  });
}
