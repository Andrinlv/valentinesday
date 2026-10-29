/* Love Quest · Trial 1 "Catch the Love": tap rising hearts, chain combos, catch the love letters. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const DURATION = 30;
  const LETTER_COUNT = 5;
  const LETTER_TIMES = [2.5, 8, 13.5, 19, 24];
  const COMBO_WINDOW = 1.3;
  const STAR_SCORES = Object.freeze([700, 1500]);
  const QUOTE_SECONDS = 3.2;
  const TOUCH_SLOP = 14;

  const TYPES = Object.freeze({
    heart: { sprite: ['heart', 'red'], points: 10, weight: 62, speed: [70, 115], scale: 1 },
    sparkle: { sprite: ['heart', 'pink'], points: 25, weight: 17, speed: [95, 140], scale: 0.85 },
    golden: { sprite: ['heart', 'gold'], points: 60, weight: 5, speed: [190, 250], scale: 0.75 },
    broken: { sprite: ['heartBroken', 'grey'], points: -20, weight: 16, speed: [75, 120], scale: 1 },
    letter: { sprite: ['letter', 'cream'], points: 50, weight: 0, speed: [55, 75], scale: 1.1 }
  });
  const RANDOM_TYPES = Object.keys(TYPES).filter((name) => TYPES[name].weight > 0).map((name) => ({ name, weight: TYPES[name].weight }));

  /** x1 for the first catches of a chain, then +1 every three catches in a row (max x5). */
  function multiplier(combo) {
    return Math.min(5, 1 + Math.floor(combo / 3));
  }

  function starsFor(score, letters) {
    if (score >= STAR_SCORES[1] && letters >= LETTER_COUNT) return 3;
    if (score >= STAR_SCORES[0]) return 2;
    return 1;
  }

  function create(root, api) {
    const { scope, t, fx, audio, hud } = api;
    const canvas = U.el('canvas', { class: 'game-canvas', attrs: { role: 'img', 'aria-label': t('level.catch.desc') } });
    const quote = U.el('div', { class: 'catch-quote paper', hidden: true, attrs: { 'aria-live': 'polite' } });
    const hint = U.el('div', { class: 'game-hint', text: api.isTouch ? t('catch.hint.touch') : t('catch.hint.mouse') });
    root.append(canvas, quote, hint);
    const ctx = canvas.getContext('2d');

    const state = {
      phase: 'ready',
      elapsed: 0,
      score: 0,
      combo: 0,
      comboTimer: 0,
      bestMultiplier: 1,
      letters: 0,
      caught: 0,
      brokenHits: 0,
      objects: [],
      trail: [],
      spawnTimer: 0.3,
      letterQueue: LETTER_TIMES.slice(),
      quoteTimer: 0,
      shownSecond: DURATION
    };
    let view = { width: 1, height: 1, dpr: 1, unit: 1 };

    hud.setStats([
      { id: 'score', icon: '💗', value: '0', label: t('hud.score') },
      { id: 'time', icon: '⏱️', value: U.formatTime(DURATION), label: t('hud.time') },
      { id: 'letters', icon: '💌', value: `0/${LETTER_COUNT}`, label: t('hud.letters') },
      { id: 'combo', icon: '🔥', value: 'x1', label: t('hud.combo') }
    ]);

    function updateHud() {
      hud.set('score', U.formatNumber(state.score));
      hud.set('letters', `${state.letters}/${LETTER_COUNT}`);
      hud.set('combo', `x${multiplier(state.combo)}`);
    }

    function resize() {
      const size = U.fitCanvas(canvas, 2);
      view = { ...size, unit: U.clamp(Math.min(size.width, size.height) / 560, 0.75, 1.35) };
      for (const object of state.objects) {
        object.baseX = U.clamp(object.baseX, object.size, Math.max(object.size, view.width - object.size));
      }
    }

    function spawn(typeName) {
      const type = TYPES[typeName];
      const size = Math.round(46 * view.unit * type.scale);
      const minX = size;
      const maxX = Math.max(minX, view.width - size);
      const golden = typeName === 'golden';
      const x = U.rand(minX, maxX);
      state.objects.push({
        type: typeName,
        x,
        baseX: x,
        y: view.height + size,
        vy: -U.rand(type.speed[0], type.speed[1]) * view.unit,
        wobbleAmp: (golden ? U.rand(40, 70) : U.rand(10, 32)) * view.unit,
        wobbleFreq: golden ? U.rand(1.4, 2) : U.rand(0.6, 1.4),
        phase: U.rand(0, Math.PI * 2),
        size,
        age: 0
      });
    }

    function showQuote(text) {
      quote.textContent = text;
      quote.hidden = false;
      quote.classList.remove('is-in');
      void quote.offsetWidth;
      quote.classList.add('is-in');
      state.quoteTimer = QUOTE_SECONDS;
    }

    function catchObject(object, clientX, clientY) {
      state.objects.splice(state.objects.indexOf(object), 1);
      if (object.type === 'broken') {
        state.score = Math.max(0, state.score + TYPES.broken.points);
        state.combo = 0;
        state.brokenHits++;
        audio.play('bad');
        audio.vibrate(40);
        fx.burst(clientX, clientY, { colors: ['#8d8590', '#c9c3cc', '#3a3340'], count: 12, speed: 170 });
        fx.floatText(clientX, clientY, String(TYPES.broken.points), 'float-text--bad');
        fx.shake(root, 0.6);
        hud.pulse('score', 'bad');
        updateHud();
        return;
      }

      const previousMultiplier = multiplier(state.combo);
      state.combo++;
      state.comboTimer = COMBO_WINDOW;
      const currentMultiplier = multiplier(state.combo);
      const points = TYPES[object.type].points * currentMultiplier;
      state.score += points;
      state.bestMultiplier = Math.max(state.bestMultiplier, currentMultiplier);

      if (object.type === 'letter') {
        state.letters = Math.min(LETTER_COUNT, state.letters + 1);
        const quotes = api.content.loveQuotes;
        showQuote(quotes[(state.letters - 1) % quotes.length]);
        audio.play('letter');
        fx.hearts(clientX, clientY, 8);
        hud.pulse('letters');
        if (state.letters === LETTER_COUNT) api.achieve('postman');
      } else {
        state.caught++;
        audio.play('collect', state.combo);
        const golden = object.type === 'golden';
        fx.burst(clientX, clientY, golden
          ? { count: 18, colors: fx.GOLD_COLORS, speed: 170, glow: true }
          : { count: 10, speed: 170 });
      }
      fx.floatText(clientX, clientY - 10, `+${points}`, object.type === 'golden' ? 'float-text--gold float-text--big' : '');
      if (currentMultiplier > previousMultiplier) {
        fx.floatText(clientX, clientY - 44, t('catch.combo', { n: currentMultiplier }), 'float-text--gold');
        hud.pulse('combo');
      }
      if (currentMultiplier >= 5) api.achieve('comboKing');
      hud.pulse('score');
      updateHud();
    }

    scope.on(canvas, 'pointerdown', (event) => {
      if (state.phase !== 'play' || api.paused) return;
      event.preventDefault();
      const point = U.localPoint(event, canvas);
      let hit = null;
      let hitDistance = Infinity;
      for (const object of state.objects) {
        const distance = Math.hypot(point.x - object.x, point.y - object.y);
        if (distance <= object.size * 0.55 + TOUCH_SLOP && distance < hitDistance) {
          hit = object;
          hitDistance = distance;
        }
      }
      if (hit) catchObject(hit, event.clientX, event.clientY);
    });

    function endRound() {
      state.phase = 'over';
      quote.hidden = true;
      hint.hidden = true;
      api.banner(t('catch.timeUp'), { duration: 1300 });
      scope.timeout(() => {
        api.finish({ score: state.score, stars: starsFor(state.score, state.letters) });
      }, 900);
    }

    function update(dt) {
      if (state.phase === 'play') {
        state.elapsed += dt;
        const remaining = Math.max(0, DURATION - state.elapsed);
        const second = Math.ceil(remaining);
        if (second !== state.shownSecond) {
          state.shownSecond = second;
          hud.set('time', U.formatTime(second));
          if (second <= 5 && second > 0) {
            audio.play('beep');
            hud.pulse('time', 'bad');
          }
        }

        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          const intensity = 1 + (state.elapsed / DURATION) * 0.6;
          state.spawnTimer = U.rand(0.42, 0.75) / intensity;
          spawn(U.weightedPick(RANDOM_TYPES).name);
        }
        if (state.letterQueue.length && state.elapsed >= state.letterQueue[0]) {
          state.letterQueue.shift();
          spawn('letter');
        }
        if (state.combo > 0) {
          state.comboTimer -= dt;
          if (state.comboTimer <= 0) {
            state.combo = 0;
            updateHud();
          }
        }
        if (remaining <= 0) endRound();
      }

      for (const object of state.objects) {
        object.age += dt;
        object.y += object.vy * dt;
        object.x = object.baseX + Math.sin(object.age * object.wobbleFreq * Math.PI * 2 + object.phase) * object.wobbleAmp;
        if (object.type === 'golden' && Math.random() < dt * 30) {
          state.trail.push({ x: object.x + U.rand(-6, 6), y: object.y + object.size * 0.3, life: 0.5 });
        }
      }
      state.objects = state.objects.filter((object) => {
        if (object.y > -object.size) return true;
        if (object.type === 'letter' && state.phase === 'play' && state.elapsed + 2 < DURATION - 3) {
          state.letterQueue.push(state.elapsed + 2);
          state.letterQueue.sort((a, b) => a - b);
        }
        return false;
      });
      state.trail = state.trail.filter((spark) => {
        spark.life -= dt;
        spark.y += 20 * dt;
        return spark.life > 0;
      });

      if (state.quoteTimer > 0) {
        state.quoteTimer -= dt;
        if (state.quoteTimer <= 0) quote.hidden = true;
      }
    }

    function render(now) {
      const { width, height, dpr } = view;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = false;

      for (const spark of state.trail) {
        ctx.globalAlpha = spark.life * 2;
        ctx.fillStyle = '#ffe29a';
        ctx.fillRect(Math.round(spark.x), Math.round(spark.y), 3, 3);
      }
      ctx.globalAlpha = 1;

      for (const object of state.objects) {
        const sprite = api.sprites.item(TYPES[object.type].sprite[0], TYPES[object.type].sprite[1]);
        const scale = object.size / sprite.width;
        const width2 = sprite.width * scale;
        const height2 = sprite.height * scale;
        if (object.type === 'golden' || object.type === 'letter') {
          const pulse = 0.25 + 0.12 * Math.sin(now / 150 + object.phase);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = object.type === 'golden' ? '#ffe29a' : '#fff3e0';
          ctx.beginPath();
          ctx.arc(object.x, object.y, object.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.save();
        ctx.translate(Math.round(object.x), Math.round(object.y));
        ctx.rotate(Math.sin(object.age * 3 + object.phase) * 0.14);
        ctx.drawImage(sprite, -width2 / 2, -height2 / 2, width2, height2);
        ctx.restore();
      }
    }

    U.observeResize(scope, root, resize);
    resize();
    api.loop(update, render).start();
    api.countdown().then(() => {
      state.phase = 'play';
      scope.timeout(() => hint.classList.add('is-hidden'), 2600);
    });

    return {
      debug: {
        state,
        targets() {
          const rect = canvas.getBoundingClientRect();
          return state.objects.map((object) => ({ type: object.type, x: rect.left + object.x, y: rect.top + object.y }));
        },
        endNow() {
          state.elapsed = DURATION;
        }
      }
    };
  }

  function starGoals() {
    return [
      LQ.t('level.catch.star1'),
      LQ.t('level.catch.star2', { n: U.formatNumber(STAR_SCORES[0]) }),
      LQ.t('level.catch.star3', { n: U.formatNumber(STAR_SCORES[1]) })
    ];
  }

  LQ.games = LQ.games || {};
  LQ.games.catch = { create, starGoals, logic: { multiplier, starsFor, STAR_SCORES, DURATION, LETTER_COUNT } };
})(globalThis.LQ = globalThis.LQ || {});
