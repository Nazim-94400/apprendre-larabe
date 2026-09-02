/**
 * Câble les boutons d'écoute d'un écran.
 *
 * Un bouton porte `data-letter` (identifiant de la lettre), `data-mark` (le signe
 * de voyelle, vide pour le nom de la lettre) et `data-text` (ce qu'il faudrait
 * prononcer, pour la synthèse).
 *
 * Avant tout clic, chaque bouton interroge la source disponible et se désactive
 * s'il n'y en a aucune, avec la raison en infobulle. Laisser un bouton actif qui
 * ne produit rien fait croire à une panne de l'appareil, et l'apprenant cherche
 * du côté de son volume plutôt que du côté de l'application.
 *
 * Après lecture, une ligne indique ce qui vient d'être entendu — enregistrement,
 * récitation coranique ou voix de synthèse. La distinction compte : on n'imite pas
 * une voix de synthèse.
 */

import * as letterAudio from '../../core/letter-audio.js';

const LABEL = {
  recording: 'Enregistrement',
  quran: 'Récitation coranique',
  speech: 'Voix de synthèse',
  none: 'Indisponible'
};

/**
 * @param {HTMLElement} host  conteneur qui porte les boutons `.listen`
 * @param {object} [opts]
 * @param {string} [opts.reciterId]
 */
export function wireListen(host, { reciterId = 'husary_muallim' } = {}) {
  const buttons = [...host.querySelectorAll('.listen')];
  if (!buttons.length) return;

  // Zone d'annonce partagée, insérée une seule fois et lue par les lecteurs d'écran.
  let note = host.querySelector('.listen-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'listen-note';
    note.setAttribute('role', 'status');
    note.hidden = true;
    host.append(note);
  }

  // Résolution en parallèle : une lettre sans source doit être désactivée avant
  // que l'apprenant ne clique, pas après.
  Promise.all(buttons.map(async (b) => {
    const src = await letterAudio.sourceFor(b.dataset.letter, b.dataset.mark ?? '');
    b.dataset.source = src.kind;
    if (src.kind === 'none') {
      b.disabled = true;
      b.title = src.note;
      b.setAttribute('aria-disabled', 'true');
    } else if (src.note) {
      b.title = src.note;
    }
  }));

  host.addEventListener('click', async (e) => {
    const b = e.target.closest('.listen');
    if (!b || b.disabled) return;

    const used = await letterAudio.pronounce(
      b.dataset.letter, b.dataset.text ?? '', b.dataset.mark ?? '', reciterId);

    note.hidden = false;
    note.className = `listen-note listen-note--${used.kind}`;
    note.textContent = used.note
      ? `${LABEL[used.kind]} — ${used.note}`
      : LABEL[used.kind];
  });
}

export const stopListening = () => letterAudio.stop();
