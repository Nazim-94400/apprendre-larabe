/**
 * Moteur de quiz générique, partagé par tous les modules.
 *
 * Un quiz est une liste de questions à choix. Chaque question expose une consigne
 * (HTML libre : texte, lettre arabe, bouton d'écoute) et des propositions.
 *
 * Deux partis pris pédagogiques :
 *
 *  - La correction est immédiate et la bonne réponse est toujours montrée, y compris
 *    en cas d'erreur. Un quiz qui se contente de dire « faux » n'apprend rien.
 *  - On ne peut pas revenir en arrière. Le score reflète la première intuition, qui
 *    est ce qu'on cherche à entraîner sur des lettres et des sons.
 */

const shuffle = (a) => {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Sceau de résultat : un anneau rempli à proportion du score. Jade si l'étape
 * est validée, laiton sinon — le laiton signale ce qui reste à faire. Pas de
 * rouge : on ne punit pas un 70 %.
 *
 * Exporté pour les exercices qui n'utilisent pas ce moteur (sélection de mots
 * dans un verset) : tous les écrans de fin se ressemblent.
 */
export const seal = (pct, passed) => `
  <div class="seal${passed ? '' : ' ko'}" style="--deg:${pct * 3.6}deg" aria-hidden="true">
    <span class="seal-halo"></span>
    <span class="seal-arc"><span class="seal-pct">${pct} %</span></span>
  </div>`;

/**
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {Array}  opts.questions  [{ id, prompt, aside?, choices:[{id,label}], answer, hint? }]
 * @param {Function} [opts.onFinish]  reçoit { score, right, total, wrong:[id] }
 * @param {string} [opts.finishLabel]
 */
export function quiz(host, { questions, onFinish, finishLabel = 'Terminer' }) {
  const items = shuffle(questions);
  let index = 0;
  let right = 0;
  const wrong = [];
  let locked = false;

  function renderQuestion() {
    const q = items[index];
    locked = false;

    host.innerHTML = `
      <section class="card quiz">
        <header class="quiz-head">
          <span class="small muted quiz-pos">Question ${index + 1} sur ${items.length}</span>
          <div class="progress" style="flex:1"><i style="width:${(index / items.length) * 100}%"></i></div>
          <span class="small quiz-right" title="Bonnes réponses">${right} juste${right > 1 ? 's' : ''}</span>
        </header>

        <div class="quiz-prompt">${q.prompt}</div>
        ${q.aside ? `<p class="small muted quiz-aside">${q.aside}</p>` : ''}

        <div class="quiz-choices" role="group">
          ${shuffle(q.choices).map((c) => `
            <button class="choice" type="button" data-id="${c.id}">${c.label}</button>`).join('')}
        </div>

        <div class="quiz-feedback" hidden></div>
        <button class="btn quiz-next" type="button" hidden>
          ${index === items.length - 1 ? finishLabel : 'Suivant'}</button>
      </section>`;

    const feedback = host.querySelector('.quiz-feedback');
    const next = host.querySelector('.quiz-next');

    for (const btn of host.querySelectorAll('.choice')) {
      btn.addEventListener('click', () => {
        if (locked) return;
        locked = true;

        const chosen = btn.dataset.id;
        const ok = chosen === q.answer;
        if (ok) right++; else wrong.push(q.id);

        for (const b of host.querySelectorAll('.choice')) {
          b.disabled = true;
          if (b.dataset.id === q.answer) b.classList.add('choice-right');
          else if (b === btn) b.classList.add('choice-wrong');
        }

        feedback.className = `quiz-feedback ${ok ? 'ok' : 'ko'}`;
        feedback.innerHTML = ok
          ? `<p class="quiz-verdict">Juste.</p>${q.hint ? `<p class="small muted" style="margin:0">${q.hint}</p>` : ''}`
          : `<p class="quiz-verdict">Non.</p>
             <p style="margin:0">La réponse était
             <span class="quiz-answer">${q.choices.find((c) => c.id === q.answer)?.label ?? ''}</span>.</p>
             ${q.hint ? `<p class="small muted" style="margin:var(--sp-1) 0 0">${q.hint}</p>` : ''}`;
        host.querySelector('.quiz-right').textContent = `${right} juste${right > 1 ? 's' : ''}`;
        feedback.hidden = false;
        next.hidden = false;
        next.focus();
      });
    }

    // Les boutons d'écoute éventuellement présents dans la consigne.
    for (const btn of host.querySelectorAll('[data-speak]')) {
      btn.addEventListener('click', () => {
        host.dispatchEvent(new CustomEvent('quiz-speak',
          { detail: { text: btn.dataset.speak }, bubbles: true }));
      });
    }

    next.addEventListener('click', () => {
      index++;
      if (index < items.length) renderQuestion();
      else renderResult();
    });
  }

  function renderResult() {
    const score = right / items.length;
    const pct = Math.round(score * 100);
    const passed = score >= 0.8;

    host.innerHTML = `
      <section class="card quiz-result">
        ${seal(pct, passed)}
        <h2>${passed ? 'Étape validée' : 'Presque'}</h2>
        <p class="quiz-score">${right} sur ${items.length}</p>
        <p class="small muted quiz-note">${passed
          ? 'Tu peux passer à la suite. Les erreurs reviendront en priorité dans une prochaine série.'
          : 'Il faut 80 % pour valider l’étape. Une nouvelle série reprend en priorité ce qui a été manqué.'}</p>
        <div class="hero-actions">
          <button class="btn" type="button" id="quiz-retry">Nouvelle série</button>
          <button class="btn btn-ghost" type="button" id="quiz-back">Retour au module</button>
        </div>
      </section>`;

    // Nouvelle série plutôt que la même rejouée : le module qui monte ce quiz
    // refait son tirage, pondéré par les erreurs qui viennent d'être enregistrées.
    host.querySelector('#quiz-retry').addEventListener('click', () => {
      dispatchEvent(new HashChangeEvent('hashchange'));
    });
    // Retour au module, pas `history.back()` : arrivé par un lien direct, on
    // quitterait l'application.
    host.querySelector('#quiz-back').addEventListener('click', () => {
      const m = location.hash.match(/^#\/m\/[^/]+/);
      location.hash = m ? m[0] : '#/';
    });

    onFinish?.({ score, right, total: items.length, wrong: [...wrong] });
  }

  renderQuestion();
}
