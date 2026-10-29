'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, captureWarnings } = require('./helpers');

let LQ;
const loadWarnings = captureWarnings(() => {
  LQ = load('js/config.js', 'js/core/utils.js', 'js/core/content.js');
});
const validate = LQ.validateContent;

test('the shipped config.js is valid and produces no warnings', () => {
  assert.deepEqual(loadWarnings, []);
  const content = LQ.content;
  assert.equal(content.memoryItems.length, 6);
  assert.ok(content.quiz.length >= 1);
  assert.ok(content.coupons.length >= 1);
  assert.equal(content.finalLetter, globalThis.LOVE_CONFIG.finalLetter);
  assert.deepEqual(content.quiz.map((q) => q.correct), globalThis.LOVE_CONFIG.quiz.map((q) => q.correct));
});

test('a missing config falls back to complete defaults', () => {
  let content;
  const warnings = captureWarnings(() => { content = validate(undefined); });
  assert.equal(warnings.length, 1, 'only the missing config itself is reported');
  assert.equal(content.language, 'en');
  assert.equal(content.memoryItems.length, 6);
  assert.ok(content.quiz.length >= 1);
  assert.ok(content.loveQuotes.length >= 1);
  assert.ok(content.coupons.length >= 1);
  assert.ok(content.finalCoupon.title);
});

test('invalid quiz questions are skipped, valid ones are kept', () => {
  let content;
  const warnings = captureWarnings(() => {
    content = validate({
      quiz: [
        { question: 'Ok?', answers: ['a', 'b'], correct: 1 },
        { question: 'Bad index', answers: ['a', 'b'], correct: 2 },
        { question: 'Empty answer', answers: ['a', ''], correct: 0 },
        { question: '', answers: ['a', 'b'], correct: 0 },
        { question: 'Too few', answers: ['a'], correct: 0 },
        { question: 'Float', answers: ['a', 'b'], correct: 0.5 },
        null
      ]
    });
  });
  assert.equal(content.quiz.length, 1);
  assert.deepEqual(content.quiz[0], { question: 'Ok?', answers: ['a', 'b'], correct: 1, wrongMsg: '' });
  assert.equal(warnings.length, 6);
});

test('memory items are de-duplicated, padded to six and images are detected', () => {
  let content;
  captureWarnings(() => {
    content = validate({ memoryItems: ['🌹', '🌹', 'photos/us.JPG', '  ', 42] });
  });
  assert.equal(content.memoryItems.length, 6);
  const values = content.memoryItems.map((item) => item.value);
  assert.equal(new Set(values).size, 6);
  assert.deepEqual(content.memoryItems[1], { value: 'photos/us.JPG', isImage: true });
  assert.equal(content.memoryItems[0].isImage, false);
});

test('names, avatar and language are validated', () => {
  let content;
  captureWarnings(() => {
    content = validate({ language: 'fr', heroName: '   ', belovedName: 'A very long name that keeps on going', belovedAvatar: 7 });
  });
  assert.equal(content.language, 'en');
  assert.equal(content.heroName, 'Valentine');
  assert.equal(content.belovedName.length, 28);
  assert.equal(content.belovedAvatar, 1);
  assert.equal(validate({ language: 'de', belovedAvatar: 3 }).belovedAvatar, 3);
});

test('coupons without a title are dropped and icons default', () => {
  let content;
  captureWarnings(() => {
    content = validate({ coupons: [{ title: 'Hug' }, { icon: '🍕' }, 'nope'], finalCoupon: { icon: '' } });
  });
  assert.deepEqual(content.coupons, [{ icon: '🎟️', title: 'Hug' }]);
  assert.ok(content.finalCoupon.title.length > 0);
});
