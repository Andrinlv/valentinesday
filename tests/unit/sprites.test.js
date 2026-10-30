'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const LQ = load('js/core/sprites.js');
const S = LQ.sprites;

test('hero bodies are 14 rows of 16 pixels for every facing', () => {
  for (const [name, style] of Object.entries(S.STYLES)) {
    for (const facing of ['front', 'back', 'side']) {
      assert.equal(style[facing].length, 14, `${name}.${facing}`);
      style[facing].forEach((row, i) => assert.equal(row.length, 16, `${name}.${facing}[${i}]`));
    }
  }
});

test('leg frames are 2 rows of 16 pixels with three animation steps', () => {
  for (const [type, sets] of Object.entries(S.LEGS)) {
    for (const facing of ['front', 'side']) {
      assert.equal(sets[facing].length, 3, `${type}.${facing}`);
      sets[facing].forEach((frame) => frame.forEach((row) => assert.equal(row.length, 16)));
    }
  }
});

test('every pixel of every avatar frame has a colour', () => {
  S.AVATARS.forEach((avatar, index) => {
    for (const dir of ['up', 'down', 'left', 'right']) {
      for (const step of [0, 1, 2]) {
        const rows = S.heroRows(index, dir, step);
        assert.equal(rows.length, 16);
        for (const key of new Set(rows.join('').replace(/\./g, ''))) {
          assert.ok(avatar.palette[key], `${avatar.id} misses colour "${key}"`);
        }
      }
    }
  });
});

test('item sprites are rectangular and fully coloured', () => {
  for (const [name, item] of Object.entries(S.ITEMS)) {
    const width = item.rows[0].length;
    item.rows.forEach((row, i) => assert.equal(row.length, width, `${name}[${i}]`));
    for (const [paletteName, palette] of Object.entries(item.palettes)) {
      for (const key of new Set(item.rows.join('').replace(/\./g, ''))) {
        assert.ok(palette[key], `${name}/${paletteName} misses colour "${key}"`);
      }
    }
  }
});

test('heroRows falls back safely for invalid input', () => {
  assert.deepEqual(S.heroRows(99, 'down', 0), S.heroRows(0, 'down', 0));
  assert.deepEqual(S.heroRows(1, 'down', 7), S.heroRows(1, 'down', 0));
  assert.deepEqual([1, 0, 2, 0].map((_, i) => S.walkStep(i / 8)), [1, 0, 2, 0]);
});
