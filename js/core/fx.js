/* Love Quest · juice: particles, confetti, fireworks, floating texts, screen shake and toasts. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const MAX_PARTICLES = 900;
  const MAX_TOASTS = 3;
  const LOVE_COLORS = Object.freeze(['#e8576f', '#f49ac1', '#ffd9de', '#fff3e0']);
  const GOLD_COLORS = Object.freeze(['#f2c35b', '#ffe29a', '#fff6d8']);
  const BURST_DEFAULTS = Object.freeze({ kind: 'dot', count: 14, colors: LOVE_COLORS, speed: 220, gravity: 260, life: 0.8, size: 4 });
  const CONFETTI_COLORS = ['#e8576f', '#f49ac1', '#f2c35b', '#8fc1a9', '#a9d0ee', '#fff3e0'];

  let canvas = null;
  let ctx = null;
  let layer = null;
  let toastRoot = null;
  let flashEl = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let spawnQueue = [];
  let emitters = [];
  let rafId = 0;
  let last = 0;
  const toastQueue = [];
  let visibleToasts = 0;

  const reduced = () => U.prefersReducedMotion();
  const scaleCount = (count) => Math.max(1, Math.round(count * (reduced() ? 0.35 : 1)));

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  function spawn(particle) {
    if (particles.length + spawnQueue.length >= MAX_PARTICLES) return;
    spawnQueue.push(Object.assign({
      kind: 'dot', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 1, life: 1, size: 4,
      color: '#fff', rot: 0, spin: 0, age: 0, fade: 0.35, shrink: false, variant: 'red', glow: false
    }, particle, { maxLife: particle.life || 1 }));
    ensureRunning();
  }

  function ensureRunning() {
    if (rafId || !ctx) return;
    last = 0;
    rafId = requestAnimationFrame(tick);
  }

  function drawParticle(p) {
    const alpha = Math.min(1, p.life / p.fade);
    ctx.globalAlpha = alpha;
    switch (p.kind) {
      case 'dot': {
        const radius = Math.max(0.4, p.shrink ? p.size * (p.life / p.maxLife) : p.size);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'spark': {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
        ctx.stroke();
        break;
      }
      case 'rocket': {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4);
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) + 3, 2, 6);
        break;
      }
      case 'heart': {
        const sprite = LQ.sprites.item('heart', p.variant);
        const scale = p.size / sprite.width;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, (-sprite.width * scale) / 2, (-sprite.height * scale) / 2, sprite.width * scale, sprite.height * scale);
        ctx.restore();
        break;
      }
      case 'confetti': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.age * p.flipSpeed));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }

  function tick(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;

    emitters = emitters.filter((emitter) => {
      emitter.time += dt;
      emitter.update(dt, emitter);
      return emitter.time < emitter.duration;
    });

    if (spawnQueue.length) {
      particles = particles.concat(spawnQueue);
      spawnQueue = [];
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const alive = [];
    for (const p of particles) {
      p.life -= dt;
      p.age += dt;
      if (p.life <= 0) {
        if (p.onDeath) p.onDeath(p);
        continue;
      }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.wobble) p.x += Math.sin(p.age * p.wobble) * 0.6;
      if (p.y > height + 80 || p.x < -120 || p.x > width + 120) continue;
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      drawParticle(p);
      if (p.glow) ctx.globalCompositeOperation = 'source-over';
      alive.push(p);
    }
    ctx.globalAlpha = 1;
    particles = alive;

    if (particles.length || spawnQueue.length || emitters.length) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = 0;
      ctx.clearRect(0, 0, width, height);
    }
  }

  function explode(x, y, colors, count, power) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = power * (0.55 + Math.random() * 0.45);
      spawn({
        kind: 'spark', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        gravity: 160, drag: 0.96, life: 0.9 + Math.random() * 0.6, size: 2.2,
        color: U.pick(colors), fade: 0.5, glow: true
      });
    }
    for (let i = 0; i < Math.max(2, Math.round(count / 10)); i++) {
      const angle = Math.random() * Math.PI * 2;
      spawn({
        kind: 'heart', x, y, vx: Math.cos(angle) * power * 0.4, vy: Math.sin(angle) * power * 0.4,
        gravity: 120, drag: 0.97, life: 1.4, size: 14 + Math.random() * 8, variant: U.pick(['red', 'pink', 'gold']),
        spin: U.rand(-2, 2), fade: 0.6
      });
    }
  }

  function launchRocket() {
    const colorSets = [LOVE_COLORS, GOLD_COLORS, ['#a9d0ee', '#fff3e0', '#f49ac1'], ['#8fc1a9', '#fff3e0', '#f2c35b']];
    const colors = U.pick(colorSets);
    const targetY = height * U.rand(0.12, 0.42);
    const startY = height + 10;
    const flightTime = U.rand(0.9, 1.3);
    spawn({
      kind: 'rocket', x: width * U.rand(0.12, 0.88), y: startY,
      vx: U.rand(-30, 30), vy: -(startY - targetY) / flightTime - 80 * flightTime,
      gravity: 160, drag: 1, life: flightTime, color: colors[0], fade: 0.05,
      onDeath: (p) => {
        explode(p.x, p.y, colors, scaleCount(46), U.rand(220, 320));
        if (LQ.audio) LQ.audio.play('firework');
      }
    });
  }

  function showNextToast() {
    const limit = window.innerHeight < 640 ? 2 : MAX_TOASTS;
    if (!toastRoot || visibleToasts >= limit || !toastQueue.length) return;
    const { icon, title, text, duration, tone } = toastQueue.shift();
    visibleToasts++;
    const node = U.el('div', { class: `toast${tone ? ` toast--${tone}` : ''}`, attrs: { role: 'status' } }, [
      U.el('span', { class: 'toast__icon', text: icon || '✨', attrs: { 'aria-hidden': 'true' } }),
      U.el('div', { class: 'toast__body' }, [
        U.el('strong', { class: 'toast__title', text: title || '' }),
        text ? U.el('span', { class: 'toast__text', text }) : null
      ])
    ]);
    toastRoot.append(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    setTimeout(() => {
      node.classList.remove('is-visible');
      node.classList.add('is-leaving');
      setTimeout(() => {
        node.remove();
        visibleToasts--;
        showNextToast();
      }, 350);
    }, duration || 3200);
  }

  LQ.fx = {
    init() {
      canvas = document.getElementById('fx-canvas');
      ctx = canvas.getContext('2d');
      layer = document.getElementById('fx-layer');
      toastRoot = document.getElementById('toast-root');
      flashEl = document.getElementById('flash');
      resize();
      window.addEventListener('resize', resize);
    },

    /** Particle explosion at viewport coordinates. */
    burst(x, y, options) {
      const opts = { ...BURST_DEFAULTS };
      for (const [key, value] of Object.entries(options || {})) {
        if (value !== undefined) opts[key] = value;
      }
      if (!Array.isArray(opts.colors) || !opts.colors.length) opts.colors = LOVE_COLORS;
      const count = scaleCount(opts.count);
      for (let i = 0; i < count; i++) {
        const angle = opts.angle === undefined ? Math.random() * Math.PI * 2 : opts.angle + U.rand(-opts.spread, opts.spread);
        const speed = opts.speed * U.rand(0.35, 1);
        spawn({
          kind: opts.kind, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          gravity: opts.gravity, drag: 0.95, life: opts.life * U.rand(0.7, 1.2),
          size: opts.kind === 'heart' ? opts.size * U.rand(0.8, 1.3) : opts.size * U.rand(0.6, 1.2),
          color: U.pick(opts.colors), variant: opts.variant || U.pick(['red', 'pink']),
          spin: opts.kind === 'heart' ? U.rand(-3, 3) : 0, shrink: opts.kind === 'dot', glow: Boolean(opts.glow)
        });
      }
    },

    GOLD_COLORS,

    hearts(x, y, count) {
      LQ.fx.burst(x, y, { kind: 'heart', count: count || 8, size: 16, speed: 200, gravity: 180, life: 1.1 });
    },

    sparkle(x, y, count) {
      LQ.fx.burst(x, y, { kind: 'dot', count: count || 12, colors: GOLD_COLORS, speed: 180, gravity: 120, size: 3, glow: true });
    },

    confetti(count) {
      const total = scaleCount(count || 150);
      for (let i = 0; i < total; i++) {
        spawn({
          kind: 'confetti', x: U.rand(0, width), y: U.rand(-height * 0.5, -10),
          vx: U.rand(-40, 40), vy: U.rand(60, 180), gravity: 90, drag: 0.985,
          life: U.rand(2.6, 4.4), size: U.rand(7, 12), color: U.pick(CONFETTI_COLORS),
          rot: U.rand(0, Math.PI), spin: U.rand(-4, 4), flipSpeed: U.rand(4, 9), wobble: U.rand(2, 5), fade: 0.6
        });
      }
    },

    fireworks(durationMs) {
      const interval = reduced() ? 0.9 : 0.32;
      launchRocket();
      emitters.push({
        time: 0, duration: (durationMs || 4000) / 1000, next: interval,
        update: (dt, emitter) => {
          emitter.next -= dt;
          if (emitter.next <= 0) {
            emitter.next = interval * U.rand(0.6, 1.4);
            launchRocket();
          }
        }
      });
      ensureRunning();
    },

    heartRain(durationMs) {
      const interval = reduced() ? 0.4 : 0.09;
      emitters.push({
        time: 0, duration: (durationMs || 3000) / 1000, next: 0,
        update: (dt, emitter) => {
          emitter.next -= dt;
          while (emitter.next <= 0) {
            emitter.next += interval;
            spawn({
              kind: 'heart', x: U.rand(0, width), y: -20, vx: U.rand(-20, 20), vy: U.rand(60, 140),
              gravity: 30, drag: 1, life: U.rand(3, 5), size: U.rand(12, 26), variant: U.pick(['red', 'pink', 'pink', 'gold']),
              rot: U.rand(-0.4, 0.4), spin: U.rand(-0.8, 0.8), wobble: U.rand(1, 3), fade: 0.8
            });
          }
        }
      });
      ensureRunning();
    },

    /** Floating "+10" style text at viewport coordinates. */
    floatText(x, y, text, className) {
      if (!layer) return;
      const node = U.el('div', { class: `float-text ${className || ''}`, text, style: { top: `${y}px` } });
      layer.append(node);
      const half = node.offsetWidth / 2;
      node.style.left = `${U.clamp(x, half + 6, Math.max(half + 6, window.innerWidth - half - 6))}px`;
      const rise = reduced() ? -12 : -56;
      const animation = node.animate([
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -80%) scale(1.15)', opacity: 1, offset: 0.2 },
        { transform: `translate(-50%, calc(-50% + ${rise}px)) scale(1)`, opacity: 0 }
      ], { duration: 900, easing: 'cubic-bezier(.2,.8,.3,1)' });
      animation.onfinish = () => node.remove();
      animation.oncancel = () => node.remove();
    },

    shake(element, strength) {
      if (!element || reduced() || typeof element.animate !== 'function') return;
      const s = 6 * (strength || 1);
      element.animate([
        { transform: 'translate(0, 0)' },
        { transform: `translate(${-s}px, ${s * 0.4}px)` },
        { transform: `translate(${s * 0.8}px, ${-s * 0.5}px)` },
        { transform: `translate(${-s * 0.5}px, ${s * 0.3}px)` },
        { transform: `translate(${s * 0.3}px, 0)` },
        { transform: 'translate(0, 0)' }
      ], { duration: 360, easing: 'ease-out' });
    },

    flash(color) {
      if (!flashEl || reduced()) return;
      flashEl.style.background = color || 'rgba(255, 243, 224, 0.75)';
      flashEl.animate([{ opacity: 0.85 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' });
    },

    toast(options) {
      toastQueue.push(options || {});
      showNextToast();
    },

    clear() {
      particles = [];
      spawnQueue = [];
      emitters = [];
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
})(globalThis.LQ = globalThis.LQ || {});
