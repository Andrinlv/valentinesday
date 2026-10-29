/* Love Quest · Trial 2 "Memories": flip the polaroids and find all six pairs. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const STAR_MOVES = Object.freeze([14, 10]);
  const EIDETIC_MOVES = 8;
  const MISMATCH_MS = 900;
  const PEEK_MS = 1300;
  const PEEK_PENALTY = 2;
  const CARD_RATIO = 1.2;

  function starsFor(moves) {
    if (moves <= STAR_MOVES[1]) return 3;
    if (moves <= STAR_MOVES[0]) return 2;
    return 1;
  }

  function scoreFor(matchPoints, moves, seconds) {
    return matchPoints + Math.max(0, 16 - moves) * 40 + Math.max(0, 90 - Math.round(seconds)) * 4;
  }

  /** Picks the column count that gives the biggest cards for the available area. */
  function bestGrid(count, width, height, gap) {
    let best = { cols: 4, size: 0 };
    for (const cols of [2, 3, 4, 6]) {
      const rows = Math.ceil(count / cols);
      const byWidth = (width - gap * (cols - 1)) / cols;
      const byHeight = (height - gap * (rows - 1)) / rows / CARD_RATIO;
      const size = Math.floor(Math.min(byWidth, byHeight, 150));
      if (size > best.size) best = { cols, size };
    }
    return best;
  }

  function create(root, api) {
    const { scope, t, fx, audio, hud } = api;
    const items = api.content.memoryItems;
    const pairCount = items.length;

    const state = {
      first: null,
      lock: false,
      moves: 0,
      matches: 0,
      combo: 0,
      matchPoints: 0,
      elapsed: 0,
      started: false,
      over: false,
      peekUsed: false,
      shownSecond: -1
    };

    const grid = U.el('div', { class: 'memory-grid' });
    const board = U.el('div', { class: 'memory-board' }, grid);
    const peekButton = U.el('button', { type: 'button', class: 'btn btn--sage btn--small memory-peek' }, [
      U.el('span', { text: '👀', attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { text: t('memory.peek') })
    ]);
    root.append(U.el('div', { class: 'memory' }, [board, U.el('div', { class: 'memory-toolbar' }, peekButton)]));
    grid.style.setProperty('--heart', `url(${api.sprites.item('heart', 'red').toDataURL()})`);

    const deck = U.shuffle(items.flatMap((item, pair) => [{ item, pair }, { item, pair }]));
    const cards = deck.map((entry, index) => {
      const face = entry.item.isImage
        ? U.el('img', { class: 'memory-card__img', src: entry.item.value, alt: '', draggable: false })
        : U.el('span', { class: 'memory-card__emoji', text: entry.item.value });
      if (entry.item.isImage) {
        face.addEventListener('error', () => {
          console.warn(`[LoveQuest] Memory photo "${entry.item.value}" could not be loaded, showing a heart instead.`);
          face.replaceWith(U.el('span', { class: 'memory-card__emoji', text: ['💞', '💗', '💖', '💝', '💘', '💓'][entry.pair % 6] }));
        }, { once: true });
      }
      const el = U.el('button', {
        type: 'button',
        class: 'memory-card',
        style: { '--tilt': `${U.rand(-2.5, 2.5).toFixed(2)}deg` },
        attrs: { 'aria-label': t('memory.cardHidden', { n: index + 1 }) }
      }, U.el('span', { class: 'memory-card__inner' }, [
        U.el('span', { class: 'memory-card__face memory-card__back' }, U.el('span', { class: 'memory-card__heart' })),
        U.el('span', { class: 'memory-card__face memory-card__front' }, [
          U.el('span', { class: 'memory-card__tape', attrs: { 'aria-hidden': 'true' } }),
          U.el('span', { class: 'memory-card__photo' }, face)
        ])
      ]));
      const card = { index, pair: entry.pair, item: entry.item, el, faceUp: false, matched: false };
      scope.on(el, 'click', () => flip(card));
      grid.append(el);
      return card;
    });

    hud.setStats([
      { id: 'moves', icon: '👣', value: '0', label: t('hud.moves') },
      { id: 'pairs', icon: '💞', value: `0/${pairCount}`, label: t('hud.pairs') },
      { id: 'time', icon: '⏱️', value: U.formatTime(0), label: t('hud.time') }
    ]);

    function setFaceUp(card, faceUp) {
      card.faceUp = faceUp;
      card.el.classList.toggle('is-flipped', faceUp);
      const label = card.item.isImage ? `${t('memory.photo')} ${card.pair + 1}` : card.item.value;
      card.el.setAttribute('aria-label', faceUp
        ? t('memory.cardShown', { n: card.index + 1, item: label })
        : t('memory.cardHidden', { n: card.index + 1 }));
    }

    function centerOf(card) {
      const rect = card.el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function finishGame() {
      state.over = true;
      peekButton.disabled = true;
      const score = scoreFor(state.matchPoints, state.moves, state.elapsed);
      if (state.moves <= EIDETIC_MOVES && !state.peekUsed) api.achieve('eidetic');
      api.banner(t('memory.allFound'), { duration: 1400, tone: 'gold' });
      scope.timeout(() => api.finish({ score, stars: starsFor(state.moves) }), 900);
    }

    function onMatch(a, b) {
      a.matched = true;
      b.matched = true;
      a.el.classList.add('is-matched');
      b.el.classList.add('is-matched');
      a.el.setAttribute('aria-disabled', 'true');
      b.el.setAttribute('aria-disabled', 'true');
      state.combo++;
      state.matches++;
      const points = 100 * state.combo;
      state.matchPoints += points;
      audio.play('match');
      const center = centerOf(b);
      fx.hearts(center.x, center.y, 7);
      fx.floatText(center.x, center.y - 20, state.combo > 1 ? `${t('memory.match')} x${state.combo}` : `+${points}`, 'float-text--gold');
      hud.set('pairs', `${state.matches}/${pairCount}`);
      hud.pulse('pairs');
      if (state.matches === pairCount) finishGame();
    }

    function onMismatch(a, b) {
      state.combo = 0;
      state.lock = true;
      audio.play('wrong');
      a.el.classList.add('is-wrong');
      b.el.classList.add('is-wrong');
      scope.timeout(() => {
        setFaceUp(a, false);
        setFaceUp(b, false);
        a.el.classList.remove('is-wrong');
        b.el.classList.remove('is-wrong');
        state.lock = false;
      }, MISMATCH_MS);
    }

    function flip(card) {
      if (state.over || state.lock || card.faceUp || card.matched || api.paused) return;
      state.started = true;
      setFaceUp(card, true);
      audio.play('flip');
      if (!state.first) {
        state.first = card;
        return;
      }
      const first = state.first;
      state.first = null;
      state.moves++;
      hud.set('moves', String(state.moves));
      if (first.pair === card.pair) onMatch(first, card);
      else onMismatch(first, card);
    }

    scope.on(peekButton, 'click', () => {
      if (state.peekUsed || state.lock || state.over || api.paused) return;
      state.peekUsed = true;
      state.started = true;
      state.lock = true;
      state.moves += PEEK_PENALTY;
      hud.set('moves', String(state.moves));
      hud.pulse('moves', 'bad');
      peekButton.disabled = true;
      peekButton.lastChild.textContent = t('memory.peekUsed');
      audio.play('powerup');
      const hidden = cards.filter((card) => !card.faceUp && !card.matched);
      hidden.forEach((card) => setFaceUp(card, true));
      scope.timeout(() => {
        hidden.forEach((card) => setFaceUp(card, false));
        state.lock = false;
      }, PEEK_MS);
    });

    function layout() {
      const rect = board.getBoundingClientRect();
      const gap = rect.width < 420 ? 8 : 14;
      const { cols, size } = bestGrid(cards.length, rect.width, rect.height, gap);
      grid.style.setProperty('--cols', String(cols));
      grid.style.setProperty('--card', `${Math.max(40, size)}px`);
      grid.style.setProperty('--gap', `${gap}px`);
    }

    U.observeResize(scope, board, layout);
    layout();

    api.loop((dt) => {
      if (!state.started || state.over) return;
      state.elapsed += dt;
      const second = Math.floor(state.elapsed);
      if (second !== state.shownSecond) {
        state.shownSecond = second;
        hud.set('time', U.formatTime(second));
      }
    }).start();

    return {
      debug: {
        state,
        cards: () => cards.map((card) => ({ pair: card.pair, matched: card.matched, faceUp: card.faceUp, ...centerOf(card) }))
      }
    };
  }

  function starGoals() {
    return [
      LQ.t('level.memory.star1'),
      LQ.t('level.memory.star2', { n: STAR_MOVES[0] }),
      LQ.t('level.memory.star3', { n: STAR_MOVES[1] })
    ];
  }

  LQ.games = LQ.games || {};
  LQ.games.memory = { create, starGoals, logic: { starsFor, scoreFor, bestGrid, STAR_MOVES } };
})(globalThis.LQ = globalThis.LQ || {});
