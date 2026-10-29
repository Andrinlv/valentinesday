'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const LQ = load(
  'js/config.js', 'js/core/utils.js', 'js/core/i18n.js', 'js/core/content.js',
  'js/games/catch.js', 'js/games/memory.js', 'js/games/archery.js', 'js/games/quiz.js', 'js/games/final.js'
);
const { catch: catchGame, memory, archery, quiz, final } = LQ.games;

test('catch: combo multiplier grows every three catches up to x5', () => {
  const m = catchGame.logic.multiplier;
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 12, 40].map(m), [1, 1, 1, 2, 2, 3, 4, 5, 5]);
});

test('catch: stars need points, three stars also need all letters', () => {
  const { starsFor, STAR_SCORES, LETTER_COUNT } = catchGame.logic;
  assert.equal(starsFor(0, 0), 1);
  assert.equal(starsFor(STAR_SCORES[0], 0), 2);
  assert.equal(starsFor(STAR_SCORES[1], LETTER_COUNT - 1), 2);
  assert.equal(starsFor(STAR_SCORES[1], LETTER_COUNT), 3);
});

test('memory: stars, score and grid fitting', () => {
  const { starsFor, scoreFor, bestGrid, STAR_MOVES } = memory.logic;
  assert.equal(starsFor(6), 3);
  assert.equal(starsFor(STAR_MOVES[1]), 3);
  assert.equal(starsFor(STAR_MOVES[1] + 1), 2);
  assert.equal(starsFor(STAR_MOVES[0] + 1), 1);
  assert.ok(scoreFor(600, 6, 20) > scoreFor(600, 14, 20));
  assert.ok(scoreFor(600, 30, 500) >= 600, 'never below the match points');
  assert.equal(bestGrid(12, 360, 640, 8).cols, 3, 'portrait phone');
  assert.equal(bestGrid(12, 1200, 600, 14).cols, 4, 'landscape desktop');
  assert.ok(bestGrid(12, 1200, 600, 14).size <= 150);
});

test('archery: segment-circle collision also catches fast arrows', () => {
  const hit = archery.logic.segmentHitsCircle;
  assert.equal(hit(0, 0, 100, 0, 50, 5, 10), true, 'passes through');
  assert.equal(hit(0, 0, 100, 0, 50, 20, 10), false, 'passes beside');
  assert.equal(hit(0, 0, 10, 0, 50, 0, 10), false, 'stops before');
  assert.equal(hit(0, 0, 45, 0, 50, 0, 10), true, 'ends inside');
  assert.equal(hit(5, 5, 5, 5, 6, 6, 2), true, 'zero-length segment inside');
  assert.equal(hit(-500, 0, 500, 0, 0, 9.9, 10), true, 'tunnelling case');
});

test('archery: aiming always shoots upwards', () => {
  const aim = archery.logic.aimFromDrag;
  const up = aim(0, -170, 1);
  assert.ok(Math.abs(up.angle + Math.PI / 2) < 1e-9);
  assert.equal(up.power, 1);
  assert.equal(aim(100, 50, 1).angle, 0, 'downward right clamps to horizontal');
  assert.equal(aim(-100, 50, 1).angle, -Math.PI, 'downward left clamps to horizontal');
  assert.equal(aim(0, 0, 1).power, 0);
  assert.equal(archery.logic.starsFor(archery.logic.STAR_HITS[1]), 3);
  assert.equal(archery.logic.starsFor(0), 1);
});

test('quiz: points, allowed mistakes and stars', () => {
  const { pointsFor, starsFor, allowedMistakes, BONUS_SECONDS } = quiz.logic;
  assert.equal(pointsFor(0, BONUS_SECONDS), 150);
  assert.equal(pointsFor(0, 0), 100);
  assert.equal(pointsFor(1, 99), 50);
  assert.equal(pointsFor(4, 99), 20);
  assert.equal(allowedMistakes(3), 1);
  assert.equal(allowedMistakes(9), 3);
  assert.equal(starsFor(0, 3), 3);
  assert.equal(starsFor(1, 3), 2);
  assert.equal(starsFor(2, 3), 1);
});

test('every trial explains its goals', () => {
  for (const id of ['catch', 'memory', 'archery', 'quiz']) {
    const goals = LQ.games[id].starGoals();
    assert.equal(goals.length, 3);
    goals.forEach((goal) => assert.ok(goal.length > 3 && !goal.includes('{'), goal));
  }
  assert.equal(final.starGoals().length, 1);
});

test('final: play time formatting', () => {
  const format = final.logic.formatPlayTime;
  assert.equal(format(0), '1 min');
  assert.equal(format(5 * 60000), '5 min');
  assert.equal(format(125 * 60000), '2 h 05 min');
});
