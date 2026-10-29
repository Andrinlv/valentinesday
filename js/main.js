/* Love Quest · bootstrap: wires scenes, settings, the trial session API and global shortcuts. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
  const PLAYTIME_SAVE_INTERVAL_MS = 15000;
  const BACKDROPS = ['ruins', 'castle', 'coast', 'maze'];

  let session = null;

  function parseDebugFlags() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('debug')) return null;
    console.info('[LoveQuest] Debug mode is on.');
    return { unlockAll: params.has('unlock'), session: null };
  }

  /* ---------- app ---------- */

  const app = {
    get session() {
      return session;
    },

    heroName() {
      return LQ.store.data.hero.name || LQ.content.heroName;
    },

    continueFromBoot() {
      const save = LQ.store.data;
      if (!save.hero.chosen) LQ.ui.scenes.show('select');
      else if (!save.introSeen) LQ.ui.scenes.show('intro');
      else LQ.ui.scenes.show('map', { welcome: true });
    },

    startLevel(levelId) {
      LQ.ui.modal.closeAll();
      LQ.ui.scenes.show('game', { levelId });
    },

    showMap(params) {
      LQ.ui.modal.closeAll();
      LQ.ui.scenes.show('map', params || {});
    },

    pause() {
      const state = session;
      if (!state || state.paused || state.finished || LQ.ui.scenes.current !== 'game') return;
      if (LQ.ui.modal.isOpen() || LQ.ui.scenes.transitioning) return;
      state.paused = true;
      state.pauseHandlers.forEach((handler) => handler());
      LQ.audio.play('click');
      state.pauseDialog = LQ.ui.menus.openPause({
        onResume: () => app.resume(),
        onRestart: () => app.startLevel(state.levelId),
        onQuit: () => app.showMap()
      });
    },

    /** Opens the pause menu, or closes it again (= resume) when it is showing. */
    togglePause() {
      const state = session;
      if (state && state.paused && state.pauseDialog && state.pauseDialog.isOpen) state.pauseDialog.close('toggle');
      else app.pause();
    },

    resume() {
      const state = session;
      if (!state || !state.paused) return;
      state.paused = false;
      state.resumeHandlers.forEach((handler) => handler());
    },

    applySettings() {
      const settings = LQ.store.data.settings;
      LQ.audio.setMusicEnabled(settings.music);
      LQ.audio.setSfxEnabled(settings.sfx);
      document.body.classList.toggle('crt-on', settings.crt);
    },

    updateSetting(key, value) {
      const settings = LQ.store.data.settings;
      if (!Object.prototype.hasOwnProperty.call(settings, key)) return;
      settings[key] = value;
      LQ.store.save();
      if (key === 'lang') {
        LQ.i18n.setLang(value);
        LQ.events.emit('language');
      }
      app.applySettings();
    },

    resetProgress() {
      LQ.store.resetProgress();
      LQ.events.emit('progress');
      LQ.fx.toast({ icon: '🌱', title: t('settings.resetDone') });
      LQ.ui.scenes.show('select');
    }
  };

  /* ---------- trial sessions ---------- */

  function createGameApi(state) {
    const { scope, root, levelId } = state;

    return {
      levelId,
      scope,
      root,
      content: LQ.content,
      t,
      utils: U,
      audio: LQ.audio,
      fx: LQ.fx,
      sprites: LQ.sprites,
      hud: LQ.ui.hud,
      input: LQ.input,
      hero: Object.freeze({ name: app.heroName(), avatar: LQ.store.data.hero.avatar }),
      isTouch: U.isCoarsePointer(),

      get paused() {
        return state.paused;
      },
      get finished() {
        return state.finished;
      },

      onPause(handler) {
        state.pauseHandlers.add(handler);
      },
      onResume(handler) {
        state.resumeHandlers.add(handler);
      },

      /** Runs fn now, or right after the player resumes when the trial is paused. */
      whenActive(fn) {
        if (!state.paused) {
          fn();
          return;
        }
        const once = () => {
          state.resumeHandlers.delete(once);
          fn();
        };
        state.resumeHandlers.add(once);
      },

      /** Frame loop; update(dt) is skipped while paused, render() always runs (keeps resizes crisp). */
      loop(update, render) {
        return U.createLoop(scope, (dt, now) => {
          if (!state.paused) update(dt, now);
          if (render) render(now);
        });
      },

      /** 3 · 2 · 1 · GO! Resolves when done; waits while paused. */
      countdown() {
        return new Promise((resolve) => {
          const el = U.el('div', { class: 'countdown', attrs: { 'aria-live': 'assertive' } });
          root.append(el);
          const steps = ['3', '2', '1', t('common.go')];
          let index = 0;
          const next = () => {
            if (state.paused) {
              scope.timeout(next, 200);
              return;
            }
            if (index >= steps.length) {
              el.remove();
              resolve();
              return;
            }
            el.textContent = steps[index];
            el.classList.remove('is-pop');
            void el.offsetWidth;
            el.classList.add('is-pop');
            LQ.audio.play(index === steps.length - 1 ? 'go' : 'beep');
            index++;
            scope.timeout(next, index === steps.length ? 520 : 640);
          };
          next();
        });
      },

      /** A large centred message inside the trial; a newer banner replaces the current one. */
      banner(text, options) {
        const opts = Object.assign({ duration: 1500, tone: '', sub: '' }, options);
        const el = U.el('div', { class: `game-banner${opts.tone ? ` game-banner--${opts.tone}` : ''}`, attrs: { role: 'status' } }, [
          U.el('span', { class: 'game-banner__text', text }),
          opts.sub ? U.el('span', { class: 'game-banner__sub', text: opts.sub }) : null
        ]);
        if (state.banner) state.banner.remove();
        state.banner = el;
        root.append(el);
        if (opts.duration > 0) {
          scope.timeout(() => {
            el.classList.add('is-leaving');
            scope.timeout(() => {
              el.remove();
              if (state.banner === el) state.banner = null;
            }, 400);
          }, opts.duration);
        }
        return el;
      },

      achieve(id) {
        return LQ.achievements.unlock(id);
      },

      /**
       * Ends the trial immediately (pausing or quitting is no longer possible) and shows the
       * results after result.delay ms, unless result.silent.
       */
      finish(result) {
        if (state.finished) return null;
        state.finished = true;
        const outcome = LQ.progress.applyResult(levelId, result);
        if (result.silent) return outcome;
        LQ.audio.play('win');
        LQ.audio.duck(2200);
        scope.timeout(() => {
          LQ.ui.results.show(outcome, {
            onRetry: () => app.startLevel(levelId),
            onMap: () => app.showMap({ walkFrom: outcome.firstClear ? levelId : null })
          });
        }, result.delay === undefined ? 700 : result.delay);
        return outcome;
      },

      exit() {
        app.showMap();
      },

      pause() {
        app.pause();
      },

      togglePause() {
        app.togglePause();
      }
    };
  }

  function mountLevel(levelId, scope) {
    const meta = LQ.progress.levelMeta(levelId);
    const game = LQ.games && LQ.games[levelId];
    if (!meta || !game || !LQ.progress.isUnlocked(levelId)) {
      console.error(`[LoveQuest] Trial "${levelId}" is not available.`);
      scope.timeout(() => app.showMap(), 0);
      return;
    }
    const sceneEl = document.getElementById('scene-game');
    BACKDROPS.forEach((name) => sceneEl.classList.remove(`backdrop--${name}`));
    sceneEl.classList.add(`backdrop--${meta.backdrop}`);
    sceneEl.dataset.level = levelId;

    const root = document.getElementById('game-root');
    root.textContent = '';
    root.className = `game-root game-root--${levelId}`;
    LQ.ui.hud.setTitle(t(`level.${levelId}.title`));
    LQ.ui.hud.setStats([]);

    const state = {
      levelId,
      scope,
      root,
      paused: false,
      finished: false,
      pauseHandlers: new Set(),
      resumeHandlers: new Set(),
      banner: null,
      pauseDialog: null,
      instance: null
    };
    session = state;
    scope.add(() => {
      if (session === state) session = null;
      root.textContent = '';
    });
    state.instance = game.create(root, createGameApi(state));
    if (LQ.debug) LQ.debug.session = state;
  }

  /* ---------- global behaviour ---------- */

  function buildAmbient() {
    const root = document.getElementById('ambient');
    root.textContent = '';
    for (let i = 0; i < 16; i++) {
      const isHeart = i % 4 === 0;
      const particle = U.el('span', { class: isHeart ? 'ambient__heart' : 'ambient__mote', text: isHeart ? '❤' : '' });
      particle.style.left = `${U.rand(2, 98)}%`;
      particle.style.animationDuration = `${U.rand(10, 20)}s`;
      particle.style.animationDelay = `${-U.rand(0, 20)}s`;
      particle.style.setProperty('--drift', `${U.rand(-50, 50)}px`);
      particle.style.setProperty('--size', `${U.rand(3, 7)}px`);
      root.append(particle);
    }
  }

  /** What the map shows: hero, trial progress, tokens and coupons (settings and play time are left out). */
  function progressSnapshot() {
    const save = LQ.store.data;
    return JSON.stringify([save.hero, save.introSeen, save.levels, save.tokens, save.coupons, save.finalCoupon, save.achievements]);
  }

  function wireGlobalListeners() {
    /* Browsers only allow audio after a user gesture; on touch screens that is pointerup/touchend. */
    const unlockAudio = () => LQ.audio.unlock();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
      document.addEventListener(type, unlockAudio, { passive: true });
    }

    /* A trial that is still fading in cannot pause yet: keep trying until it can (or the tab returns). */
    let pauseRetry = 0;
    const pauseWhileHidden = () => {
      clearTimeout(pauseRetry);
      if (!document.hidden) return;
      app.pause();
      if (LQ.ui.scenes.transitioning) pauseRetry = setTimeout(pauseWhileHidden, 250);
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      pauseWhileHidden();
      LQ.store.save();
    });
    window.addEventListener('pagehide', () => LQ.store.save());

    /* Another tab saved newer progress: adopt it so this tab never overwrites it with stale data. */
    window.addEventListener('storage', (event) => {
      if (event.key !== LQ.store.KEY || event.storageArea !== globalThis.localStorage) return;
      const before = progressSnapshot();
      LQ.store.load();
      const lang = LQ.store.data.settings.lang || LQ.content.language;
      if (lang !== LQ.i18n.lang) {
        LQ.i18n.setLang(lang);
        LQ.events.emit('language');
      }
      app.applySettings();
      LQ.events.emit('progress');
      /* Redraw the map for new progress, but never yank away a dialog or a running transition. */
      const changed = progressSnapshot() !== before;
      if (changed && LQ.ui.scenes.current === 'map' && !LQ.ui.modal.isOpen() && !LQ.ui.scenes.transitioning) {
        LQ.ui.scenes.show('map', {}, { transition: false });
      }
    });

    document.getElementById('hud-pause').addEventListener('click', () => app.pause());

    const recentKeys = [];
    window.addEventListener('keydown', (event) => {
      recentKeys.push(event.code);
      if (recentKeys.length > KONAMI.length) recentKeys.shift();
      if (recentKeys.length === KONAMI.length && recentKeys.every((code, i) => code === KONAMI[i])) {
        recentKeys.length = 0;
        if (LQ.achievements.unlock('konami')) LQ.fx.toast({ icon: '👾', title: t('toast.konami') });
        app.updateSetting('crt', true);
        LQ.fx.confetti(80);
      }
      if ((event.code === 'Escape' || event.code === 'KeyP') && !event.repeat &&
        LQ.ui.scenes.current === 'game' && !LQ.ui.modal.isOpen()) {
        const target = event.target;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        event.preventDefault();
        app.pause();
      }
    });

    let lastTick = performance.now();
    let unsavedMs = 0;
    setInterval(() => {
      const now = performance.now();
      const delta = Math.min(5000, now - lastTick);
      lastTick = now;
      if (document.hidden || LQ.ui.scenes.current === 'boot') return;
      LQ.store.data.stats.playTimeMs += delta;
      unsavedMs += delta;
      if (unsavedMs >= PLAYTIME_SAVE_INTERVAL_MS) {
        unsavedMs = 0;
        LQ.store.save();
      }
    }, 1000);
  }

  function registerGameScene() {
    LQ.ui.scenes.register('game', {
      el: document.getElementById('scene-game'),
      ambient: false,
      enter(params, scope) {
        mountLevel(params.levelId, scope);
      },
      exit() {
        LQ.ui.hud.clear();
      }
    });
  }

  function showFatalError(err) {
    console.error('[LoveQuest] Startup failed:', err);
    const message = document.createElement('div');
    message.className = 'noscript';
    message.textContent = 'Oh no, something went wrong while loading the game. Please reload the page. ❤️';
    document.body.append(message);
  }

  function boot() {
    try {
      LQ.debug = parseDebugFlags();
      LQ.store.load();
      LQ.i18n.setLang(LQ.store.data.settings.lang || LQ.content.language);
      LQ.audio.init(document.getElementById('bg-music'));
      LQ.fx.init();
      LQ.ui.scenes.init();
      LQ.ui.hud.init();
      LQ.ui.screens.init();
      LQ.ui.map.init();
      registerGameScene();
      app.applySettings();
      buildAmbient();
      wireGlobalListeners();
      LQ.ui.scenes.show('boot');
    } catch (err) {
      showFatalError(err);
    }
  }

  LQ.app = app;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(globalThis.LQ = globalThis.LQ || {});
