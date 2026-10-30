/* Love Quest · loading screen, hero selection and the story intro. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);

  const PRELOAD_IMAGES = ['assets/img/background1.jpg', 'assets/img/background2.jpg', 'assets/img/loadingscreen.jpg'];
  const MIN_LOADING_MS = 1600;
  const FONT_TIMEOUT_MS = 2500;
  const BOOT_FONTS = ['16px "Press Start 2P"', '600 16px "Quicksand"', '700 32px "Caveat"'];
  const SECRET_CLICKS = 5;
  const INTRO_BACKDROPS = ['ruins', 'castle', 'coast', 'ruins', 'coast'];
  const TYPE_SPEED = 38; // characters per second

  /** Loads images and fonts while animating the bar; never gets stuck on a failed asset. */
  function preload(scope, onProgress) {
    return new Promise((resolve) => {
      const total = PRELOAD_IMAGES.length + 1;
      let loaded = 0;
      let shown = 0;
      const startedAt = performance.now();
      const markLoaded = () => { loaded = Math.min(total, loaded + 1); };

      for (const src of PRELOAD_IMAGES) {
        const image = new Image();
        image.onload = markLoaded;
        image.onerror = () => {
          console.warn(`[LoveQuest] Could not load ${src}`);
          markLoaded();
        };
        image.src = src;
      }
      U.whenFontsReady(BOOT_FONTS, FONT_TIMEOUT_MS).then(markLoaded, markLoaded);

      const step = (now) => {
        if (scope.disposed) return;
        const timeShare = U.clamp((now - startedAt) / MIN_LOADING_MS, 0, 1);
        const target = Math.min(loaded / total, timeShare) * 100;
        shown = Math.min(target, shown + Math.max(0.4, (target - shown) * 0.18));
        if (loaded >= total && timeShare >= 1 && shown >= 99.5) {
          onProgress(100);
          resolve();
          return;
        }
        onProgress(Math.floor(shown));
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function registerBoot() {
    const el = document.getElementById('scene-boot');
    LQ.ui.scenes.register('boot', {
      el,
      ambient: true,
      enter(params, scope) {
        const fill = document.getElementById('loading-fill');
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        const startButton = document.getElementById('start-btn');
        const title = document.getElementById('boot-title');
        let secretClicks = 0;
        let started = false;

        startButton.hidden = true;
        text.textContent = t('boot.hint');

        scope.on(title, 'click', (event) => {
          secretClicks++;
          LQ.audio.play('click');
          if (secretClicks !== SECRET_CLICKS) return;
          text.textContent = t('boot.cheat');
          LQ.fx.hearts(event.clientX, event.clientY, 16);
          LQ.audio.play('correct');
          LQ.achievements.unlock('cheatCode');
        });

        preload(scope, (percent) => {
          fill.style.width = `${percent}%`;
          bar.setAttribute('aria-valuenow', String(percent));
        }).then(() => {
          if (scope.disposed) return;
          if (secretClicks < SECRET_CLICKS) text.textContent = t('boot.ready');
          startButton.hidden = false;
          startButton.focus({ preventScroll: true });
        });

        scope.on(startButton, 'click', (event) => {
          if (started) return;
          started = true;
          LQ.audio.unlock();
          LQ.audio.startMusic();
          LQ.audio.play('select');
          LQ.fx.sparkle(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, 18);
          LQ.app.continueFromBoot();
        });
      }
    });
  }

  function registerSelect() {
    const el = document.getElementById('scene-select');
    LQ.ui.scenes.register('select', {
      el,
      ambient: true,
      enter(params, scope) {
        const save = LQ.store.data;
        const grid = document.getElementById('hero-grid');
        const nameInput = document.getElementById('hero-name');
        const goButton = document.getElementById('select-go');
        let selected = save.hero.chosen ? save.hero.avatar : 0;
        const cards = [];

        grid.textContent = '';
        LQ.sprites.AVATARS.forEach((avatar, index) => {
          const view = LQ.sprites.createView(16, 16, 5);
          const card = U.el('button', {
            type: 'button',
            class: 'hero-card',
            attrs: { role: 'radio', 'aria-label': t(avatar.nameKey) }
          }, [
            U.el('span', { class: 'hero-card__stage' }, view),
            U.el('span', { class: 'hero-card__name', text: t(avatar.nameKey) })
          ]);
          scope.on(card, 'click', () => choose(index, true));
          cards.push({ card, view });
          grid.append(card);
        });

        function choose(index, withSound) {
          selected = (index + cards.length) % cards.length;
          cards.forEach(({ card }, i) => {
            const active = i === selected;
            card.setAttribute('aria-checked', String(active));
            card.tabIndex = active ? 0 : -1;
          });
          if (withSound) LQ.audio.play('select');
        }

        scope.on(grid, 'keydown', (event) => {
          const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
          if (!delta) return;
          event.preventDefault();
          choose(selected + delta, true);
          cards[selected].card.focus();
        });

        nameInput.value = save.hero.name || LQ.content.heroName;

        /*
         * Like maxlength, but counted in visible characters (an emoji is one): the overflow is dropped from
         * the text just typed or pasted, the rest of the name stays. Nothing is cut while an IME composes;
         * its commit is cut where the committed text ends. That is not always the caret (on Android the
         * player may have tapped elsewhere first), nor always the last composing position (some browsers
         * replace the composition when committing), so the committed text is located from where it started.
         */
        let compositionStart = null;
        let composedEnd = null;

        function committedEnd(event) {
          const data = typeof event.data === 'string' ? event.data : '';
          const start = compositionStart;
          if (start !== null && nameInput.value.slice(start, start + data.length) === data) return start + data.length;
          return composedEnd;
        }

        const clampName = (event) => {
          if (event.isComposing) {
            composedEnd = nameInput.selectionEnd;
            return;
          }
          const tracked = event.type === 'compositionend' ? committedEnd(event) : null;
          compositionStart = null;
          composedEnd = null;
          const value = nameInput.value;
          const extra = U.graphemes(value).length - LQ.store.NAME_MAX;
          if (extra <= 0) return;
          const live = nameInput.selectionEnd === null ? value.length : nameInput.selectionEnd;
          const cut = Math.min(value.length, tracked === null ? live : tracked);
          const head = U.graphemes(value.slice(0, cut));
          const kept = head.slice(0, Math.max(0, head.length - extra)).join('');
          const next = U.truncate(kept + value.slice(cut), LQ.store.NAME_MAX);
          /* The caret stays where it was, shifted left by whatever was removed before it. */
          const caret = Math.min(next.length, live <= kept.length ? live : Math.max(kept.length, live - (cut - kept.length)));
          nameInput.value = next;
          nameInput.setSelectionRange(caret, caret);
        };
        scope.on(nameInput, 'compositionstart', () => {
          compositionStart = nameInput.selectionStart;
          composedEnd = null;
        });
        scope.on(nameInput, 'input', clampName);
        scope.on(nameInput, 'compositionend', clampName);

        let starting = false;
        const start = () => {
          if (starting) return;
          starting = true;
          const name = U.truncate(nameInput.value.trim(), LQ.store.NAME_MAX).trimEnd() || LQ.content.heroName;
          save.hero = { name, avatar: selected, chosen: true };
          LQ.store.save();
          LQ.audio.play('powerup');
          LQ.ui.scenes.show(save.introSeen ? 'map' : 'intro');
        };
        scope.on(goButton, 'click', start);
        scope.on(nameInput, 'keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            start();
          }
        });

        choose(selected, false);

        let lastFrame = -1;
        U.createLoop(scope, (dt, now) => {
          const frame = Math.floor(now / 125);
          if (frame === lastFrame) return;
          lastFrame = frame;
          cards.forEach(({ view }, index) => {
            const walking = index === selected;
            const step = walking ? [1, 0, 2, 0][frame % 4] : 0;
            const dir = walking ? 'down' : ['down', 'left', 'down', 'right'][Math.floor((now / 1600 + index) % 4)];
            view.show(LQ.sprites.hero(index, dir, step));
          });
        }).start();
      }
    });
  }

  function registerIntro() {
    const el = document.getElementById('scene-intro');
    LQ.ui.scenes.register('intro', {
      el,
      ambient: false,
      enter(params, scope) {
        const save = LQ.store.data;
        const box = document.getElementById('intro-box');
        const textEl = document.getElementById('intro-text');
        const skip = document.getElementById('intro-skip');
        const portrait = document.getElementById('intro-portrait');
        const lines = LQ.i18n.list('intro.lines', { name: LQ.app.heroName() });

        textEl.setAttribute('aria-hidden', 'true');
        const live = U.el('p', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
        box.append(live);
        scope.add(() => live.remove());

        const layers = [U.el('div', { class: 'intro-layer' }), U.el('div', { class: 'intro-layer' })];
        el.prepend(...layers);
        scope.add(() => layers.forEach((layer) => layer.remove()));
        let activeLayer = 0;

        const view = LQ.sprites.createView(16, 16, 4);
        portrait.textContent = '';
        portrait.append(view);

        let index = -1;
        let full = '';
        let chars = [];
        let shown = '';
        let typed = 0;
        let typing = false;
        let finished = false;

        function setBackdrop(name) {
          const next = layers[1 - activeLayer];
          next.className = `intro-layer backdrop--${name}`;
          next.classList.add('is-visible');
          layers[activeLayer].classList.remove('is-visible');
          activeLayer = 1 - activeLayer;
        }

        function showLine(lineIndex) {
          index = lineIndex;
          full = lines[index];
          chars = U.graphemes(full);
          shown = '';
          typed = 0;
          typing = true;
          textEl.textContent = '';
          live.textContent = full;
          setBackdrop(INTRO_BACKDROPS[index % INTRO_BACKDROPS.length]);
        }

        function finish() {
          if (finished) return;
          finished = true;
          save.introSeen = true;
          LQ.store.save();
          LQ.ui.scenes.show('map', { fromIntro: true });
        }

        function advance() {
          if (finished) return;
          if (typing) {
            typing = false;
            textEl.textContent = full;
            return;
          }
          LQ.audio.play('click');
          if (index < lines.length - 1) showLine(index + 1);
          else finish();
        }

        scope.on(box, 'click', advance);
        scope.on(box, 'keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            advance();
          }
        });
        scope.on(skip, 'click', () => {
          LQ.audio.play('click');
          finish();
        });

        let typeBudget = 0;
        U.createLoop(scope, (dt, now) => {
          view.show(LQ.sprites.hero(save.hero.avatar, 'down', typing ? LQ.sprites.walkStep(now / 1000) : 0));
          if (!typing) return;
          typeBudget += dt * TYPE_SPEED;
          let changed = false;
          while (typeBudget >= 1 && typed < chars.length) {
            typeBudget -= 1;
            const char = chars[typed++];
            shown += char;
            changed = true;
            if (typed % 3 === 0 && char.trim()) LQ.audio.play('type');
          }
          if (changed) textEl.textContent = shown;
          if (typed >= chars.length) typing = false;
        }).start();

        showLine(0);
        box.focus({ preventScroll: true });
      }
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.screens = {
    init() {
      registerBoot();
      registerSelect();
      registerIntro();
    }
  };
})(globalThis.LQ = globalThis.LQ || {});
