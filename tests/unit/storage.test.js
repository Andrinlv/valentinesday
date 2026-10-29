'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, captureWarnings } = require('./helpers');

function createMemoryStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data
  };
}

const LQ = load('js/core/utils.js', 'js/core/storage.js');
const { store } = LQ;

test('sanitize turns garbage into a fresh save', () => {
  for (const raw of [null, undefined, 42, 'text', [], { version: 99 }]) {
    const save = store.sanitize(raw);
    assert.equal(save.version, 1);
    assert.equal(save.tokens, 0);
    assert.equal(save.levels.catch.completed, false);
    assert.equal(save.settings.music, true);
  }
});

test('sanitize keeps valid data and repairs tampered fields', () => {
  const save = store.sanitize({
    version: 1,
    introSeen: true,
    hero: { name: '  Louisa the Brave Knight of Hearts  ', avatar: 9, chosen: true },
    levels: {
      catch: { completed: true, stars: 7, best: 1234.6, plays: 2 },
      memory: { completed: false, stars: 2, best: -5, plays: 'x' },
      bogus: { completed: true }
    },
    tokens: 123456,
    achievements: { firstSteps: 1700000000000, 'bad id!': 1, lucky: 'yesterday' },
    coupons: [0, 0, 2, -1, 1.5, 'x', 2000],
    finalCoupon: 'yes',
    settings: { music: false, sfx: 'loud', crt: true, lang: 'fr' },
    stats: { playTimeMs: 5000, noAttempts: -3 }
  });
  assert.equal(save.introSeen, true);
  assert.equal(save.hero.name, 'Louisa the Brave');
  assert.equal(save.hero.avatar, 3);
  assert.deepEqual(save.levels.catch, { completed: true, stars: 3, best: 1235, plays: 2 });
  assert.deepEqual(save.levels.memory, { completed: true, stars: 2, best: 0, plays: 0 }, 'stars imply completion');
  assert.equal('bogus' in save.levels, false);
  assert.equal(save.tokens, store.MAX_TOKENS);
  assert.deepEqual(save.achievements, { firstSteps: 1700000000000 });
  assert.deepEqual(save.coupons, [0, 2]);
  assert.equal(save.finalCoupon, false);
  assert.deepEqual(save.settings, { music: false, sfx: true, crt: true, lang: null });
  assert.equal(save.stats.playTimeMs, 5000);
  assert.equal(save.stats.noAttempts, 0);
});

test('load and save round-trip through localStorage', () => {
  globalThis.localStorage = createMemoryStorage();
  store.load();
  store.data.tokens = 7;
  store.data.levels.quiz.completed = true;
  store.save();
  const raw = JSON.parse(globalThis.localStorage.getItem(store.KEY));
  assert.equal(raw.tokens, 7);
  store.data = store.createDefault();
  store.load();
  assert.equal(store.data.tokens, 7);
  assert.equal(store.data.levels.quiz.completed, true);
});

test('corrupt JSON and broken storage never crash the game', () => {
  globalThis.localStorage = createMemoryStorage({ [store.KEY]: '{not json' });
  let warnings = captureWarnings(() => store.load());
  assert.equal(warnings.length, 1);
  assert.equal(store.data.tokens, 0);

  globalThis.localStorage = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceededError'); }
  };
  warnings = captureWarnings(() => {
    store.load();
    store.save();
    store.save();
  });
  assert.equal(warnings.length, 2, 'read warning + one write warning');
});

test('resetProgress keeps the settings', () => {
  globalThis.localStorage = createMemoryStorage();
  store.load();
  store.data.settings.music = false;
  store.data.settings.lang = 'de';
  store.data.tokens = 9;
  store.resetProgress();
  assert.equal(store.data.tokens, 0);
  assert.equal(store.data.settings.music, false);
  assert.equal(store.data.settings.lang, 'de');
});
