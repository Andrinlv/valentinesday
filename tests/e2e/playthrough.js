'use strict';
/*
 * End-to-end playthrough: plays the whole quest with real input on a desktop
 * and a mobile profile and fails on any console error or uncaught exception.
 *
 *   node tests/e2e/playthrough.js [--screens=<dir>] [--headed] [--only=desktop|mobile]
 *
 * Needs Playwright with Chromium (npm install && npx playwright install chromium).
 */

const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (err) {
  console.error('Playwright is required: npm install && npx playwright install chromium');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..', '..');
const PAGE_URL = `file://${path.join(ROOT, 'index.html')}?debug=1&seed=20240214`;
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value === undefined ? true : value];
}));
const SCREENS = args.screens ? path.resolve(args.screens) : null;
if (SCREENS) fs.mkdirSync(SCREENS, { recursive: true });

const PROFILES = [
  { name: 'desktop', touch: false, options: { viewport: { width: 1280, height: 760 }, acceptDownloads: true } },
  {
    name: 'mobile',
    touch: true,
    options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, acceptDownloads: true }
  }
].filter((profile) => !args.only || profile.name === args.only);

const DIR_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

function log(profile, message) {
  console.log(`[${profile.name}] ${message}`);
}

async function shot(page, profile, name) {
  if (SCREENS) await page.screenshot({ path: path.join(SCREENS, `${profile.name}-${name}.png`) });
}

async function tapOrClick(page, profile, x, y) {
  if (profile.touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function tapElement(page, profile, selector) {
  const box = await page.locator(selector).first().boundingBox();
  assert.ok(box, `element not visible: ${selector}`);
  await tapOrClick(page, profile, box.x + box.width / 2, box.y + box.height / 2);
}

async function waitForPhase(page, phase, timeout = 15000) {
  await page.waitForFunction((wanted) => {
    const session = LQ.debug && LQ.debug.session;
    return session && session.instance && session.instance.debug.state.phase === wanted;
  }, phase, { timeout, polling: 50 });
}

async function waitForScene(page, scene) {
  await page.waitForFunction((name) => LQ.ui.scenes.current === name && !LQ.ui.scenes.transitioning, scene, { timeout: 15000 });
}

async function continueFromResults(page, profile, levelId) {
  await page.waitForSelector('.modal--results', { timeout: 20000 });
  await page.waitForTimeout(1600);
  await shot(page, profile, `${levelId}-results`);
  const saved = await page.evaluate((id) => LQ.store.data.levels[id], levelId);
  assert.equal(saved.completed, true, `${levelId} saved as completed`);
  assert.ok(saved.stars >= 1 && saved.stars <= 3);
  log(profile, `${levelId}: ${saved.stars}★, ${saved.best} LP`);
  await tapElement(page, profile, '.modal--results .modal__actions .btn--primary');
}

async function playFromLevelCard(page, profile, levelId) {
  await page.waitForSelector('.modal--level', { timeout: 20000 });
  const title = await page.textContent('.modal--level .modal__title');
  assert.equal(title, await page.evaluate((id) => LQ.t(`level.${id}.title`), levelId));
  await tapElement(page, profile, '.modal--level .modal__actions .btn');
  await waitForScene(page, 'game');
  assert.equal(await page.evaluate(() => LQ.debug.session.levelId), levelId);
}

/* ---------- trials ---------- */

async function playCatch(page, profile) {
  await waitForPhase(page, 'play');
  const deadline = Date.now() + 9000;
  let clicks = 0;
  while (Date.now() < deadline) {
    const targets = await page.evaluate(() => LQ.debug.session.instance.debug.targets());
    const viewport = page.viewportSize();
    const target = targets.find((t) => t.type !== 'broken' && t.y > 90 && t.y < viewport.height - 40 && t.x > 20 && t.x < viewport.width - 20);
    if (target) {
      await tapOrClick(page, profile, target.x, target.y);
      clicks++;
    }
    await page.waitForTimeout(90);
  }
  const state = await page.evaluate(() => LQ.debug.session.instance.debug.state);
  assert.ok(state.caught + state.letters > 0, `caught something (clicks: ${clicks})`);
  await shot(page, profile, 'catch-play');
  await page.evaluate(() => LQ.debug.session.instance.debug.endNow());
  await continueFromResults(page, profile, 'catch');
}

async function playMemory(page, profile) {
  await page.waitForSelector('.memory-card');
  if (profile.touch) {
    await tapElement(page, profile, '.memory-peek');
    await page.waitForTimeout(1600);
    assert.equal(await page.evaluate(() => LQ.debug.session.instance.debug.state.moves), 2, 'peek costs two moves');
  } else {
    const cards = await page.evaluate(() => LQ.debug.session.instance.debug.cards());
    const first = cards.findIndex((card) => card.pair === 0);
    const wrong = cards.findIndex((card) => card.pair === 1);
    await tapOrClick(page, profile, cards[first].x, cards[first].y);
    await tapOrClick(page, profile, cards[wrong].x, cards[wrong].y);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => LQ.debug.session.instance.debug.cards());
    assert.equal(after.filter((card) => card.faceUp).length, 0, 'mismatched cards flip back');
  }
  const cards = await page.evaluate(() => LQ.debug.session.instance.debug.cards());
  const pairs = new Map();
  cards.forEach((card, index) => pairs.set(card.pair, (pairs.get(card.pair) || []).concat(index)));
  for (const [pair, [a, b]] of pairs) {
    await tapOrClick(page, profile, cards[a].x, cards[a].y);
    await page.waitForTimeout(120);
    await tapOrClick(page, profile, cards[b].x, cards[b].y);
    await page.waitForTimeout(450);
    if (pair === 2) await shot(page, profile, 'memory-play');
  }
  await continueFromResults(page, profile, 'memory');
}

async function playArchery(page, profile) {
  await waitForPhase(page, 'play');
  await shot(page, profile, 'archery-start');
  for (let arrow = 0; arrow < 12; arrow++) {
    const drag = await page.evaluate(() => {
      const debug = LQ.debug.session.instance.debug;
      const view = debug.view();
      const rect = document.querySelector('.game-canvas').getBoundingClientRect();
      const g = view.gravity;
      const v = view.speed;
      let direction = { x: 0.6, y: -0.8 };
      for (const target of debug.state.targets) {
        if (target.spawnIn > 0.1) continue;
        const distance = Math.hypot(target.x - view.bowX, target.y - view.bowY);
        const dx = target.x + target.vx * (distance / v) - view.bowX;
        const up = view.bowY - target.y;
        const disc = v ** 4 - g * (g * dx * dx + 2 * up * v * v);
        if (disc < 0 || Math.abs(dx) < 1) continue;
        const angle = Math.atan((v * v - Math.sqrt(disc)) / (g * Math.abs(dx)));
        direction = { x: Math.sign(dx) * Math.cos(angle), y: -Math.sin(angle) };
        break;
      }
      const pull = 200 * view.unit;
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height * 0.6;
      return { startX, startY, endX: startX - direction.x * pull, endY: startY - direction.y * pull };
    });
    await page.mouse.move(drag.startX, drag.startY);
    await page.mouse.down();
    await page.mouse.move(drag.endX, drag.endY, { steps: 4 });
    if (arrow === 0) await shot(page, profile, 'archery-aim');
    await page.mouse.up();
    await page.waitForTimeout(340);
  }
  const state = await page.evaluate(() => LQ.debug.session.instance.debug.state);
  assert.equal(state.arrowsLeft, 0, 'all arrows were shot through pointer input');
  log(profile, `archery hits: ${state.hits}`);
  await continueFromResults(page, profile, 'archery');
}

async function playQuiz(page, profile) {
  const questions = await page.evaluate(() => LQ.content.quiz.map((q) => q.correct));
  for (let index = 0; index < questions.length; index++) {
    await page.waitForFunction((i) => LQ.debug.session.instance.debug.state.index === i && !LQ.debug.session.instance.debug.state.locked, index);
    if (index === 0 && !profile.touch) {
      await page.keyboard.down('Escape');
      await page.waitForSelector('.modal--pause');
      await page.keyboard.down('Escape'); // auto-repeat of the held key
      await page.keyboard.up('Escape');
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.modal--pause').count(), 1, 'a held Escape does not close the pause menu again');
      await page.evaluate(() => document.querySelector('.modal--pause').focus());
      await page.keyboard.press('Shift+Tab');
      assert.ok(await page.evaluate(() => {
        const dialog = document.querySelector('.modal--pause');
        return dialog.contains(document.activeElement) && document.activeElement !== dialog;
      }), 'Shift+Tab from the dialog itself stays inside the dialog');
      await shot(page, profile, 'pause');
      await page.dblclick('.modal--pause .modal__actions .btn--primary');
      await page.waitForFunction(() => !LQ.ui.modal.isOpen() && !LQ.debug.session.paused);
      await page.waitForTimeout(300);
      const untouched = await page.evaluate(() => LQ.debug.session.instance.debug.state);
      assert.equal(untouched.mistakes + (untouched.locked ? 1 : 0), 0, 'a double click on RESUME never reaches the quiz');
      const wrong = (questions[0] + 1) % (await page.evaluate(() => LQ.content.quiz[0].answers.length));
      await page.click(`.quiz-answer:nth-child(${wrong + 1})`);
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => LQ.debug.session.instance.debug.state.mistakes), 1);
      assert.equal(await page.isDisabled(`.quiz-answer:nth-child(${wrong + 1})`), true, 'wrong answers lock');
      await shot(page, profile, 'quiz-wrong');
    }
    if (index === 1 && !profile.touch) {
      await page.keyboard.press(`Alt+${questions[index] + 1}`);
      await page.keyboard.press('Control+KeyP');
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => LQ.debug.session.instance.debug.state);
      assert.ok(state.index === 1 && !state.locked, 'Alt+digit is left to the browser');
      assert.equal(await page.evaluate(() => LQ.debug.session.paused), false, 'Ctrl+P prints instead of pausing');

      /* A held digit answers once; its auto-repeat must not answer the next question (when there is one). */
      if (index + 1 < questions.length) {
        const digit = String(questions[index] + 1);
        await page.keyboard.down(digit);
        let repeatsOnNext = 10;
        for (let guard = 0; guard < 150 && repeatsOnNext > 0; guard++) {
          await page.waitForTimeout(40);
          await page.keyboard.down(digit); // auto-repeat
          if (await page.evaluate((next) => LQ.debug.session.instance.debug.state.index === next, index + 1)) repeatsOnNext--;
        }
        await page.keyboard.up(digit);
        const held = await page.evaluate(() => LQ.debug.session.instance.debug.state);
        assert.equal(held.index, index + 1, 'the held digit answered its question');
        assert.ok(!held.locked && held.attempt === 0 && held.mistakes === state.mistakes, 'auto-repeat never answers the next question');
        continue;
      }
    }
    if (index === 0 && profile.touch) {
      await tapElement(page, profile, '#hud-pause');
      await page.waitForSelector('.modal--pause');
      await tapElement(page, profile, '.modal--pause .modal__actions .btn--primary');
      await page.waitForFunction(() => !LQ.ui.modal.isOpen());
      /* The fading backdrop swallows taps for a moment by design, so a double tap never reaches the quiz. */
      await page.waitForSelector('.modal-backdrop', { state: 'detached' });
    }
    await tapElement(page, profile, `.quiz-answer:nth-child(${questions[index] + 1})`);
    await page.waitForTimeout(100);
    await tapElement(page, profile, `.quiz-answer:nth-child(${questions[index] + 1})`);
  }
  if (!profile.touch) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.modal--pause').count(), 0, 'no pause between the last answer and the results');
  }
  await continueFromResults(page, profile, 'quiz');
}

async function holdDirection(page, profile, dir, isDone) {
  if (profile.touch) {
    const box = await page.locator('.dpad').boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const vector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    await page.mouse.move(centerX + vector[0] * box.width * 0.32, centerY + vector[1] * box.height * 0.32);
    await page.mouse.down();
    await isDone();
    await page.mouse.up();
  } else {
    await page.keyboard.down(DIR_KEYS[dir]);
    await isDone();
    await page.keyboard.up(DIR_KEYS[dir]);
  }
}

async function walkTo(page, profile, x, y) {
  const route = await page.evaluate(([tx, ty]) => LQ.debug.session.instance.debug.pathTo(tx, ty), [x, y]);
  assert.ok(route, `no path to ${x},${y}`);
  const runs = [];
  for (const dir of route) {
    if (runs.length && runs[runs.length - 1].dir === dir) runs[runs.length - 1].count++;
    else runs.push({ dir, count: 1 });
  }
  for (const run of runs) {
    const end = await page.evaluate(({ dir, count }) => {
      const player = LQ.debug.session.instance.debug.state.player;
      return { x: player.x + LQ.utils.DIRS[dir].x * count, y: player.y + LQ.utils.DIRS[dir].y * count };
    }, run);
    await holdDirection(page, profile, run.dir, () => page.waitForFunction((target) => {
      const state = LQ.debug.session.instance.debug.state;
      const p = state.player;
      return state.phase !== 'play' || (p.moving ? p.toX === target.x && p.toY === target.y : p.x === target.x && p.y === target.y);
    }, end, { polling: 'raf', timeout: 10000 }));
    await page.waitForFunction((target) => {
      const state = LQ.debug.session.instance.debug.state;
      const p = state.player;
      return state.phase !== 'play' || (!p.moving && p.x === target.x && p.y === target.y);
    }, end, { polling: 'raf', timeout: 10000 });
  }
}

async function hitPlayerWithGhost(page) {
  await page.evaluate(() => {
    const state = LQ.debug.session.instance.debug.state;
    const ghost = state.ghosts[0];
    Object.assign(ghost, { x: state.player.x, y: state.player.y, moving: false, stun: 0, mode: 'roam' });
    state.player.invulnerable = 0;
  });
}

async function playMaze(page, profile) {
  await waitForPhase(page, 'play');
  await page.evaluate(() => LQ.debug.session.instance.debug.setSpeed(2));
  for (let floor = 0; floor < 3; floor++) {
    await page.waitForFunction((f) => {
      const state = LQ.debug.session.instance.debug.state;
      return state.floorIndex === f && state.phase === 'play';
    }, floor, { timeout: 15000 });
    await page.waitForTimeout(250);
    await page.evaluate(() => LQ.debug.session.instance.debug.setGodMode(true));
    if (floor === 0) await shot(page, profile, 'maze-floor1');

    if (floor === 0 && !profile.touch) {
      const key = await page.evaluate(() => LQ.debug.session.instance.debug.layout().key);
      const [firstStep] = await page.evaluate(([x, y]) => LQ.debug.session.instance.debug.pathTo(x, y), [key.x, key.y]);
      const start = await page.evaluate(() => ({ ...LQ.debug.session.instance.debug.state.player }));
      await page.keyboard.down('Meta');
      await page.keyboard.down(DIR_KEYS[firstStep]);
      await page.waitForTimeout(300);
      await page.keyboard.up(DIR_KEYS[firstStep]);
      await page.keyboard.up('Meta');
      const still = await page.evaluate(() => LQ.debug.session.instance.debug.state.player);
      assert.ok(still.x === start.x && still.y === start.y && !still.moving, 'Cmd/Meta shortcuts do not move the hero');

      await page.evaluate(() => {
        window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] };
        navigator.getGamepads = () => [window.__pad];
      });
      const pressStart = async () => {
        await page.evaluate(() => { window.__pad.buttons[9].pressed = true; });
        await page.waitForTimeout(120);
        await page.evaluate(() => { window.__pad.buttons[9].pressed = false; });
        await page.waitForTimeout(120);
      };
      await pressStart();
      await page.waitForSelector('.modal--pause', { timeout: 3000 });
      assert.equal(await page.evaluate(() => LQ.debug.session.paused), true, 'gamepad Start pauses');
      await pressStart();
      await page.waitForFunction(() => !LQ.ui.modal.isOpen() && !LQ.debug.session.paused, null, { timeout: 3000 });
      await page.evaluate(() => { delete navigator.getGamepads; });
      await page.waitForTimeout(250);
    }

    if (floor === 0 && profile.touch) {
      const canvas = await page.locator('.game-canvas--maze').boundingBox();
      const before = await page.evaluate(() => ({ ...LQ.debug.session.instance.debug.state.player }));
      assert.equal(before.dir, 'down');
      await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
      await page.mouse.down();
      await page.mouse.move(canvas.x + canvas.width / 2 + 80, canvas.y + canvas.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(250);
      await page.waitForFunction(() => !LQ.debug.session.instance.debug.state.player.moving, null, { polling: 'raf' });
      const after = await page.evaluate(() => LQ.debug.session.instance.debug.state.player);
      assert.equal(after.dir, 'right', 'a swipe steers the hero');
      assert.ok(after.x >= before.x && after.y === before.y);
    }

    if (floor === 1 && !profile.touch) {
      await page.evaluate(() => LQ.debug.session.instance.debug.setGodMode(false));
      for (let hit = 1; hit <= 3; hit++) {
        await hitPlayerWithGhost(page);
        if (hit < 3) {
          await page.waitForFunction((lives) => LQ.debug.session.instance.debug.state.lives === lives, 3 - hit, { timeout: 5000 });
        }
      }
      await page.waitForFunction(() => LQ.debug.session.instance.debug.state.phase === 'dead', null, { timeout: 5000 });
      await shot(page, profile, 'maze-heartbroken');
      await page.waitForFunction(() => {
        const state = LQ.debug.session.instance.debug.state;
        return state.phase === 'play' && state.lives === 3 && state.livesLost === 3;
      }, null, { timeout: 8000 });
      await page.evaluate(() => LQ.debug.session.instance.debug.setGodMode(true));
    }

    const layout = await page.evaluate(() => {
      const l = LQ.debug.session.instance.debug.layout();
      return { key: l.key, exit: l.exit, item: l.item };
    });
    if (layout.item) {
      await walkTo(page, profile, layout.item.x, layout.item.y);
      if (layout.item.type === 'torch') {
        assert.ok(await page.evaluate(() => LQ.debug.session.instance.debug.state.light > 5), 'torch widens the light');
        await shot(page, profile, 'maze-torch');
      } else {
        assert.ok(await page.evaluate(() => LQ.debug.session.instance.debug.state.potionTimer > 0), 'potion is active');
        await page.evaluate(() => LQ.debug.session.instance.debug.setGodMode(false));
        await hitPlayerWithGhost(page);
        await page.waitForFunction(() => LQ.debug.session.instance.debug.state.ghostsHealed >= 1, null, { timeout: 5000 });
        await page.evaluate(() => LQ.debug.session.instance.debug.setGodMode(true));
        await shot(page, profile, 'maze-night');
      }
    }
    await walkTo(page, profile, layout.key.x, layout.key.y);
    assert.equal(await page.evaluate(() => LQ.debug.session.instance.debug.state.hasKey), true, 'key collected');
    await walkTo(page, profile, layout.exit.x, layout.exit.y);
    await page.waitForFunction(() => LQ.debug.session.instance.debug.state.phase !== 'play', null, { timeout: 5000 });
  }
  await page.waitForTimeout(800);
  await shot(page, profile, 'maze-found');
  const achievements = await page.evaluate(() => LQ.store.data.achievements);
  assert.ok(achievements.mazeRunner, 'maze runner achievement');
  if (!profile.touch) assert.ok(achievements.healer, 'healer achievement');
  await continueFromResults(page, profile, 'maze');
}

async function playFinal(page, profile) {
  await page.waitForSelector('.final-answers:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot(page, profile, 'final-question');
  const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const yesBefore = center(await page.locator('.final-yes').boundingBox());
  for (let attempt = 1; attempt <= 3; attempt++) {
    const before = await page.locator('.final-no').boundingBox();
    if (profile.touch) {
      await page.touchscreen.tap(before.x + before.width / 2, before.y + before.height / 2);
    } else {
      await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2, { steps: 3 });
    }
    await page.waitForTimeout(320);
    const after = await page.locator('.final-no').boundingBox();
    assert.notDeepEqual([Math.round(after.x), Math.round(after.y)], [Math.round(before.x), Math.round(before.y)], 'NO runs away');
    const yesNow = center(await page.locator('.final-yes').boundingBox());
    assert.ok(Math.abs(yesNow.x - yesBefore.x) < 2 && Math.abs(yesNow.y - yesBefore.y) < 2, 'YES keeps its place when NO runs away');
  }
  if (!profile.touch) {
    await page.focus('.final-no');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('final-yes')), true, 'keyboard users are guided to YES');
  }
  const attempts = await page.evaluate(() => LQ.debug.session.instance.debug.state.noAttempts);
  assert.equal(attempts, profile.touch ? 3 : 4);
  await shot(page, profile, 'final-dodging');
  await tapElement(page, profile, '.final-yes');
  await page.waitForTimeout(1200);
  await shot(page, profile, 'final-yes');
  await page.waitForSelector('.final-letter', { timeout: 10000 });
  await tapElement(page, profile, '.final-letter');
  await page.waitForSelector('.final-summary', { timeout: 10000 });
  await page.waitForTimeout(700);
  await shot(page, profile, 'final-summary');
  if (!profile.touch) {
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('final-summary')), 'the summary takes focus');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => LQ.ui.scenes.current), 'game', 'a stray Enter does not leave the finale');
  }

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    tapElement(page, profile, '.final-summary__actions .btn--gold')
  ]);
  const file = await download.path();
  const size = fs.statSync(file).size;
  assert.ok(size > 20000, `certificate PNG has content (${size} bytes)`);
  if (SCREENS) await download.saveAs(path.join(SCREENS, `${profile.name}-certificate.png`));

  const save = await page.evaluate(() => LQ.store.data);
  assert.equal(save.levels.final.completed, true);
  assert.equal(save.finalCoupon, true);
  assert.ok(save.achievements.itsAMatch);
  await tapElement(page, profile, '.final-summary__actions .btn--primary');
  await waitForScene(page, 'map');
}

/* ---------- menus ---------- */

async function checkMenus(page, profile) {
  const tokens = await page.evaluate(() => LQ.store.data.tokens);
  assert.ok(tokens >= 3, `enough tokens for a spin (${tokens})`);
  await tapElement(page, profile, '.dock-btn:nth-child(2)');
  await page.waitForSelector('.modal--gacha');
  await tapElement(page, profile, '.gacha-turn');
  await page.waitForSelector('.gacha__prize:not([hidden])', { timeout: 5000 });
  await page.waitForTimeout(700);
  await shot(page, profile, 'gacha-capsule');
  await tapElement(page, profile, '.gacha__prize');
  await page.waitForSelector('.gacha-reveal:not([hidden])', { timeout: 5000 });
  await shot(page, profile, 'gacha-reveal');
  const save = await page.evaluate(() => LQ.store.data);
  const luckyReward = await page.evaluate(() => LQ.achievements.get('lucky').tokens);
  assert.equal(save.coupons.length, 1);
  assert.ok(save.achievements.lucky, 'first coupon unlocks "lucky"');
  assert.equal(save.tokens, tokens - 3 + luckyReward, 'spin cost minus the achievement reward');
  await tapElement(page, profile, '.gacha-reveal .btn');
  await tapElement(page, profile, '.tabs .tab:nth-child(2)');
  assert.equal(await page.locator('.coupon-list .coupon').count(), 2, 'final coupon + won coupon');
  await shot(page, profile, 'coupons');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !LQ.ui.modal.isOpen());

  await tapElement(page, profile, '.dock-btn:nth-child(1)');
  await page.waitForSelector('.letter-paper');
  assert.equal(await page.locator('.letter-piece--hidden').count(), 0, 'the whole letter is revealed');
  assert.equal(await page.evaluate(() => document.querySelector('.letter-paper__text').textContent), await page.evaluate(() => LQ.content.finalLetter));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.letter-paper__text')).whiteSpace), 'pre-line');
  await shot(page, profile, 'letter');
  await page.keyboard.press('Escape');

  await tapElement(page, profile, '.dock-btn:nth-child(3)');
  await page.waitForSelector('.trophy-list');
  await shot(page, profile, 'trophies');
  await page.keyboard.press('Escape');

  await tapElement(page, profile, '.dock-btn:nth-child(4)');
  await page.waitForSelector('.segmented');
  await tapElement(page, profile, '.segmented__btn[lang="de"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => LQ.i18n.lang === 'de' && document.querySelector('.modal__title').textContent === 'OPTIONEN');
  assert.equal(await page.textContent('.dock-btn:nth-child(1) .dock-btn__label'), 'Brief');
  await shot(page, profile, 'settings-de');
  await tapElement(page, profile, '.segmented__btn[lang="en"]');
  await page.waitForFunction(() => LQ.i18n.lang === 'en');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !LQ.ui.modal.isOpen());
  await page.waitForSelector('.modal-backdrop', { state: 'detached' });
  await shot(page, profile, 'map-complete');

  const map = await page.evaluate(() => {
    const world = document.getElementById('map-world').getBoundingClientRect();
    const nodes = Array.from(document.querySelectorAll('.map-node'), (node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    let min = Infinity;
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => { min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y)); }));
    return { min, avatarTop: document.querySelector('.map-avatar').getBoundingClientRect().top, worldTop: world.top };
  });
  assert.ok(map.min >= 64, `map nodes do not overlap (${Math.round(map.min)}px)`);
  assert.ok(map.avatarTop >= map.worldTop - 4, 'the hero on the top node is not cut off');

  await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 15000 });
  const toasts = await page.evaluate(() => {
    LQ.fx.toast({ icon: '🧪', title: 'Dedupe check' });
    LQ.fx.toast({ icon: '🧪', title: 'Dedupe check' });
    return Array.from(document.querySelectorAll('.toast__title')).filter((node) => node.textContent === 'Dedupe check').length;
  });
  assert.equal(toasts, 1, 'an identical toast is not stacked');
}

/* ---------- edge cases ---------- */

/** A trial that starts while the tab is hidden must still pause once its transition is over. */
async function checkHiddenDuringTransition(page) {
  await page.evaluate(() => LQ.app.startLevel('quiz'));
  await page.waitForFunction(() => LQ.ui.scenes.transitioning);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await waitForScene(page, 'game');
  await page.waitForSelector('.modal--pause', { timeout: 5000 });
  assert.equal(await page.evaluate(() => LQ.debug.session.paused), true, 'hidden tab pauses the new trial');
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.click('.modal--pause .modal__actions .btn:nth-child(3)');
  await waitForScene(page, 'map');
}

/** Progress saved by another tab shows up on the map at once, redrawn in place, even behind an open dialog. */
async function checkCrossTabSync(page, context) {
  await page.waitForFunction(() => !LQ.ui.modal.isOpen() && !LQ.ui.scenes.transitioning);
  await page.evaluate(() => { document.querySelector('.map-node').dataset.marker = 'kept'; });
  const other = await context.newPage();
  await other.goto(`file://${path.join(ROOT, 'README.md')}`);
  const key = await page.evaluate(() => LQ.store.KEY);

  const sfx = await page.evaluate(() => LQ.store.data.settings.sfx);
  await other.evaluate((storageKey) => {
    const save = JSON.parse(localStorage.getItem(storageKey));
    save.settings.sfx = !save.settings.sfx;
    localStorage.setItem(storageKey, JSON.stringify(save));
  }, key);
  await page.waitForFunction((was) => LQ.store.data.settings.sfx !== was, sfx, { timeout: 5000 });

  await page.click('.dock-btn:nth-child(3)');
  await page.waitForSelector('.trophy-list');
  const wanted = (await page.evaluate(() => LQ.store.data.levels.catch.stars)) % 3 + 1;
  await other.evaluate(([storageKey, stars]) => {
    const save = JSON.parse(localStorage.getItem(storageKey));
    save.settings.sfx = !save.settings.sfx;
    save.levels.catch.stars = stars;
    localStorage.setItem(storageKey, JSON.stringify(save));
  }, [key, wanted]);
  await page.waitForFunction((stars) => document.querySelector('.map-node .map-node__stars').textContent ===
    '★'.repeat(stars) + '☆'.repeat(3 - stars), wanted, { timeout: 5000 });
  assert.equal(await page.locator('.trophy-list').count(), 1, 'the open dialog stays open');
  assert.equal(await page.locator('.map-node[data-marker="kept"]').count(), 1, 'the nodes are updated in place');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !LQ.ui.modal.isOpen());
  await other.close();
}

/**
 * Another tab changes the quest around the hero's walk to a newly unlocked trial: it resets the quest
 * before the walk starts, while walking and right after arriving, or it already finished the next trial.
 * The hero must never walk to, unlock or open a trial that is no longer next.
 */
async function checkWalkMeetsOtherTab(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  await page.goto(PAGE_URL);
  await page.click('#start-btn:not([hidden])', { timeout: 10000 });
  await waitForScene(page, 'select');
  await page.click('#select-go');
  await waitForScene(page, 'intro');
  await page.click('#intro-skip');
  await waitForScene(page, 'map');
  await page.waitForSelector('.modal--level', { timeout: 10000 });
  await page.keyboard.press('Escape');

  const other = await context.newPage();
  await other.goto(`file://${path.join(ROOT, 'README.md')}`);
  const key = await page.evaluate(() => LQ.store.KEY);
  await page.evaluate(() => {
    /* Horizontal distance between the hero and a trial node. */
    window.__heroOffset = (index = 0) => {
      const avatar = document.querySelector('.map-avatar').getBoundingClientRect();
      const node = document.querySelectorAll('.map-node')[index].getBoundingClientRect();
      return Math.abs(avatar.left + avatar.width / 2 - (node.left + node.width / 2));
    };
  });

  for (const moment of ['before', 'during', 'after', 'finishedElsewhere']) {
    await page.waitForFunction(() => LQ.ui.scenes.current === 'map' && !LQ.ui.scenes.transitioning && !LQ.ui.modal.isOpen());
    await page.evaluate(() => LQ.app.startLevel('catch'));
    await waitForScene(page, 'game');
    await waitForPhase(page, 'play');
    await page.evaluate(() => LQ.debug.session.instance.debug.endNow());
    await page.waitForSelector('.modal--results', { timeout: 20000 });
    await page.waitForTimeout(1600);
    if (moment === 'finishedElsewhere') {
      await other.evaluate((storageKey) => {
        const save = JSON.parse(localStorage.getItem(storageKey));
        save.levels.memory = { completed: true, stars: 1, best: 100, plays: 1 };
        localStorage.setItem(storageKey, JSON.stringify(save));
      }, key);
      await page.waitForFunction(() => LQ.store.data.levels.memory.completed);
      await page.click('.modal--results .modal__actions .btn--primary');
      await waitForScene(page, 'map');
      await page.waitForTimeout(3000);
      const settled = await page.evaluate(() => ({
        cardOpen: Boolean(document.querySelector('.modal--level')),
        offset: window.__heroOffset(LQ.progress.levelIndex(LQ.progress.currentLevelId())),
        current: LQ.progress.currentLevelId()
      }));
      assert.equal(settled.current, 'archery');
      assert.equal(settled.cardOpen, false, 'no walk or card for a trial another tab already finished');
      assert.ok(settled.offset < 4, `the hero stands at the current trial (${settled.offset}px off)`);
      continue;
    }
    await page.click('.modal--results .modal__actions .btn--primary');
    if (moment === 'before') await page.waitForFunction(() => LQ.ui.scenes.current === 'map');
    else if (moment === 'during') await page.waitForFunction(() => window.__heroOffset() > 10, null, { timeout: 10000 });
    else await page.waitForSelector('.map-node.is-unlocking', { timeout: 10000 });
    await other.evaluate((storageKey) => localStorage.removeItem(storageKey), key);
    await page.waitForTimeout(moment === 'after' ? 1200 : 3000);
    const result = await page.evaluate(() => ({
      cardOpen: Boolean(document.querySelector('.modal--level')),
      catchDone: LQ.store.data.levels.catch.completed,
      offset: window.__heroOffset()
    }));
    assert.equal(result.catchDone, false, `${moment}: the reset from the other tab was adopted`);
    assert.equal(result.cardOpen, false, `${moment}: no level card opens for a trial that is locked again`);
    assert.ok(result.offset < 4, `${moment}: the hero stands at the first trial again (${result.offset}px off)`);
  }
  await other.close();
  assert.deepEqual(problems, [], 'no console problems');
  await context.close();
}

/** Phones held sideways: the maze stays beside the direction pad and the finale fits on screen. */
async function checkLandscape(page, profile) {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await page.evaluate(() => LQ.app.startLevel('maze'));
  await waitForScene(page, 'game');
  await waitForPhase(page, 'play');
  await page.waitForTimeout(300);
  const maze = await page.evaluate(() => {
    const canvas = document.querySelector('.game-canvas--maze').getBoundingClientRect();
    const pad = document.querySelector('.dpad').getBoundingClientRect();
    const debug = LQ.debug.session.instance.debug;
    const hero = debug.heroOnScreen();
    const world = debug.worldOnScreen();
    return {
      heroX: canvas.left + hero.x,
      worldLeft: canvas.left + world.left,
      worldCenter: canvas.left + (world.left + world.right) / 2,
      bandCenter: (pad.right + 12 + canvas.right) / 2,
      padRight: pad.right
    };
  });
  assert.ok(maze.heroX > maze.padRight && maze.worldLeft >= maze.padRight, `the maze stays beside the pad (${JSON.stringify(maze)})`);
  assert.ok(Math.abs(maze.worldCenter - maze.bandCenter) < 2, `the maze is centred in the free band (${JSON.stringify(maze)})`);
  await shot(page, profile, 'landscape-maze');
  await tapElement(page, profile, '#hud-pause');
  await page.waitForSelector('.modal--pause');
  await tapElement(page, profile, '.modal--pause .modal__actions .btn:nth-child(3)');
  await waitForScene(page, 'map');

  await page.evaluate(() => LQ.app.startLevel('final'));
  await waitForScene(page, 'game');
  await page.waitForSelector('.final-answers:not([hidden])', { timeout: 15000 });
  await page.waitForTimeout(600);
  const finale = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
    const onScreen = ['.final-bubble__question', '.final-yes', '.final-no'].every((selector) => {
      const box = rect(selector);
      return box.top >= 0 && box.bottom <= window.innerHeight && box.height > 0;
    });
    const question = rect('.final-bubble__question');
    return { onScreen, inBubble: question.bottom <= rect('.final-bubble').bottom && question.bottom <= rect('.final-couple').top };
  });
  assert.ok(finale.onScreen, 'question and both answers are visible in landscape');
  assert.ok(finale.inBubble, 'the question stays inside its bubble, above the couple');
  await shot(page, profile, 'landscape-final');
  await tapElement(page, profile, '#hud-pause');
  await page.waitForSelector('.modal--pause');
  await tapElement(page, profile, '.modal--pause .modal__actions .btn:nth-child(3)');
  await waitForScene(page, 'map');
  await page.setViewportSize(profile.options.viewport);
}

/* ---------- runner ---------- */

async function runProfile(browser, profile) {
  const context = await browser.newContext(profile.options);
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}\n${error.stack}`));

  await page.goto(PAGE_URL);
  await page.waitForSelector('#start-btn:not([hidden])', { timeout: 10000 });
  await shot(page, profile, 'boot');
  for (let i = 0; i < 5; i++) await tapElement(page, profile, '#boot-title');
  assert.ok(await page.evaluate(() => LQ.store.data.achievements.cheatCode), 'secret title taps');
  await tapElement(page, profile, '#start-btn');
  await waitForScene(page, 'select');
  await tapElement(page, profile, '.hero-card:nth-child(3)');
  await page.fill('#hero-name', '💖'.repeat(20));
  assert.equal(Array.from(await page.inputValue('#hero-name')).length, 16, 'names keep at most 16 visible characters');
  await page.fill('#hero-name', 'ABCDEFGHIJKLMNOP');
  await page.evaluate(() => document.getElementById('hero-name').setSelectionRange(0, 0));
  await page.keyboard.type('X');
  assert.equal(await page.inputValue('#hero-name'), 'ABCDEFGHIJKLMNOP', 'typing into a full name never cuts its end');
  if (!profile.touch) {
    /* IME text committed after the caret moved away (as on Android) is still cut where it was typed. */
    await page.fill('#hero-name', 'ABCDEFGHIJKLMNO');
    await page.evaluate(() => document.getElementById('hero-name').setSelectionRange(15, 15));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'xyz', selectionStart: 3, selectionEnd: 3 });
    const field = await page.locator('#hero-name').boundingBox();
    await page.mouse.click(field.x + 30, field.y + field.height / 2);
    await page.evaluate(() => document.getElementById('hero-name').blur());
    await cdp.detach();
    assert.equal(await page.inputValue('#hero-name'), 'ABCDEFGHIJKLMNOx', 'an IME commit keeps the start of the name');
  }
  await page.fill('#hero-name', 'Jordan');
  await shot(page, profile, 'select');
  await page.evaluate(() => {
    window.__sceneRequests = [];
    const show = LQ.ui.scenes.show.bind(LQ.ui.scenes);
    LQ.ui.scenes.show = (...request) => {
      window.__sceneRequests.push(request[0]);
      return show(...request);
    };
  });
  if (profile.touch) {
    await tapElement(page, profile, '#select-go');
  } else {
    await page.focus('#hero-name');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  }
  await waitForScene(page, 'intro');
  await page.waitForTimeout(500);
  assert.deepEqual(await page.evaluate(() => window.__sceneRequests), ['intro'], 'the quest starts exactly once');
  await page.waitForTimeout(600);
  await tapElement(page, profile, '#intro-box');
  await tapElement(page, profile, '#intro-box');
  await page.waitForTimeout(500);
  await shot(page, profile, 'intro');
  await tapElement(page, profile, '#intro-skip');
  await waitForScene(page, 'map');
  const hero = await page.evaluate(() => LQ.store.data.hero);
  assert.deepEqual(hero, { name: 'Jordan', avatar: 2, chosen: true });

  const trials = [['catch', playCatch], ['memory', playMemory], ['archery', playArchery], ['quiz', playQuiz], ['maze', playMaze], ['final', playFinal]];
  try {
    for (const [levelId, play] of trials) {
      if (levelId === 'catch') await page.waitForTimeout(400);
      await shot(page, profile, `map-before-${levelId}`);
      await playFromLevelCard(page, profile, levelId);
      log(profile, `playing ${levelId}`);
      await play(page, profile);
    }
    await checkMenus(page, profile);
    if (profile.touch) {
      await checkLandscape(page, profile);
    } else {
      await checkHiddenDuringTransition(page);
      await checkCrossTabSync(page, context);
      await checkWalkMeetsOtherTab(browser);
    }
  } catch (err) {
    /* Leave evidence behind: what the player saw and what the game thought. */
    await shot(page, profile, 'failure').catch(() => {});
    const snapshot = await page.evaluate(() => ({
      scene: LQ.ui.scenes.current,
      transitioning: LQ.ui.scenes.transitioning,
      modalOpen: LQ.ui.modal.isOpen(),
      session: LQ.debug.session && {
        levelId: LQ.debug.session.levelId,
        paused: LQ.debug.session.paused,
        finished: LQ.debug.session.finished,
        state: LQ.debug.session.instance && LQ.debug.session.instance.debug.state
      }
    })).catch((evalErr) => `unavailable: ${evalErr.message}`);
    console.error(`[${profile.name}] state at failure: ${JSON.stringify(snapshot)}`);
    if (problems.length) console.error(`[${profile.name}] console problems so far:\n${problems.join('\n')}`);
    throw err;
  }

  const save = await page.evaluate(() => LQ.store.data);
  for (const [id, level] of Object.entries(save.levels)) assert.equal(level.completed, true, `${id} completed`);
  log(profile, `achievements: ${Object.keys(save.achievements).join(', ')}`);
  await context.close();
  return problems;
}

(async () => {
  const browser = await chromium.launch({ headless: !args.headed });
  let failed = false;
  try {
    for (const profile of PROFILES) {
      const started = Date.now();
      const problems = await runProfile(browser, profile);
      if (problems.length) {
        failed = true;
        console.error(`[${profile.name}] console problems:\n${problems.join('\n')}`);
      } else {
        log(profile, `passed without console errors in ${Math.round((Date.now() - started) / 1000)}s`);
      }
    }
  } catch (err) {
    failed = true;
    console.error(err);
  } finally {
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})();
