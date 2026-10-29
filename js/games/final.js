/* Love Quest · the finale: the question, the runaway NO button, the letter and a love certificate. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const QUESTION_SPEED = 24; // characters per second
  const LETTER_SPEED = 32;
  const PERSISTENT_ATTEMPTS = 10;
  const DODGE_DEBOUNCE_MS = 250;
  const CERT_WIDTH = 1200;
  const CERT_HEIGHT = 850;

  function formatPlayTime(ms) {
    const minutes = Math.max(1, Math.round(ms / 60000));
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
  }

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const loading = Promise.all([
      document.fonts.load('28px "Press Start 2P"'),
      document.fonts.load('700 64px "Caveat"'),
      document.fonts.load('700 26px "Quicksand"')
    ]).catch(() => undefined);
    return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, 2500))]);
  }

  /** Draws the certificate as a 1200×850 PNG canvas. */
  async function drawCertificate(heroAvatar, heroName) {
    await loadFonts();
    const t = LQ.t;
    const canvas = document.createElement('canvas');
    canvas.width = CERT_WIDTH;
    canvas.height = CERT_HEIGHT;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;

    g.fillStyle = '#f7e7c9';
    g.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);
    const glow = g.createRadialGradient(CERT_WIDTH / 2, CERT_HEIGHT / 2, 100, CERT_WIDTH / 2, CERT_HEIGHT / 2, 700);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    glow.addColorStop(1, 'rgba(181, 140, 90, 0.25)');
    g.fillStyle = glow;
    g.fillRect(0, 0, CERT_WIDTH, CERT_HEIGHT);

    g.strokeStyle = '#9c3650';
    g.lineWidth = 12;
    g.strokeRect(28, 28, CERT_WIDTH - 56, CERT_HEIGHT - 56);
    g.strokeStyle = '#f2c35b';
    g.lineWidth = 4;
    g.strokeRect(48, 48, CERT_WIDTH - 96, CERT_HEIGHT - 96);

    const heart = LQ.sprites.item('heart', 'red');
    for (const [x, y] of [[44, 44], [CERT_WIDTH - 44, 44], [44, CERT_HEIGHT - 44], [CERT_WIDTH - 44, CERT_HEIGHT - 44]]) {
      g.drawImage(heart, x - 33, y - 30, 66, 60);
    }

    g.textAlign = 'center';
    g.fillStyle = '#9c3650';
    g.font = '40px "Press Start 2P", monospace';
    g.fillText(t('cert.title'), CERT_WIDTH / 2, 150);

    const hero = LQ.sprites.hero(heroAvatar, 'right', 0);
    const beloved = LQ.sprites.hero(LQ.content.belovedAvatar, 'left', 0);
    g.drawImage(hero, CERT_WIDTH / 2 - 250, 200, 160, 160);
    g.drawImage(beloved, CERT_WIDTH / 2 + 90, 200, 160, 160);
    g.drawImage(heart, CERT_WIDTH / 2 - 55, 240, 110, 100);

    g.fillStyle = '#3b2326';
    g.font = '700 74px "Caveat", cursive';
    g.fillText(t('cert.line', { hero: heroName, beloved: LQ.content.belovedName }), CERT_WIDTH / 2, 470, CERT_WIDTH - 160);

    const love = LQ.progress.loveLevel();
    g.font = '700 30px "Quicksand", sans-serif';
    g.fillStyle = '#6b4a45';
    g.fillText(t('cert.stats', {
      stars: `${LQ.progress.totalStars()}/${LQ.progress.maxStars()}`,
      lp: U.formatNumber(LQ.progress.totalLP())
    }), CERT_WIDTH / 2, 545);
    g.fillText(t('cert.level', { n: love.level, title: love.title }), CERT_WIDTH / 2, 590);

    const date = new Date().toLocaleDateString(LQ.i18n.locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    g.font = '700 46px "Caveat", cursive';
    g.fillStyle = '#9c3650';
    g.fillText(date, CERT_WIDTH / 2, 670);

    g.font = '18px "Press Start 2P", monospace';
    g.fillStyle = '#6b4a45';
    g.fillText(t('cert.footer'), CERT_WIDTH / 2, 750);
    return canvas;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = U.el('a', { href: url, download: fileName });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function saveCertificate(api) {
    const canvas = await drawCertificate(api.hero.avatar, api.hero.name);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The certificate image could not be created.');
    const fileName = LQ.t('cert.fileName');
    const file = typeof File === 'function' ? new File([blob], fileName, { type: 'image/png' }) : null;
    if (api.isTouch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: LQ.t('cert.title'), text: LQ.t('cert.shareText') });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    downloadBlob(blob, fileName);
  }

  function create(root, api) {
    const { scope, t, fx, audio, hud } = api;
    const save = LQ.store.data;
    const state = { phase: 'intro', noAttempts: 0, lastDodge: 0, typed: 0, typeBudget: 0, typingTarget: null, onTyped: null };

    hud.setStats([]);

    const heroView = LQ.sprites.createView(16, 16, 6);
    const belovedView = LQ.sprites.createView(16, 16, 6);
    heroView.show(LQ.sprites.hero(api.hero.avatar, 'right', 0));
    belovedView.show(LQ.sprites.hero(api.content.belovedAvatar, 'left', 0));
    const heartView = LQ.sprites.createView(11, 10, 4);
    heartView.show(LQ.sprites.item('heart', 'red'));

    const greeting = U.el('p', { class: 'final-bubble__greeting', text: t('final.greeting', { name: api.hero.name }) });
    const questionEl = U.el('p', { class: 'final-bubble__question', attrs: { 'aria-hidden': 'true' } });
    const questionLive = U.el('p', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
    const bubble = U.el('div', { class: 'final-bubble paper' }, [greeting, questionEl, questionLive]);
    const couple = U.el('div', { class: 'final-couple' }, [
      U.el('span', { class: 'final-couple__hero' }, heroView),
      U.el('span', { class: 'final-couple__heart' }, heartView),
      U.el('span', { class: 'final-couple__beloved' }, belovedView)
    ]);
    const yesButton = U.el('button', { type: 'button', class: 'btn btn--primary final-yes', text: t('final.yes') });
    const noButton = U.el('button', { type: 'button', class: 'btn btn--ghost final-no', text: LQ.i18n.list('final.noPhrases')[0] });
    const answers = U.el('div', { class: 'final-answers', hidden: true }, [yesButton, noButton]);
    const title = U.el('h3', { class: 'final-title pixel-title', text: t('final.title') });
    const stage = U.el('div', { class: 'final-stage' }, [title, bubble, couple, answers]);
    const panel = U.el('div', { class: 'final-panel', hidden: true });
    root.append(U.el('div', { class: 'final' }, [stage, panel]));

    /* ---------- typewriter (shared by question and letter) ---------- */

    function typeInto(element, text, speed, onDone) {
      state.typingTarget = { element, text, speed };
      state.typed = 0;
      state.typeBudget = 0;
      state.onTyped = onDone;
      element.textContent = '';
    }

    function completeTyping() {
      const target = state.typingTarget;
      if (!target) return;
      target.element.textContent = target.text;
      state.typingTarget = null;
      const done = state.onTyped;
      state.onTyped = null;
      if (done) done();
    }

    api.loop((dt) => {
      const target = state.typingTarget;
      if (!target) return;
      state.typeBudget += dt * target.speed;
      let changed = false;
      while (state.typeBudget >= 1 && state.typed < target.text.length) {
        state.typeBudget -= 1;
        state.typed++;
        changed = true;
        if (state.typed % 3 === 0 && target.text[state.typed - 1] !== ' ') audio.play('type');
      }
      if (changed) target.element.textContent = target.text.slice(0, state.typed);
      if (state.typed >= target.text.length) completeTyping();
    }).start();

    /* ---------- the question ---------- */

    /** Finds a free spot for the runaway button: never on YES, preferably not on the bubble or the couple. */
    function placeNoButton() {
      const stageRect = stage.getBoundingClientRect();
      const width = noButton.offsetWidth;
      const height = noButton.offsetHeight;
      const maxX = Math.max(8, stageRect.width - width - 8);
      const maxY = Math.max(8, stageRect.height - height - 8);
      const overlaps = (x, y, rect) => {
        const left = stageRect.left + x;
        const top = stageRect.top + y;
        return left < rect.right + 12 && left + width > rect.left - 12 && top < rect.bottom + 12 && top + height > rect.top - 12;
      };
      const yesRect = yesButton.getBoundingClientRect();
      const decor = [title, bubble, couple].map((el) => el.getBoundingClientRect());
      let spot = null;
      let fallback = null;
      for (let attempt = 0; attempt < 60 && !spot; attempt++) {
        const x = U.rand(8, maxX);
        const y = U.rand(8, maxY);
        if (overlaps(x, y, yesRect)) continue;
        if (!fallback) fallback = { x, y };
        if (!decor.some((rect) => overlaps(x, y, rect))) spot = { x, y };
      }
      const target = spot || fallback || { x: 8, y: 8 };
      noButton.classList.add('is-loose');
      noButton.style.left = `${Math.round(target.x + stage.scrollLeft)}px`;
      noButton.style.top = `${Math.round(target.y + stage.scrollTop)}px`;
    }

    function dodge(event) {
      if (state.phase !== 'ask' || noButton.classList.contains('is-yes')) return;
      if (event && event.cancelable) event.preventDefault();
      const now = performance.now();
      if (now - state.lastDodge < DODGE_DEBOUNCE_MS) return;
      state.lastDodge = now;
      state.noAttempts++;
      save.stats.noAttempts++;
      audio.play('dodge');
      const phrases = LQ.i18n.list('final.noPhrases');
      if (state.noAttempts >= phrases.length) {
        noButton.textContent = t('final.yes');
        noButton.classList.remove('btn--ghost', 'is-loose');
        noButton.classList.add('btn--primary', 'is-yes');
        noButton.style.left = '';
        noButton.style.top = '';
      } else {
        noButton.textContent = phrases[state.noAttempts];
        placeNoButton();
      }
      yesButton.style.setProperty('--grow', String(Math.min(2.1, 1 + state.noAttempts * 0.1)));
      if (state.noAttempts === PERSISTENT_ATTEMPTS) api.achieve('persistent');
      if (event && event.type === 'click') yesButton.focus({ preventScroll: true });
    }

    scope.on(noButton, 'pointerenter', (event) => {
      if (event.pointerType === 'mouse') dodge(event);
    });
    scope.on(noButton, 'pointerdown', dodge);
    scope.on(noButton, 'click', (event) => {
      if (noButton.classList.contains('is-yes')) accept();
      else dodge(event);
    });
    scope.on(yesButton, 'click', accept);

    function showStats() {
      const love = LQ.progress.loveLevel();
      const coupons = save.coupons.filter((index) => index < api.content.coupons.length).length + (save.finalCoupon ? 1 : 0);
      const stat = (icon, label, value) => U.el('li', { class: 'final-stat' }, [
        U.el('span', { class: 'final-stat__icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
        U.el('span', { class: 'final-stat__label', text: label }),
        U.el('strong', { class: 'final-stat__value', text: value })
      ]);
      const certificateButton = U.el('button', { type: 'button', class: 'btn btn--gold' }, [
        U.el('span', { text: '📜', attrs: { 'aria-hidden': 'true' } }), U.el('span', { text: t('final.certificate') })
      ]);
      const couponsButton = U.el('button', { type: 'button', class: 'btn btn--ghost' }, [
        U.el('span', { text: '🎁', attrs: { 'aria-hidden': 'true' } }), U.el('span', { text: t('final.coupons') })
      ]);
      const mapButton = U.el('button', { type: 'button', class: 'btn btn--primary' }, [
        U.el('span', { text: '🗺️', attrs: { 'aria-hidden': 'true' } }), U.el('span', { text: t('final.toMap') })
      ]);
      scope.on(certificateButton, 'click', async () => {
        audio.play('click');
        certificateButton.disabled = true;
        try {
          await saveCertificate(api);
        } catch (err) {
          console.error('[LoveQuest] Certificate failed:', err);
        } finally {
          certificateButton.disabled = false;
        }
      });
      scope.on(couponsButton, 'click', () => {
        audio.play('click');
        LQ.ui.gacha.open('coupons');
      });
      scope.on(mapButton, 'click', () => {
        audio.play('click');
        api.exit();
      });

      const summary = U.el('section', { class: 'final-summary glass panel' }, [
        U.el('h3', { class: 'final-summary__title pixel-title', text: t('final.summaryTitle') }),
        U.el('p', { class: 'final-summary__rank', text: `${t('map.loveLevel', { n: love.level })} · ${love.title}` }),
        U.el('ul', { class: 'final-stats' }, [
          stat('⭐', t('map.stats.stars'), `${LQ.progress.totalStars()}/${LQ.progress.maxStars()}`),
          stat('💗', t('map.stats.lp'), U.formatNumber(LQ.progress.totalLP())),
          stat('🏆', t('map.trophies'), `${LQ.achievements.unlockedCount()}/${LQ.achievements.LIST.length}`),
          stat('🎁', t('final.coupons'), String(coupons)),
          stat('⏱️', t('hud.time'), formatPlayTime(save.stats.playTimeMs))
        ]),
        U.el('p', { class: 'final-summary__reward', text: t('final.rewardTitle') }),
        LQ.ui.gacha.couponCard(api.content.finalCoupon, true),
        U.el('div', { class: 'final-summary__actions' }, [certificateButton, couponsButton, mapButton])
      ]);
      panel.append(summary);
      summary.scrollIntoView({ behavior: U.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      mapButton.focus({ preventScroll: true });
    }

    function showLetter() {
      state.phase = 'letter';
      stage.hidden = true;
      panel.hidden = false;
      const text = U.el('p', { class: 'final-letter__text', attrs: { 'aria-hidden': 'true' } });
      const live = U.el('p', { class: 'sr-only', text: api.content.finalLetter });
      const signature = U.el('p', { class: 'final-letter__signature', text: t('final.signature', { name: api.content.belovedName }), hidden: true });
      const skip = U.el('p', { class: 'final-letter__skip', text: t('final.tapToSkip') });
      const letter = U.el('article', { class: 'final-letter paper', attrs: { tabindex: '0' } }, [
        U.el('span', { class: 'wax-seal', text: '❤', attrs: { 'aria-hidden': 'true' } }),
        U.el('h3', { class: 'final-letter__title', text: t('final.letterTitle') }),
        text,
        live,
        signature,
        skip
      ]);
      panel.append(letter);
      letter.focus({ preventScroll: true });
      const finishLetter = () => {
        if (state.phase !== 'letter') return;
        state.phase = 'summary';
        skip.hidden = true;
        signature.hidden = false;
        audio.play('star', 2);
        showStats();
      };
      scope.on(letter, 'click', completeTyping);
      scope.on(letter, 'keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          completeTyping();
        }
      });
      typeInto(text, api.content.finalLetter, LETTER_SPEED, finishLetter);
    }

    function accept() {
      if (state.phase !== 'ask') return;
      state.phase = 'celebrate';
      answers.hidden = true;
      questionEl.textContent = t('final.yay');
      couple.classList.add('is-celebrating');
      audio.play('win');
      audio.duck(4500);
      fx.fireworks(5200);
      fx.heartRain(3800);
      fx.confetti(160);
      save.finalCoupon = true;
      api.achieve('itsAMatch');
      api.finish({ score: 0, stars: 0, silent: true });
      LQ.events.emit('progress');
      scope.timeout(showLetter, 2900);
    }

    scope.timeout(() => {
      state.phase = 'typing';
      const question = api.content.proposalQuestion;
      questionLive.textContent = question;
      typeInto(questionEl, question, QUESTION_SPEED, () => {
        state.phase = 'ask';
        answers.hidden = false;
        yesButton.focus({ preventScroll: true });
      });
    }, 900);
    scope.on(bubble, 'click', () => {
      if (state.phase === 'typing') completeTyping();
    });

    return {
      debug: {
        state,
        yesButton: () => yesButton,
        noButton: () => noButton,
        certificate: () => drawCertificate(api.hero.avatar, api.hero.name)
      }
    };
  }

  function starGoals() {
    return [LQ.t('level.final.goal')];
  }

  LQ.games = LQ.games || {};
  LQ.games.final = { create, starGoals, logic: { formatPlayTime } };
})(globalThis.LQ = globalThis.LQ || {});
