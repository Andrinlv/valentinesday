'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const LQ = load('js/core/utils.js');
const U = LQ.utils;

test('clamp, lerp and formatTime', () => {
  assert.equal(U.clamp(5, 0, 3), 3);
  assert.equal(U.clamp(-1, 0, 3), 0);
  assert.equal(U.lerp(0, 10, 0.25), 2.5);
  assert.equal(U.formatTime(0), '0:00');
  assert.equal(U.formatTime(75.9), '1:15');
  assert.equal(U.formatTime(-4), '0:00');
  assert.equal(U.formatTime(600), '10:00');
});

test('createRng is deterministic and stays in [0, 1)', () => {
  const a = U.createRng(42);
  const b = U.createRng(42);
  for (let i = 0; i < 1000; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
  assert.notEqual(U.createRng(1)(), U.createRng(2)());
});

test('shuffle returns a permutation and does not mutate the input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = input.slice();
  const shuffled = U.shuffle(input, U.createRng(7));
  assert.deepEqual(input, copy);
  assert.deepEqual(shuffled.slice().sort((x, y) => x - y), copy);
  assert.deepEqual(U.shuffle(input, U.createRng(7)), shuffled);
});

test('randInt is inclusive and weightedPick respects weights', () => {
  const rng = U.createRng(3);
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(U.randInt(1, 3, rng));
  assert.deepEqual([...seen].sort(), [1, 2, 3]);

  const counts = { a: 0, b: 0 };
  const entries = [{ name: 'a', weight: 9 }, { name: 'b', weight: 1 }];
  for (let i = 0; i < 5000; i++) counts[U.weightedPick(entries, rng).name]++;
  assert.ok(counts.a > counts.b * 5, JSON.stringify(counts));
  assert.equal(U.weightedPick([{ name: 'only', weight: 0 }], rng).name, 'only');
});

test('scopes run cleanups once, in reverse order, and cancel timers', async () => {
  const scope = U.createScope();
  const order = [];
  scope.add(() => order.push('first'));
  scope.add(() => order.push('second'));
  let fired = false;
  scope.timeout(() => { fired = true; }, 10);
  const child = scope.child();
  child.add(() => order.push('child'));
  scope.dispose();
  scope.dispose();
  assert.deepEqual(order, ['child', 'second', 'first']);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fired, false);
  assert.equal(scope.disposed, true);

  let late = false;
  scope.add(() => { late = true; });
  assert.equal(late, true, 'cleanups added after dispose run immediately');
});

test('a disposed child scope unregisters itself from its parent', () => {
  const parent = U.createScope();
  const child = parent.child();
  let runs = 0;
  child.add(() => runs++);
  child.dispose();
  parent.dispose();
  assert.equal(runs, 1);
});

test('scope.timeout fires and wait() resolves', async () => {
  const scope = U.createScope();
  let fired = 0;
  scope.timeout(() => fired++, 5);
  await scope.wait(20);
  assert.equal(fired, 1);
  scope.dispose();
});

test('emitter delivers events and isolates failing listeners', (t) => {
  const emitter = U.createEmitter();
  const received = [];
  const off = emitter.on('ping', (payload) => received.push(payload));
  const errorLog = t.mock.method(console, 'error', () => {});
  emitter.on('ping', () => { throw new Error('boom'); });
  emitter.emit('ping', 1);
  assert.equal(errorLog.mock.callCount(), 1);
  off();
  emitter.emit('ping', 2);
  emitter.emit('nobody-listens');
  assert.deepEqual(received, [1]);
});
