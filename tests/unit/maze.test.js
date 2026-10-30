'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const LQ = load('js/core/utils.js', 'js/games/maze.js');
const U = LQ.utils;
const { generateMaze, buildFloor, bfs, isFloor, floorNeighbors, starsFor, FLOORS, FLOOR } = LQ.games.maze.logic;

const SEEDS = Array.from({ length: 60 }, (_, i) => (i * 2654435761) >>> 0);

test('generateMaze builds a perfect maze (a spanning tree of all cells)', () => {
  for (const seed of SEEDS.slice(0, 20)) {
    const maze = generateMaze(9, 7, U.createRng(seed));
    assert.equal(maze.width, 19);
    assert.equal(maze.height, 15);
    let floors = 0;
    for (let i = 0; i < maze.grid.length; i++) if (maze.grid[i] === FLOOR) floors++;
    const cells = 9 * 7;
    assert.equal(floors, cells + (cells - 1), 'cells plus one passage per tree edge');
    for (let x = 0; x < maze.width; x++) {
      assert.equal(isFloor(maze, x, 0), false);
      assert.equal(isFloor(maze, x, maze.height - 1), false);
    }
    const dist = bfs(maze, 1, 1);
    for (let i = 0; i < maze.grid.length; i++) {
      if (maze.grid[i] === FLOOR) assert.ok(dist[i] >= 0, 'every corridor is reachable');
    }
  }
});

test('generateMaze is deterministic for a seed', () => {
  const a = generateMaze(11, 11, U.createRng(99));
  const b = generateMaze(11, 11, U.createRng(99));
  assert.deepEqual(Array.from(a.grid), Array.from(b.grid));
});

test('every floor layout is complete and solvable', () => {
  for (const config of FLOORS) {
    for (const seed of SEEDS) {
      const floor = buildFloor(config, seed);
      const { maze, start, exit, key, item, hearts, ghostSpawns, par } = floor;
      const index = (p) => p.y * maze.width + p.x;
      const exitIndex = index(exit);

      assert.equal(floorNeighbors(maze, exit.x, exit.y), 1, 'the exit is a dead end');
      const dist = bfs(maze, start.x, start.y, (i) => i === exitIndex);
      for (let i = 0; i < maze.grid.length; i++) {
        if (maze.grid[i] === FLOOR && i !== exitIndex) assert.ok(dist[i] >= 0, `tile ${i} unreachable (seed ${seed})`);
      }
      const withKey = bfs(maze, start.x, start.y);
      assert.ok(withKey[exitIndex] > 0, 'the exit opens with the key');

      const special = [index(start), exitIndex, index(key)];
      if (item) {
        assert.equal(item.type, config.item);
        special.push(index(item));
      } else {
        assert.equal(config.item, null);
      }
      assert.equal(new Set(special).size, special.length, 'special tiles do not overlap');
      for (const p of [key, item].filter(Boolean)) assert.ok(dist[index(p)] > 0);

      assert.equal(hearts.length, config.hearts);
      const heartTiles = new Set(hearts.map(index));
      assert.equal(heartTiles.size, hearts.length);
      for (const tile of heartTiles) {
        assert.ok(!special.includes(tile), 'hearts avoid special tiles');
        assert.ok(dist[tile] > 0);
      }

      assert.equal(ghostSpawns.length, config.ghosts);
      let maxDist = 0;
      for (let y = 1; y < maze.height; y += 2) {
        for (let x = 1; x < maze.width; x += 2) maxDist = Math.max(maxDist, dist[y * maze.width + x]);
      }
      for (const spawn of ghostSpawns) {
        assert.ok(dist[index(spawn)] >= maxDist * 0.5, 'ghosts spawn far from the start');
        assert.ok(!special.includes(index(spawn)));
      }
      assert.ok(Number.isInteger(par) && par > 12);
    }
  }
});

test('a layout is reproducible from its seed', () => {
  const a = buildFloor(FLOORS[2], 1234);
  const b = buildFloor(FLOORS[2], 1234);
  assert.deepEqual(Array.from(a.maze.grid), Array.from(b.maze.grid));
  assert.deepEqual([a.exit, a.key, a.item, a.hearts, a.ghostSpawns, a.par], [b.exit, b.key, b.item, b.hearts, b.ghostSpawns, b.par]);
});

test('bfs respects blocked tiles', () => {
  const maze = generateMaze(5, 5, U.createRng(5));
  const dist = bfs(maze, 1, 1, () => true);
  assert.equal(dist[maze.width + 1], 0);
  assert.equal(Array.from(dist).filter((d) => d > 0).length, 0);
});

test('maze stars reward no damage and speed', () => {
  assert.equal(starsFor(0, 100, 120), 3);
  assert.equal(starsFor(0, 130, 120), 2);
  assert.equal(starsFor(1, 50, 120), 2);
  assert.equal(starsFor(2, 50, 120), 1);
});
