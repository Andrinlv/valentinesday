'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const LQ = load('js/core/utils.js', 'js/ui/map.js');
const { layoutPoints } = LQ.ui.map;
const NODE_SIZE = 64;
const AVATAR_HEADROOM = 82;

function minSpacing(points) {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return min;
}

test('map nodes stay apart and leave room for the hero above every node', () => {
  const sizes = [[1280, 600], [1024, 640], [800, 800], [600, 620], [390, 640], [360, 520], [320, 400], [844, 250], [667, 260]];
  for (const [width, height] of sizes) {
    const points = layoutPoints(width, height, 6);
    assert.equal(points.length, 6);
    for (const point of points) {
      assert.ok(point.x >= 0 && point.x <= width && point.y <= height, `node inside ${width}x${height}`);
      assert.ok(point.y >= AVATAR_HEADROOM - 1e-9, `room for the hero above the node at ${width}x${height}`);
    }
    assert.ok(minSpacing(points) >= NODE_SIZE, `nodes do not overlap at ${width}x${height} (${minSpacing(points).toFixed(1)})`);
  }
});

test('the path runs bottom-to-top on tall screens and left-to-right on wide ones', () => {
  const tall = layoutPoints(390, 640, 6);
  assert.ok(tall[0].y > tall[5].y, 'portrait starts at the bottom');
  const wide = layoutPoints(1280, 600, 6);
  assert.ok(wide[0].x < wide[5].x, 'landscape starts on the left');
});

test('a squat screen that would stack the nodes flips the path direction', () => {
  const squat = layoutPoints(320, 330, 6);
  assert.ok(squat[0].y > squat[5].y, 'switches to the vertical zigzag');
  assert.ok(minSpacing(squat) > 50);
});
