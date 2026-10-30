/* Love Quest · "trial complete" screen with animated stars, score and rewards. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);

  function reward(icon, text) {
    return U.el('li', { class: 'results__reward' }, [
      U.el('span', { class: 'results__reward-icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { text })
    ]);
  }

  const results = {
    /** outcome: from LQ.progress.applyResult(); handlers: { onRetry, onMap } */
    show(outcome, handlers) {
      const starEls = [0, 1, 2].map(() => U.el('span', { class: 'results__star', text: '★', attrs: { 'aria-hidden': 'true' } }));
      const scoreValue = U.el('span', { class: 'results__score-value', text: '0' });
      const level = LQ.progress.levelState(outcome.levelId);

      const rewards = U.el('ul', { class: 'results__rewards' });
      if (outcome.newStars > 0) rewards.append(reward('🪙', t('results.tokens', { n: outcome.newStars })));
      if (outcome.letterPiece) {
        rewards.append(reward('💌', t('results.letter', { n: outcome.letterPiece, total: LQ.progress.LETTER_PIECES })));
      }
      if (outcome.unlockedLevelId) {
        rewards.append(reward('🔓', t('results.unlocked', { name: t(`level.${outcome.unlockedLevelId}.title`) })));
      }

      const content = U.el('div', { class: 'results' }, [
        U.el('p', { class: 'results__level', text: t(`level.${outcome.levelId}.title`) }),
        U.el('div', { class: 'results__stars', attrs: { role: 'img', 'aria-label': `${outcome.stars} / 3 ★` } }, starEls),
        U.el('div', { class: 'results__score' }, [
          U.el('span', { class: 'results__label', text: t('results.score') }),
          scoreValue,
          outcome.newBest ? U.el('span', { class: 'results__badge', text: t('results.newBest') }) : null
        ]),
        U.el('p', { class: 'results__best', text: `${t('results.best')}: ${U.formatNumber(level.best)} ${t('common.lp')}` }),
        rewards.childElementCount ? rewards : null
      ]);

      const modal = LQ.ui.modal.open({
        title: t('results.title'),
        content,
        dismissible: false,
        className: 'modal--results',
        actions: [
          { label: t('results.retry'), kind: 'ghost', onClick: handlers.onRetry },
          { label: outcome.unlockedLevelId ? t('results.next') : t('results.map'), kind: 'primary', autofocus: true, onClick: handlers.onMap }
        ]
      });

      const reduced = U.prefersReducedMotion();
      const countDuration = reduced ? 0 : 900;
      const start = performance.now();
      const countUp = (now) => {
        if (!modal.isOpen) return;
        const progress = countDuration ? U.clamp((now - start) / countDuration, 0, 1) : 1;
        scoreValue.textContent = U.formatNumber(outcome.score * U.ease.outCubic(progress));
        if (progress < 1) requestAnimationFrame(countUp);
      };
      requestAnimationFrame(countUp);

      starEls.forEach((star, index) => {
        if (index >= outcome.stars) return;
        setTimeout(() => {
          if (!modal.isOpen) return;
          star.classList.add('is-earned');
          LQ.audio.play('star', index);
          const rect = star.getBoundingClientRect();
          LQ.fx.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 14);
        }, 450 + index * 380);
      });

      if (outcome.stars >= 2) setTimeout(() => modal.isOpen && LQ.fx.confetti(outcome.stars === 3 ? 170 : 90), 500);
      return modal;
    }
  };

  LQ.ui = LQ.ui || {};
  LQ.ui.results = results;
})(globalThis.LQ = globalThis.LQ || {});
