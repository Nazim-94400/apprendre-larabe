/**
 * Animation du sens d'écriture d'une lettre.
 *
 * ── Ce que ça montre, et ce que ça ne montre pas ────────────────────────────────
 *
 * L'animation dévoile la lettre **de droite à gauche**, sens dans lequel l'arabe
 * s'écrit. C'est le premier réflexe à installer chez un francophone, et de loin le
 * plus rentable : tant qu'il n'est pas acquis, chaque mot est reconstruit à
 * l'envers.
 *
 * Elle ne montre PAS l'ordre exact des traits. Le tracé réel de certaines lettres
 * fait des retours en arrière, et les points diacritiques s'ajoutent après le corps
 * de la lettre. Reproduire cela demanderait de redessiner les 29 lettres à la main
 * dans leurs quatre formes, avec un ordre de levée de plume vérifié — un travail de
 * calligraphe, pas de développeur. Le texte de l'écran le dit plutôt que de laisser
 * croire à un modèle de calligraphie.
 *
 * Technique : plutôt que des chemins SVG redessinés, on dévoile la glyphe de la
 * police elle-même par un `clip-path`. Le dessin est donc exactement celui que
 * l'apprenant verra partout ailleurs dans l'application — une reproduction
 * approximative apprendrait une forme légèrement fausse.
 */

const FORMS = [
  ['isolated', 'Isolée'],
  ['initial', 'Initiale'],
  ['medial', 'Médiane'],
  ['final', 'Finale']
];

const DURATION = 1700;

/**
 * @param {HTMLElement} host
 * @param {object} letter  entrée de data/lessons/alphabet.json
 */
export function strokeView(host, letter) {
  let form = 'isolated';
  let raf = 0;

  host.innerHTML = `
    <div class="stroke">
      <div class="stroke-stage">
        <span class="ar ar-letter stroke-ghost" aria-hidden="true"></span>
        <span class="ar ar-letter stroke-ink"></span>
        <i class="stroke-pen" aria-hidden="true"></i>
      </div>

      <p class="stroke-dir" aria-hidden="true">
        <span>on écrit dans ce sens</span> <span class="stroke-arrow">←</span></p>

      <div class="stroke-forms">
        ${FORMS.map(([k, label]) => `
          <button class="hifz-level${k === 'isolated' ? ' is-on' : ''}" type="button"
                  data-form="${k}">${label}</button>`).join('')}
      </div>

      <button class="btn btn-ghost" type="button" data-replay>Rejouer le tracé</button>
      <p class="small muted stroke-note">L’animation montre le sens d’écriture, non
        l’ordre exact des traits : les points se posent en dernier, une fois le corps
        de la lettre tracé.</p>
    </div>`;

  const ghost = host.querySelector('.stroke-ghost');
  const ink = host.querySelector('.stroke-ink');
  const pen = host.querySelector('.stroke-pen');

  function setForm(k) {
    form = k;
    ghost.textContent = letter.forms[k];
    ink.textContent = letter.forms[k];
    for (const b of host.querySelectorAll('[data-form]')) {
      b.classList.toggle('is-on', b.dataset.form === k);
    }
    play();
  }

  function play() {
    cancelAnimationFrame(raf);

    // Respecte le réglage système : une animation qu'on ne peut pas arrêter est
    // pénible, et pour certaines personnes elle est franchement inconfortable.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ink.style.clipPath = 'none';
      pen.style.opacity = '0';
      return;
    }

    const t0 = performance.now();
    pen.style.opacity = '1';

    const tick = (t) => {
      const p = Math.min(1, (t - t0) / DURATION);
      // `inset(… gauche)` à 100 % ne laisse rien voir ; en descendant vers 0, la
      // zone visible grandit depuis le bord droit — soit exactement le sens de
      // l'écriture arabe.
      ink.style.clipPath = `inset(-20% 0 -20% ${(1 - p) * 100}%)`;
      pen.style.insetInlineStart = `${(1 - p) * 100}%`;
      if (p < 1) raf = requestAnimationFrame(tick);
      else pen.style.opacity = '0';
    };
    raf = requestAnimationFrame(tick);
  }

  for (const b of host.querySelectorAll('[data-form]')) {
    b.addEventListener('click', () => setForm(b.dataset.form));
  }
  host.querySelector('[data-replay]').addEventListener('click', play);

  setForm(form);

  return { play, stop: () => cancelAnimationFrame(raf) };
}
