'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, readSource, listScripts } = require('./helpers');

const LQ = load('js/core/utils.js', 'js/core/i18n.js');
const { DICT } = LQ.i18n;

const placeholders = (value) => [...[].concat(value).join(' ').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('English and German contain exactly the same keys', () => {
  const en = Object.keys(DICT.en).sort();
  const de = Object.keys(DICT.de).sort();
  assert.deepEqual(de.filter((key) => !en.includes(key)), [], 'keys only in DE');
  assert.deepEqual(en.filter((key) => !de.includes(key)), [], 'keys only in EN');
});

test('translations use the same placeholders and list lengths', () => {
  for (const key of Object.keys(DICT.en)) {
    const en = DICT.en[key];
    const de = DICT.de[key];
    assert.deepEqual(placeholders(de), placeholders(en), `placeholders differ for "${key}"`);
    assert.equal(Array.isArray(de), Array.isArray(en), `type differs for "${key}"`);
    if (Array.isArray(en)) assert.equal(de.length, en.length, `list length differs for "${key}"`);
    for (const text of [].concat(en, de)) assert.ok(String(text).trim().length > 0, `empty text for "${key}"`);
  }
});

test('German texts use Swiss spelling (no ß)', () => {
  for (const [key, value] of Object.entries(DICT.de)) {
    assert.ok(![].concat(value).join(' ').includes('ß'), `"${key}" contains ß`);
  }
});

test('every statically referenced text key exists', () => {
  const missing = new Set();
  const sources = listScripts().map(readSource).join('\n');
  for (const match of sources.matchAll(/\bt\(\s*'([\w.]+)'/g)) {
    if (!(match[1] in DICT.en)) missing.add(match[1]);
  }
  for (const match of sources.matchAll(/\blist\(\s*'([\w.]+)'/g)) {
    if (!(match[1] in DICT.en)) missing.add(match[1]);
  }
  const html = readSource('index.html');
  for (const match of html.matchAll(/data-i18n(?:-aria|-title)?="([\w.]+)"/g)) {
    if (!(match[1] in DICT.en)) missing.add(match[1]);
  }
  assert.deepEqual([...missing], []);
});

test('dynamically built keys exist', () => {
  const required = [];
  for (const id of ['catch', 'memory', 'archery', 'quiz', 'maze', 'final']) {
    required.push(`level.${id}.title`, `level.${id}.desc`);
  }
  for (const id of ['catch', 'memory', 'archery', 'quiz', 'maze']) {
    required.push(`level.${id}.star1`, `level.${id}.star2`, `level.${id}.star3`);
  }
  for (let n = 1; n <= 10; n++) required.push(`rank.${n}`);
  for (let n = 1; n <= 3; n++) required.push(`maze.floorName.${n}`, `maze.floorHint.${n}`);
  for (const id of ['rose', 'wanderer', 'sunny', 'royal']) required.push(`avatar.${id}`);
  const achievementIds = [...readSource('js/core/achievements.js').matchAll(/\{ id: '(\w+)'/g)].map((m) => m[1]);
  assert.ok(achievementIds.length >= 15);
  for (const id of achievementIds) required.push(`ach.${id}.title`, `ach.${id}.desc`);
  for (const key of required) assert.ok(key in DICT.en && key in DICT.de, `missing "${key}"`);
});

test('t() interpolates, falls back to English and warns once for unknown keys', () => {
  assert.equal(LQ.t('map.best', { score: '1,200' }), 'Best: 1,200 LP');
  LQ.i18n.setLang('de');
  assert.equal(LQ.t('map.best', { score: '1’200' }), 'Rekord: 1’200 LP');
  assert.equal(LQ.i18n.locale(), 'de-CH');
  assert.equal(LQ.i18n.setLang('fr'), false);
  assert.equal(LQ.i18n.lang, 'de');
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  assert.equal(LQ.t('does.not.exist'), 'does.not.exist');
  assert.equal(LQ.t('does.not.exist'), 'does.not.exist');
  console.warn = original;
  assert.equal(warnings.length, 1);
  assert.equal(LQ.i18n.list('final.noPhrases').length, DICT.de['final.noPhrases'].length);
  assert.match(LQ.i18n.list('intro.lines', { name: 'Mia' })[4], /Mia/);
  LQ.i18n.setLang('en');
});
