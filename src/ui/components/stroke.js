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
 * ── Un voile qui se retire, jamais la lettre qu'on découpe ───────────────────────
 *
 * La version précédente animait un `clip-path` sur la glyphe elle-même. Défaut
 * rédhibitoire : une animation interrompue — changement d'écran, relance à
 * contretemps — laissait la lettre masquée, et l'écran perdait son sujet.
 *
 * On anime donc un voile couleur fond posé PAR-DESSUS la lettre. Au repos, il est
 * réduit à `scaleX(0)` par la feuille de style : quoi qu'il arrive au script, la
 * lettre reste visible. Toute l'animation est en CSS (components-v2.css) ; le
 * script ne fait que retirer et remettre une classe.
 *
 * La glyphe est celle de la police elle-même, pas un chemin redessiné : le dessin
 * est exactement celui que l'apprenant verra partout ailleurs dans l'application.
 */

/**
 * @param {HTMLElement} host   reçoit la scène (glyphe + voile)
 * @param {object} letter      entrée de data/lessons/alphabet.json
 */
export function strokeView(host, letter) {
  host.innerHTML = `
    <div class="stroke-stage">
      <span class="ar ar-letter stroke-ink" lang="ar"></span>
      <span class="stroke-veil" aria-hidden="true"></span>
    </div>`;

  const stage = host.querySelector('.stroke-stage');
  const ink = host.querySelector('.stroke-ink');

  function play() {
    // Relancer une animation CSS déjà jouée : retirer la classe, forcer un
    // recalcul de mise en page, la remettre. Sans le recalcul, le navigateur
    // fusionne les deux changements et rien ne se rejoue.
    stage.classList.remove('is-drawing');
    void stage.offsetWidth;
    stage.classList.add('is-drawing');
  }

  function setForm(k) {
    ink.textContent = letter.forms[k] ?? letter.forms.isolated;
    play();
  }

  setForm('isolated');

  // Rien à arrêter : une animation CSS s'éteint avec son élément.
  return { play, setForm, stop() {} };
}
