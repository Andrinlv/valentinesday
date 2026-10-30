/* Love Quest · Trial 3 "Cupid's Arrow": pull back, aim and release to hit the floating hearts. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const ARROWS = 12;
  const STAR_HITS = Object.freeze([6, 9]);
  const TARGET_COUNT = 4;
  const PREVIEW_SECONDS = 0.55;
  const SUBSTEPS = 4;
  const MIN_POWER = 0.12;
  const PERFECT_BONUS = 500;
  const RESPAWN_SECONDS = 0.7;

  const TARGETS = Object.freeze({
    normal: { variant: 'red', points: 100, radius: 24, speed: [35, 70], weight: 68 },
    big: { variant: 'pink', points: 60, radius: 32, speed: [20, 40], weight: 18 },
    golden: { variant: 'gold', points: 250, radius: 17, speed: [110, 150], weight: 14 }
  });
  const TARGET_TABLE = Object.keys(TARGETS).map((kind) => ({ kind, weight: TARGETS[kind].weight }));

  function starsFor(hits) {
    if (hits >= STAR_HITS[1]) return 3;
    if (hits >= STAR_HITS[0]) return 2;
    return 1;
  }

  /** True when the segment (x1,y1)→(x2,y2) touches the circle (cx,cy,r). */
  function segmentHitsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? U.clamp(((cx - x1) * dx + (cy - y1) * dy) / lengthSq, 0, 1) : 0;
    const px = x1 + t * dx - cx;
    const py = y1 + t * dy - cy;
    return px * px + py * py <= r * r;
  }

  /** Maps a drag (pull-back) vector to an upward shooting angle and a 0–1 power. */
  function aimFromDrag(dx, dy, unit) {
    const power = U.clamp(Math.hypot(dx, dy) / (170 * unit), 0, 1);
    let angle = Math.atan2(dy, dx);
    if (angle > 0) angle = angle > Math.PI / 2 ? -Math.PI : 0;
    return { angle, power };
  }

  function create(root, api) {
    const { scope, t, fx, audio, hud } = api;
    const canvas = U.el('canvas', { class: 'game-canvas game-canvas--aim', attrs: { role: 'img', 'aria-label': t('archery.aria') } });
    const hint = U.el('div', { class: 'game-hint game-hint--top', text: api.isTouch ? t('archery.hint.touch') : t('archery.hint.mouse') });
    root.append(canvas, hint);
    const ctx = canvas.getContext('2d');

    const state = {
      phase: 'ready',
      arrowsLeft: ARROWS,
      arrows: [],
      targets: [],
      respawns: [],
      clouds: [],
      score: 0,
      hits: 0,
      arrowsThatHit: 0,
      cooldown: 0,
      aiming: null, // { pointerId, startX, startY, x, y }
      aim: { angle: -Math.PI / 3, power: 0.7 },
      keyboardAim: false,
      recoil: 0,
      ending: false
    };
    let view = { width: 1, height: 1, dpr: 1, unit: 1, bowX: 0, bowY: 0, gravity: 500, speed: 950, zone: null };

    hud.setStats([
      { id: 'score', icon: '💗', value: '0', label: t('hud.score') },
      { id: 'arrows', icon: '🏹', value: String(ARROWS), label: t('hud.arrows') },
      { id: 'hits', icon: '🎯', value: '0', label: t('hud.hits') }
    ]);

    function resize() {
      const size = U.fitCanvas(canvas, 2);
      const unit = U.clamp(Math.min(size.width, size.height) / 560, 0.72, 1.4);
      const landscape = size.width >= size.height;
      const bowX = landscape ? Math.max(70, size.width * 0.12) : size.width / 2;
      const bowY = size.height - (landscape ? 86 : 96) * unit;
      const zone = landscape
        ? { left: size.width * 0.32, right: size.width - 30, top: size.height * 0.08, bottom: size.height * 0.62 }
        : { left: 26, right: size.width - 26, top: size.height * 0.08, bottom: size.height * 0.56 };
      view = { ...size, unit, bowX, bowY, zone, gravity: 520 * unit, speed: 980 * unit };
      if (state.phase === 'ready') state.aim.angle = landscape ? -Math.PI / 4 : -Math.PI / 2;
      for (const target of state.targets) {
        target.radius = TARGETS[target.kind].radius * unit;
        target.x = U.clamp(target.x, zone.left + target.radius, Math.max(zone.left + target.radius, zone.right - target.radius));
        target.baseY = U.clamp(target.baseY, zone.top + target.radius, Math.max(zone.top + target.radius, zone.bottom - target.radius));
      }
      if (!state.clouds.length) {
        for (let i = 0; i < 6; i++) {
          state.clouds.push({ x: U.rand(0, size.width), y: U.rand(0.05, 0.6) * size.height, scale: U.rand(0.6, 1.4), speed: U.rand(6, 16) });
        }
      }
    }

    function spawnTarget() {
      const { zone, unit } = view;
      const kind = U.weightedPick(TARGET_TABLE).kind;
      const spec = TARGETS[kind];
      const radius = spec.radius * unit;
      const left = zone.left + radius;
      const right = Math.max(left, zone.right - radius);
      const top = zone.top + radius;
      const bottom = Math.max(top, zone.bottom - radius);
      state.targets.push({
        kind,
        radius,
        x: U.rand(left, right),
        baseY: U.rand(top, bottom),
        y: 0,
        vx: U.rand(spec.speed[0], spec.speed[1]) * unit * (Math.random() < 0.5 ? -1 : 1),
        bobAmp: U.rand(6, 18) * unit,
        bobFreq: U.rand(0.8, 1.6),
        age: 0,
        spawnIn: 0.35
      });
    }

    function shoot(angle, power) {
      if (state.phase !== 'play' || state.arrowsLeft <= 0 || state.cooldown > 0) return;
      state.arrowsLeft--;
      state.cooldown = 0.28;
      state.recoil = 1;
      const speed = (0.35 + 0.65 * power) * view.speed;
      const start = launchPoint(angle);
      state.arrows.push({ x: start.x, y: start.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, hits: 0 });
      audio.play('shoot');
      hud.set('arrows', String(state.arrowsLeft));
      hint.classList.add('is-hidden');
    }

    function hitTarget(arrow, target) {
      target.popped = true;
      state.respawns.push(RESPAWN_SECONDS);
      arrow.hits++;
      if (arrow.hits === 1) state.arrowsThatHit++;
      state.hits++;
      const points = Math.round(TARGETS[target.kind].points * (1 + 0.5 * (arrow.hits - 1)));
      state.score += points;
      audio.play('hit', arrow.hits - 1);
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + target.x;
      const y = rect.top + target.y;
      fx.burst(x, y, target.kind === 'golden'
        ? { count: 14, speed: 200, colors: fx.GOLD_COLORS, glow: true }
        : { count: 14, speed: 200 });
      fx.hearts(x, y, 4);
      fx.floatText(x, y - 12, `+${points}`, target.kind === 'golden' ? 'float-text--gold float-text--big' : '');
      if (arrow.hits >= 2) {
        api.achieve('multiHit');
        fx.floatText(x, y - 46, t('archery.multi', { n: arrow.hits }), 'float-text--gold');
      }
      if (target.kind === 'golden') api.achieve('robinHood');
      hud.set('score', U.formatNumber(state.score));
      hud.set('hits', String(state.hits));
      hud.pulse('hits');
    }

    function endRound() {
      state.ending = true;
      const perfect = state.arrowsThatHit === ARROWS;
      if (perfect) state.score += PERFECT_BONUS;
      hud.set('score', U.formatNumber(state.score));
      api.banner(perfect ? t('archery.perfect') : t('archery.outOfArrows'), { duration: 1300, tone: perfect ? 'gold' : '' });
      api.finish({ score: state.score, stars: starsFor(state.hits), delay: 1600 });
    }

    /* ---------- input ---------- */

    scope.on(canvas, 'pointerdown', (event) => {
      if (state.phase !== 'play' || state.arrowsLeft <= 0 || api.paused) return;
      /* A second finger is ignored; a stale aim of the same pointer (lost pointerup) is replaced. */
      if (state.aiming && state.aiming.pointerId !== event.pointerId) return;
      event.preventDefault();
      const point = U.localPoint(event, canvas);
      state.aiming = { pointerId: event.pointerId, startX: point.x, startY: point.y, x: point.x, y: point.y };
      state.keyboardAim = false;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (err) {
        /* not required */
      }
    });
    scope.on(canvas, 'pointermove', (event) => {
      if (!state.aiming || event.pointerId !== state.aiming.pointerId) return;
      const point = U.localPoint(event, canvas);
      state.aiming.x = point.x;
      state.aiming.y = point.y;
      const aim = aimFromDrag(state.aiming.startX - point.x, state.aiming.startY - point.y, view.unit);
      if (aim.power > 0.02) state.aim = aim;
    });
    const release = (event) => {
      if (!state.aiming || event.pointerId !== state.aiming.pointerId) return;
      const aim = aimFromDrag(state.aiming.startX - state.aiming.x, state.aiming.startY - state.aiming.y, view.unit);
      state.aiming = null;
      if (event.type === 'pointerup' && aim.power >= MIN_POWER) shoot(aim.angle, aim.power);
    };
    scope.on(canvas, 'pointerup', release);
    scope.on(canvas, 'pointercancel', release);
    scope.on(canvas, 'lostpointercapture', release);
    scope.on(window, 'blur', () => {
      state.aiming = null;
    });
    api.onPause(() => {
      state.aiming = null;
    });

    scope.on(window, 'keydown', (event) => {
      if (state.phase !== 'play' || api.paused || LQ.ui.modal.isOpen()) return;
      const step = { ArrowLeft: -0.05, ArrowRight: 0.05 }[event.code];
      const power = { ArrowUp: 0.04, ArrowDown: -0.04 }[event.code];
      if (step !== undefined) {
        state.aim.angle = U.clamp(state.aim.angle + step, -Math.PI, 0);
      } else if (power !== undefined) {
        state.aim.power = U.clamp(state.aim.power + power, MIN_POWER, 1);
      } else if (event.code === 'Space' || event.code === 'Enter') {
        if (!event.repeat) shoot(state.aim.angle, state.aim.power);
      } else {
        return;
      }
      event.preventDefault();
      state.keyboardAim = true;
    });

    /* ---------- simulation ---------- */

    function update(dt) {
      state.cooldown = Math.max(0, state.cooldown - dt);
      state.recoil = Math.max(0, state.recoil - dt * 4);

      for (const cloud of state.clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.x > view.width + 120) cloud.x = -120;
      }

      if (state.phase === 'play') {
        state.respawns = state.respawns.map((time) => time - dt);
        while (state.respawns.length && state.respawns[0] <= 0) {
          state.respawns.shift();
          spawnTarget();
        }
      }

      const { zone } = view;
      for (const target of state.targets) {
        target.age += dt;
        target.spawnIn = Math.max(0, target.spawnIn - dt);
        target.x += target.vx * dt;
        if (target.x < zone.left + target.radius) {
          target.x = zone.left + target.radius;
          target.vx = Math.abs(target.vx);
        } else if (target.x > zone.right - target.radius) {
          target.x = zone.right - target.radius;
          target.vx = -Math.abs(target.vx);
        }
        target.y = target.baseY + Math.sin(target.age * target.bobFreq * Math.PI * 2) * target.bobAmp;
      }

      const h = dt / SUBSTEPS;
      for (const arrow of state.arrows) {
        for (let s = 0; s < SUBSTEPS; s++) {
          const px = arrow.x;
          const py = arrow.y;
          arrow.vy += view.gravity * h;
          arrow.x += arrow.vx * h;
          arrow.y += arrow.vy * h;
          for (const target of state.targets) {
            if (target.popped || target.spawnIn > 0.15) continue;
            if (segmentHitsCircle(px, py, arrow.x, arrow.y, target.x, target.y, target.radius)) hitTarget(arrow, target);
          }
        }
      }
      state.targets = state.targets.filter((target) => !target.popped);
      state.arrows = state.arrows.filter((arrow) =>
        arrow.x > -80 && arrow.x < view.width + 80 && arrow.y < view.height + 80 && arrow.y > -view.height * 2);

      if (state.phase === 'play' && !state.ending && state.arrowsLeft === 0 && state.arrows.length === 0) {
        state.phase = 'over';
        endRound();
      }
    }

    /* ---------- drawing ---------- */

    function drawCloud(cloud) {
      const s = cloud.scale * view.unit;
      ctx.fillStyle = 'rgba(255, 246, 232, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, 46 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x - 26 * s, cloud.y + 4 * s, 26 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud.x + 22 * s, cloud.y - 6 * s, 28 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawArrow(x, y, angle, scale) {
      const length = 38 * scale;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = '#7a4a2a';
      ctx.lineWidth = 3 * scale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-length, 0);
      ctx.lineTo(-4 * scale, 0);
      ctx.stroke();
      ctx.fillStyle = '#f49ac1';
      ctx.beginPath();
      ctx.moveTo(-length, 0);
      ctx.lineTo(-length - 8 * scale, -6 * scale);
      ctx.lineTo(-length + 6 * scale, 0);
      ctx.lineTo(-length - 8 * scale, 6 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8576f';
      ctx.beginPath();
      ctx.moveTo(4 * scale, 0);
      ctx.bezierCurveTo(4 * scale, -7 * scale, -8 * scale, -7 * scale, -6 * scale, 0);
      ctx.bezierCurveTo(-8 * scale, 7 * scale, 4 * scale, 7 * scale, 4 * scale, 0);
      ctx.fill();
      ctx.restore();
    }

    function drawBow() {
      const { bowX, bowY, unit } = view;
      const angle = state.aim.angle;
      const pull = state.aiming || state.keyboardAim ? state.aim.power : 0;
      const recoil = state.recoil * 4 * unit;
      ctx.save();
      ctx.translate(bowX, bowY);
      ctx.rotate(angle);
      ctx.translate(recoil, 0);
      const r = 34 * unit;
      ctx.strokeStyle = '#8a5a3a';
      ctx.lineWidth = 6 * unit;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-6 * unit, 0, r, -Math.PI / 2.1, Math.PI / 2.1);
      ctx.stroke();
      ctx.strokeStyle = '#f2c35b';
      ctx.lineWidth = 2 * unit;
      ctx.beginPath();
      ctx.arc(-6 * unit, 0, r, -0.3, 0.3);
      ctx.stroke();
      const tipY = Math.sin(Math.PI / 2.1) * r;
      const tipX = Math.cos(Math.PI / 2.1) * r - 6 * unit;
      const nockX = tipX - pull * 30 * unit;
      ctx.strokeStyle = '#fff3e2';
      ctx.lineWidth = 1.5 * unit;
      ctx.beginPath();
      ctx.moveTo(tipX, -tipY);
      ctx.lineTo(nockX, 0);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
      if (state.arrowsLeft > 0 && state.cooldown <= 0 && state.phase !== 'over') {
        const nockOffset = (tipXFor(unit) - pull * 30 * unit) + 38 * unit;
        drawArrow(bowX + Math.cos(angle) * nockOffset, bowY + Math.sin(angle) * nockOffset, angle, unit);
      }
    }

    function tipXFor(unit) {
      return Math.cos(Math.PI / 2.1) * 34 * unit - 6 * unit;
    }

    /** Where a released arrow's tip starts: right where it rested on the bow. */
    function launchPoint(angle) {
      const offset = tipXFor(view.unit) + 38 * view.unit;
      return { x: view.bowX + Math.cos(angle) * offset, y: view.bowY + Math.sin(angle) * offset };
    }

    function drawPreview() {
      if (!(state.aiming || state.keyboardAim) || state.arrowsLeft <= 0 || state.phase !== 'play') return;
      if (state.aiming && state.aim.power < MIN_POWER) return;
      const speed = (0.35 + 0.65 * state.aim.power) * view.speed;
      const start = launchPoint(state.aim.angle);
      let x = start.x;
      let y = start.y;
      const vx = Math.cos(state.aim.angle) * speed;
      let vy = Math.sin(state.aim.angle) * speed;
      const step = 1 / 60;
      for (let i = 1; i <= PREVIEW_SECONDS / step; i++) {
        vy += view.gravity * step;
        x += vx * step;
        y += vy * step;
        if (i % 4 === 0) {
          ctx.globalAlpha = 0.85 * (1 - i * step / PREVIEW_SECONDS);
          ctx.fillStyle = '#fff3e2';
          ctx.beginPath();
          ctx.arc(x, y, 3 * view.unit, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    function render(now) {
      const { width, height, dpr, unit, bowX, bowY } = view;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      state.clouds.forEach(drawCloud);

      const glow = ctx.createRadialGradient(bowX, bowY + 10 * unit, 0, bowX, bowY + 10 * unit, 110 * unit);
      glow.addColorStop(0, 'rgba(255, 226, 170, 0.32)');
      glow.addColorStop(1, 'rgba(255, 226, 170, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(bowX - 110 * unit, bowY - 100 * unit, 220 * unit, 220 * unit);
      ctx.fillStyle = 'rgba(30, 14, 20, 0.3)';
      ctx.beginPath();
      ctx.ellipse(bowX - 12 * unit, bowY + 36 * unit, 64 * unit, 10 * unit, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.imageSmoothingEnabled = false;
      for (const target of state.targets) {
        const sprite = api.sprites.item('heart', TARGETS[target.kind].variant);
        const grow = target.spawnIn > 0 ? 1 - target.spawnIn / 0.35 : 1;
        const size = target.radius * 2.3 * U.ease.outBack(U.clamp(grow, 0, 1));
        if (target.kind === 'golden') {
          ctx.globalAlpha = 0.3 + 0.12 * Math.sin(now / 140);
          ctx.fillStyle = '#ffe29a';
          ctx.beginPath();
          ctx.arc(target.x, target.y, target.radius * 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        const h = size * (sprite.height / sprite.width);
        ctx.drawImage(sprite, Math.round(target.x - size / 2), Math.round(target.y - h / 2), size, h);
      }

      const heroScale = Math.max(2, Math.ceil(2.8 * unit));
      const landscape = width >= height;
      const hero = api.sprites.hero(api.hero.avatar, landscape ? 'right' : 'up', 0);
      ctx.drawImage(hero, Math.round(bowX - (landscape ? 40 : 8) * unit - 8 * heroScale), Math.round(bowY + 34 * unit - 16 * heroScale), 16 * heroScale, 16 * heroScale);

      drawPreview();
      drawBow();
      for (const arrow of state.arrows) drawArrow(arrow.x, arrow.y, Math.atan2(arrow.vy, arrow.vx), unit);

      if (state.aiming) {
        ctx.strokeStyle = 'rgba(255, 243, 226, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(state.aiming.startX, state.aiming.startY);
        ctx.lineTo(state.aiming.x, state.aiming.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    U.observeResize(scope, root, resize);
    resize();
    for (let i = 0; i < TARGET_COUNT; i++) spawnTarget();
    api.loop(update, render).start();
    api.countdown().then(() => {
      state.phase = 'play';
    });

    return {
      debug: {
        state,
        view: () => view,
        shoot: (angle, power) => shoot(angle, power),
        targets() {
          const rect = canvas.getBoundingClientRect();
          return state.targets.map((target) => ({ kind: target.kind, x: rect.left + target.x, y: rect.top + target.y }));
        }
      }
    };
  }

  function starGoals() {
    return [
      LQ.t('level.archery.star1'),
      LQ.t('level.archery.star2', { n: STAR_HITS[0] }),
      LQ.t('level.archery.star3', { n: STAR_HITS[1] })
    ];
  }

  LQ.games = LQ.games || {};
  LQ.games.archery = { create, starGoals, logic: { starsFor, segmentHitsCircle, aimFromDrag, STAR_HITS, ARROWS } };
})(globalThis.LQ = globalThis.LQ || {});
