/* Love Quest · Trial 4 "Love Quiz": how well do you know us? */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const BONUS_SECONDS = 12;
  const POINTS = Object.freeze({ first: 100, second: 50, later: 20, maxBonus: 50 });
  const NEXT_DELAY_MS = 1200;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function allowedMistakes(questionCount) {
    return Math.max(1, Math.floor(questionCount / 3));
  }

  function starsFor(mistakes, questionCount) {
    if (mistakes === 0) return 3;
    if (mistakes <= allowedMistakes(questionCount)) return 2;
    return 1;
  }

  /** Points for a correct answer: attempt 0 = first try (plus speed bonus). */
  function pointsFor(attempt, secondsLeft) {
    if (attempt === 0) return POINTS.first + Math.round(POINTS.maxBonus * U.clamp(secondsLeft / BONUS_SECONDS, 0, 1));
    if (attempt === 1) return POINTS.second;
    return POINTS.later;
  }

  function create(root, api) {
    const { scope, t, fx, audio, hud } = api;
    const questions = api.content.quiz;
    const state = { index: -1, attempt: 0, mistakes: 0, score: 0, bonusLeft: BONUS_SECONDS, locked: true, jokerUsed: false, over: false };

    const progressEl = U.el('span', { class: 'quiz-card__progress' });
    const timerFill = U.el('span', { class: 'quiz-timer__fill' });
    const questionEl = U.el('h3', { class: 'quiz-card__question', attrs: { 'aria-live': 'polite' } });
    const answersEl = U.el('div', { class: 'quiz-answers', attrs: { role: 'group' } });
    const feedbackEl = U.el('p', { class: 'quiz-feedback', attrs: { 'aria-live': 'assertive' } });
    const card = U.el('div', { class: 'quiz-card paper' }, [
      U.el('div', { class: 'quiz-card__meta' }, [
        progressEl,
        U.el('span', { class: 'quiz-timer', attrs: { title: t('quiz.bonus'), 'aria-hidden': 'true' } }, timerFill)
      ]),
      questionEl,
      answersEl,
      feedbackEl
    ]);
    const jokerButton = U.el('button', { type: 'button', class: 'btn btn--sage btn--small' }, [
      U.el('span', { text: '💡', attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { text: t('quiz.joker') })
    ]);
    root.append(U.el('div', { class: 'quiz' }, [card, U.el('div', { class: 'quiz-toolbar' }, jokerButton)]));
    answersEl.setAttribute('aria-labelledby', 'quiz-question');
    questionEl.id = 'quiz-question';

    hud.setStats([
      { id: 'question', icon: '💬', value: `1/${questions.length}`, label: t('hud.question') },
      { id: 'score', icon: '💗', value: '0', label: t('hud.score') }
    ]);

    let buttons = [];

    function enabledWrongButtons() {
      const correct = questions[state.index].correct;
      return buttons.filter((button, index) => index !== correct && !button.disabled);
    }

    function updateJoker() {
      const usable = !state.jokerUsed && !state.locked && !state.over && enabledWrongButtons().length >= 2;
      jokerButton.disabled = !usable;
    }

    function showQuestion(index) {
      state.index = index;
      state.attempt = 0;
      state.bonusLeft = BONUS_SECONDS;
      state.locked = false;
      const question = questions[index];
      progressEl.textContent = t('quiz.progress', { n: index + 1, total: questions.length });
      questionEl.textContent = question.question;
      feedbackEl.textContent = '';
      feedbackEl.className = 'quiz-feedback';
      answersEl.textContent = '';
      buttons = question.answers.map((answer, answerIndex) => {
        const button = U.el('button', { type: 'button', class: 'quiz-answer' }, [
          U.el('span', { class: 'quiz-answer__key', text: LETTERS[answerIndex], attrs: { 'aria-hidden': 'true' } }),
          U.el('span', { class: 'quiz-answer__text', text: answer })
        ]);
        button.addEventListener('click', () => choose(answerIndex));
        answersEl.append(button);
        return button;
      });
      hud.set('question', `${index + 1}/${questions.length}`);
      card.classList.remove('is-in');
      void card.offsetWidth;
      card.classList.add('is-in');
      updateJoker();
      buttons[0].focus({ preventScroll: true });
    }

    function choose(answerIndex) {
      const button = buttons[answerIndex];
      if (state.locked || state.over || api.paused || !button || button.disabled) return;
      const question = questions[state.index];
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      if (answerIndex === question.correct) {
        state.locked = true;
        const points = pointsFor(state.attempt, state.bonusLeft);
        state.score += points;
        button.classList.add('is-correct');
        buttons.forEach((other) => other.setAttribute('aria-disabled', 'true'));
        feedbackEl.textContent = t('quiz.correct');
        feedbackEl.className = 'quiz-feedback is-good';
        audio.play('correct');
        fx.burst(x, y, { count: 16, speed: 220 });
        fx.hearts(x, y, 5);
        fx.floatText(x, y - 24, `+${points}`, 'float-text--gold');
        hud.set('score', U.formatNumber(state.score));
        hud.pulse('score');
        updateJoker();
        if (state.index + 1 < questions.length) {
          const next = state.index + 1;
          scope.timeout(() => api.whenActive(() => showQuestion(next)), NEXT_DELAY_MS);
        } else {
          finishQuiz();
        }
        return;
      }

      state.attempt++;
      state.mistakes++;
      button.disabled = true;
      button.classList.add('is-wrong');
      feedbackEl.textContent = question.wrongMsg || t('quiz.wrongDefault');
      feedbackEl.className = 'quiz-feedback is-bad';
      audio.play('wrong');
      audio.vibrate(30);
      fx.shake(button, 0.8);
      updateJoker();
      const next = buttons.find((candidate) => !candidate.disabled);
      if (next) next.focus({ preventScroll: true });
    }

    function finishQuiz() {
      state.over = true;
      updateJoker();
      if (state.mistakes === 0) api.achieve('knowItAll');
      api.finish({ score: state.score, stars: starsFor(state.mistakes, questions.length), delay: NEXT_DELAY_MS + 300 });
    }

    scope.on(jokerButton, 'click', () => {
      if (jokerButton.disabled || api.paused) return;
      const candidates = enabledWrongButtons();
      if (candidates.length < 2) return;
      state.jokerUsed = true;
      audio.play('powerup');
      const removed = U.pick(candidates);
      removed.disabled = true;
      removed.classList.add('is-removed');
      jokerButton.lastChild.textContent = t('quiz.jokerUsed');
      updateJoker();
    });

    scope.on(window, 'keydown', (event) => {
      if (state.locked || state.over || api.paused || LQ.ui.modal.isOpen()) return;
      const digit = Number.parseInt(event.key, 10);
      if (Number.isInteger(digit) && digit >= 1 && digit <= buttons.length) {
        event.preventDefault();
        choose(digit - 1);
      }
    });

    api.loop((dt) => {
      if (state.locked || state.over) return;
      state.bonusLeft = Math.max(0, state.bonusLeft - dt);
      timerFill.style.transform = `scaleX(${state.bonusLeft / BONUS_SECONDS})`;
    }).start();

    showQuestion(0);

    return {
      debug: {
        state,
        answerButtons: () => buttons.slice()
      }
    };
  }

  function starGoals() {
    const count = LQ.content.quiz.length;
    return [
      LQ.t('level.quiz.star1'),
      LQ.t('level.quiz.star2', { n: allowedMistakes(count) }),
      LQ.t('level.quiz.star3')
    ];
  }

  LQ.games = LQ.games || {};
  LQ.games.quiz = { create, starGoals, logic: { starsFor, pointsFor, allowedMistakes, BONUS_SECONDS } };
})(globalThis.LQ = globalThis.LQ || {});
