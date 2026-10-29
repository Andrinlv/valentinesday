/* Love Quest · scene manager with a cozy retro iris-wipe transition. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const WIPE_SAFETY_MS = 1200;

  const registry = new Map();
  let current = null;
  let transitioning = false;
  let inFlightKey = null;
  let queued = null;
  let wipeEl = null;
  let holeEl = null;
  let heartEl = null;

  function maxRadius() {
    return Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) + 40;
  }

  /** Runs one half of the iris wipe. Always resolves, even if animations are throttled. */
  function wipe(direction) {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (direction === 'open') {
          wipeEl.classList.remove('is-active');
          if (typeof wipeEl.getAnimations === 'function') {
            wipeEl.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
          }
        }
        resolve();
      };
      wipeEl.classList.add('is-active');
      const closing = direction === 'close';
      let animation;
      if (U.prefersReducedMotion()) {
        holeEl.style.width = '0px';
        holeEl.style.height = '0px';
        animation = wipeEl.animate(closing ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
          { duration: 160, fill: 'forwards' });
      } else {
        holeEl.style.width = '';
        holeEl.style.height = '';
        const big = `${maxRadius()}px`;
        animation = holeEl.animate(
          closing
            ? [{ width: big, height: big }, { width: '0px', height: '0px' }]
            : [{ width: '0px', height: '0px' }, { width: big, height: big }],
          { duration: closing ? 360 : 420, easing: closing ? 'cubic-bezier(.55,0,.8,.3)' : 'cubic-bezier(.2,.75,.4,1)', fill: 'forwards' }
        );
        if (closing) {
          heartEl.animate([
            { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
            { transform: 'translate(-50%, -50%) scale(1.25)', opacity: 1, offset: 0.7 },
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
          ], { duration: 360, delay: 200, fill: 'forwards' });
        } else {
          heartEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
        }
      }
      animation.onfinish = done;
      animation.oncancel = done;
      setTimeout(done, WIPE_SAFETY_MS);
    });
  }

  const requestKey = (name, params) => `${name}|${JSON.stringify(params || {})}`;

  /** While the old scene fades out it must not receive keyboard, pointer or focus input. */
  function setInert(on) {
    for (const id of ['app', 'modal-root']) {
      const el = document.getElementById(id);
      if (el) el.inert = on;
    }
    const active = document.activeElement;
    if (on && active && active !== document.body && typeof active.blur === 'function') active.blur();
  }

  function activate(name, params) {
    const next = registry.get(name);
    if (!next) throw new Error(`Unknown scene "${name}"`);
    if (LQ.ui.modal) LQ.ui.modal.closeAll();
    if (current) {
      current.scope.dispose();
      if (current.def.exit) current.def.exit();
      current.def.el.classList.remove('is-active');
    }
    const scope = U.createScope();
    current = { name, def: next, scope };
    next.el.classList.add('is-active');
    document.body.dataset.scene = name;
    const ambient = document.getElementById('ambient');
    if (ambient) ambient.hidden = !next.ambient;
    if (next.enter) next.enter(params || {}, scope);
  }

  const scenes = {
    init() {
      wipeEl = document.getElementById('wipe');
      holeEl = wipeEl.querySelector('.wipe__hole');
      heartEl = wipeEl.querySelector('.wipe__heart');
      const heart = LQ.sprites.item('heart', 'red');
      heartEl.style.backgroundImage = `url(${heart.toDataURL()})`;
    },

    /** def: { el, enter(params, scope), exit(), ambient } */
    register(name, def) {
      registry.set(name, def);
    },

    get current() {
      return current ? current.name : null;
    },

    get transitioning() {
      return transitioning;
    },

    /** Shows a scene. Re-showing the current scene restarts it; a repeated in-flight request is ignored. */
    async show(name, params, options) {
      const opts = options || {};
      const key = requestKey(name, params);
      if (transitioning) {
        if (key !== inFlightKey) queued = [name, params, opts];
        return;
      }
      if (opts.transition === false || !current) {
        activate(name, params);
        return;
      }
      transitioning = true;
      inFlightKey = key;
      setInert(true);
      try {
        if (LQ.audio) LQ.audio.play('whoosh');
        await wipe('close');
        setInert(false);
        activate(name, params);
      } catch (err) {
        console.error(`[LoveQuest] Could not open scene "${name}":`, err);
      } finally {
        setInert(false);
        await wipe('open');
        transitioning = false;
        inFlightKey = null;
        if (queued) {
          const [queuedName, queuedParams, queuedOptions] = queued;
          queued = null;
          scenes.show(queuedName, queuedParams, queuedOptions);
        }
      }
    }
  };

  LQ.ui = LQ.ui || {};
  LQ.ui.scenes = scenes;
})(globalThis.LQ = globalThis.LQ || {});
