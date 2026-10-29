'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.LQ = {
  audio: { play() {}, vibrate() {} },
  fx: { toast() {} }
};
const LQ = load(
  'js/config.js', 'js/core/utils.js', 'js/core/i18n.js', 'js/core/content.js',
  'js/core/storage.js', 'js/core/progress.js', 'js/core/achievements.js'
);
const { progress, store, achievements } = LQ;

function fresh() {
  store.data = store.createDefault();
}

test('trials unlock one after another', () => {
  fresh();
  assert.equal(progress.isUnlocked('catch'), true);
  assert.equal(progress.isUnlocked('memory'), false);
  assert.equal(progress.isUnlocked('nope'), false);
  assert.equal(progress.currentLevelId(), 'catch');
  progress.applyResult('catch', { score: 500, stars: 1 });
  assert.equal(progress.isUnlocked('memory'), true);
  assert.equal(progress.currentLevelId(), 'memory');
});

test('applyResult pays tokens only for new stars and tracks bests', () => {
  fresh();
  const first = progress.applyResult('catch', { score: 700, stars: 2 });
  assert.equal(first.firstClear, true);
  assert.equal(first.newStars, 2);
  assert.equal(first.letterPiece, 1);
  assert.equal(first.unlockedLevelId, 'memory');
  assert.equal(first.newBest, false, 'the first score is not a "new best"');
  const tokensAfterFirst = store.data.tokens;
  assert.equal(tokensAfterFirst, 2 + achievements.get('firstSteps').tokens);

  const worse = progress.applyResult('catch', { score: 300, stars: 1 });
  assert.equal(worse.newStars, 0);
  assert.equal(worse.firstClear, false);
  assert.equal(worse.letterPiece, 0);
  assert.equal(worse.unlockedLevelId, null);
  assert.equal(store.data.levels.catch.stars, 2);
  assert.equal(store.data.levels.catch.best, 700);
  assert.equal(store.data.tokens, tokensAfterFirst);

  const better = progress.applyResult('catch', { score: 1500, stars: 3 });
  assert.equal(better.newStars, 1);
  assert.equal(better.newBest, true);
  assert.equal(store.data.levels.catch.plays, 3);
  assert.ok(achievements.isUnlocked('starCollector'));
});

test('scores and stars are sanitised', () => {
  fresh();
  const outcome = progress.applyResult('memory', { score: -40, stars: 9 });
  assert.equal(outcome.score, 0);
  assert.equal(outcome.stars, 3);
  assert.throws(() => progress.applyResult('unknown', { score: 1, stars: 1 }));
});

test('perfectionist needs three stars everywhere', () => {
  fresh();
  for (const id of progress.STAR_LEVEL_IDS.slice(0, -1)) progress.applyResult(id, { score: 100, stars: 3 });
  assert.equal(achievements.isUnlocked('perfectionist'), false);
  progress.applyResult('maze', { score: 100, stars: 3 });
  assert.equal(achievements.isUnlocked('perfectionist'), true);
  assert.equal(progress.totalStars(), progress.maxStars());
});

test('love level follows the love point thresholds', () => {
  assert.equal(progress.loveLevel(0).level, 1);
  assert.equal(progress.loveLevel(progress.LOVE_LEVELS[1] - 1).level, 1);
  assert.equal(progress.loveLevel(progress.LOVE_LEVELS[1]).level, 2);
  const max = progress.loveLevel(1e9);
  assert.equal(max.level, 10);
  assert.equal(max.next, null);
  assert.equal(max.progress, 1);
  const mid = progress.loveLevel((progress.LOVE_LEVELS[2] + progress.LOVE_LEVELS[3]) / 2);
  assert.equal(mid.level, 3);
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-9);
  assert.ok(mid.title.length > 0);
});

test('the letter splits into six pieces that rebuild the original text', () => {
  fresh();
  const chunks = progress.letterChunks();
  assert.equal(chunks.length, progress.LETTER_PIECES);
  assert.equal(chunks.filter(Boolean).join(' '), LQ.content.finalLetter.split(/\s+/).filter(Boolean).join(' '));
  assert.equal(progress.letterPiecesFound(), 0);
  progress.applyResult('catch', { score: 1, stars: 1 });
  assert.equal(progress.letterPiecesFound(), 1);
});

test('tokens can be spent but never go negative', () => {
  fresh();
  progress.addTokens(4);
  assert.equal(progress.spendTokens(3), true);
  assert.equal(store.data.tokens, 1);
  assert.equal(progress.spendTokens(3), false);
  assert.equal(store.data.tokens, 1);
  progress.addTokens(-50);
  assert.equal(store.data.tokens, 0);
});

test('achievements unlock once and reward tokens once', () => {
  fresh();
  assert.equal(achievements.unlock('lucky'), true);
  assert.equal(achievements.unlock('lucky'), false);
  assert.equal(store.data.tokens, achievements.get('lucky').tokens);
  const originalWarn = console.warn;
  console.warn = () => {};
  assert.equal(achievements.unlock('doesNotExist'), false);
  console.warn = originalWarn;
  assert.equal(achievements.unlockedCount(), 1);
});
