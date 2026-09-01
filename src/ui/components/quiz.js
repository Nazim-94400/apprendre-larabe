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
          <span class="small muted">Question ${index + 1} sur ${items.length}</span>
          <div class="progress" style="flex:1"><i style="width:${(index / items.length) * 100}%"></i></div>
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
          ? `<strong>Juste.</strong>${q.hint ? ` ${q.hint}` : ''}`
          : `<strong>Non.</strong> La réponse était
             <span class="quiz-answer">${q.choices.find((c) => c.id === q.answer)?.label ?? ''}</span>.
             ${q.hint ? `<br>${q.hint}` : ''}`;
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
      <section class="card">
        <h2>${passed ? 'Étape validée' : 'Presque'}</h2>
        <p class="quiz-score ${passed ? 'ok' : 'ko'}">${right} / ${items.length}
          <span class="small muted">(${pct} %)</span></p>
        <p class="small muted">${passed
          ? 'Tu peux passer à la suite.'
          : 'Il faut 80 % pour valider l’étape. Reprends la leçon puis retente.'}</p>
        <button class="btn" type="button" id="quiz-retry">Recommencer</button>
      </section>`;

    host.querySelector('#quiz-retry').addEventListener('click', () => {
      index = 0; right = 0; wrong.length = 0;
      renderQuestion();
    });

    onFinish?.({ score, right, total: items.length, wrong: [...wrong] });
  }

  renderQuestion();
}
