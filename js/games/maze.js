/* Love Quest · Trial 5 "The Labyrinth": a retro rose-garden maze with three floors. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  const TILE = 16;
  const WALL = 1;
  const FLOOR = 0;
  const VIEW_TILES = 11;

  const FLOORS = Object.freeze([
    { cols: 7, rows: 7, loops: 0.08, hearts: 8, ghosts: 0, ghostSpeed: 0, light: 0, item: null, theme: 'day' },
    { cols: 9, rows: 9, loops: 0.1, hearts: 10, ghosts: 1, ghostSpeed: 3.3, light: 3.6, item: 'torch', theme: 'dusk' },
    { cols: 11, rows: 11, loops: 0.12, hearts: 12, ghosts: 2, ghostSpeed: 3.7, light: 3.6, item: 'potion', theme: 'night' }
  ].map(Object.freeze));

  const PLAYER_SPEED = 6.5;
  const SCARED_SPEED_FACTOR = 0.6;
  const TORCH_LIGHT = 6.2;
  const POTION_SECONDS = 9;
  const INVULNERABLE_SECONDS = 2;
  const LIVES = 3;
  const CHASE_RADIUS = 7;
  const CHASE_CHANCE = 0.72;
  const GHOST_RESPAWN_SECONDS = 7;
  const HIT_DISTANCE = 0.7;
  const PAR_FACTOR = 2.6;
  const PAR_EXTRA_SECONDS = 12;
  const SCORE = Object.freeze({ heart: 10, key: 50, ghost: 100, floor: 150, timePerSecond: 4 });

  const THEMES = Object.freeze({
    day: {
      bg: '#203a26', path: '#e9d6b0', pathDark: '#d6be92', pathLight: '#f5e8cc', shadow: 'rgba(70, 45, 25, 0.28)',
      hedge: '#4f9a52', hedgeLight: '#6fb86a', hedgeDark: '#357a3c', face: '#2b6332', faceDark: '#1f4a26',
      flower: '#f07a92', flowerCenter: '#fff3e0', fog: null
    },
    dusk: {
      bg: '#1c2a2a', path: '#d8bf98', pathDark: '#c2a77d', pathLight: '#e8d4b2', shadow: 'rgba(40, 25, 30, 0.32)',
      hedge: '#3f8250', hedgeLight: '#5a9c62', hedgeDark: '#2e6640', face: '#244f34', faceDark: '#183a26',
      flower: '#e8738a', flowerCenter: '#f2c35b', fog: [40, 18, 46, 0.9]
    },
    night: {
      bg: '#0f1a1a', path: '#bba485', pathDark: '#a38c6e', pathLight: '#cdb899', shadow: 'rgba(20, 12, 24, 0.4)',
      hedge: '#2f6a48', hedgeLight: '#40815a', hedgeDark: '#22533a', face: '#1b412d', faceDark: '#112c1f',
      flower: '#d9546e', flowerCenter: '#a9d0ee', fog: [10, 6, 22, 0.95]
    }
  });

  /* ---------- pure maze logic (unit tested) ---------- */

  /** Perfect maze (iterative recursive backtracker) on a (2·cols+1)×(2·rows+1) tile grid. */
  function generateMaze(cols, rows, rng) {
    const width = cols * 2 + 1;
    const height = rows * 2 + 1;
    const grid = new Uint8Array(width * height).fill(WALL);
    const visited = new Uint8Array(cols * rows);
    const stack = [[0, 0]];
    visited[0] = 1;
    grid[width + 1] = FLOOR;
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const options = [];
      for (const [dx, dy] of steps) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !visited[ny * cols + nx]) options.push([nx, ny, dx, dy]);
      }
      if (!options.length) {
        stack.pop();
        continue;
      }
      const [nx, ny, dx, dy] = options[Math.floor(rng() * options.length)];
      visited[ny * cols + nx] = 1;
      grid[(cy * 2 + 1 + dy) * width + (cx * 2 + 1 + dx)] = FLOOR;
      grid[(ny * 2 + 1) * width + (nx * 2 + 1)] = FLOOR;
      stack.push([nx, ny]);
    }
    return { width, height, grid };
  }

  function isFloor(maze, x, y) {
    return x >= 0 && y >= 0 && x < maze.width && y < maze.height && maze.grid[y * maze.width + x] === FLOOR;
  }

  function floorNeighbors(maze, x, y) {
    let count = 0;
    for (const dir of U.DIR_NAMES) {
      if (isFloor(maze, x + U.DIRS[dir].x, y + U.DIRS[dir].y)) count++;
    }
    return count;
  }

  /** Breadth-first distances from (sx, sy); -1 = unreachable. blocked(index) may forbid tiles. */
  function bfs(maze, sx, sy, blocked) {
    const dist = new Int16Array(maze.width * maze.height).fill(-1);
    const start = sy * maze.width + sx;
    dist[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
      const index = queue[head];
      const x = index % maze.width;
      const y = (index - x) / maze.width;
      for (const dir of U.DIR_NAMES) {
        const nx = x + U.DIRS[dir].x;
        const ny = y + U.DIRS[dir].y;
        if (!isFloor(maze, nx, ny)) continue;
        const next = ny * maze.width + nx;
        if (dist[next] !== -1 || (blocked && blocked(next))) continue;
        dist[next] = dist[index] + 1;
        queue.push(next);
      }
    }
    return dist;
  }

  /** Opens some walls between corridors so the maze gets loops (never next to protected tiles). */
  function addLoops(maze, rng, factor, protectedIndexes) {
    const candidates = [];
    for (let y = 1; y < maze.height - 1; y++) {
      for (let x = 1; x < maze.width - 1; x++) {
        if (isFloor(maze, x, y)) continue;
        const vertical = x % 2 === 1 && y % 2 === 0;
        const horizontal = x % 2 === 0 && y % 2 === 1;
        if (!vertical && !horizontal) continue;
        const a = vertical ? [x, y - 1] : [x - 1, y];
        const b = vertical ? [x, y + 1] : [x + 1, y];
        if (!isFloor(maze, a[0], a[1]) || !isFloor(maze, b[0], b[1])) continue;
        if (protectedIndexes.has(a[1] * maze.width + a[0]) || protectedIndexes.has(b[1] * maze.width + b[0])) continue;
        candidates.push(y * maze.width + x);
      }
    }
    const opened = U.shuffle(candidates, rng).slice(0, Math.floor(candidates.length * factor));
    for (const index of opened) maze.grid[index] = FLOOR;
    return opened.length;
  }

  /** Builds a complete, solvable floor layout from a seed. */
  function buildFloor(config, seed) {
    const rng = U.createRng(seed);
    const maze = generateMaze(config.cols, config.rows, rng);
    const index = (x, y) => y * maze.width + x;
    const start = { x: 1, y: 1 };
    const cells = [];
    for (let y = 1; y < maze.height; y += 2) {
      for (let x = 1; x < maze.width; x += 2) cells.push({ x, y });
    }

    const fromStartPerfect = bfs(maze, start.x, start.y);
    let exit = null;
    for (const cell of cells) {
      if (cell.x === start.x && cell.y === start.y) continue;
      if (floorNeighbors(maze, cell.x, cell.y) !== 1) continue;
      if (!exit || fromStartPerfect[index(cell.x, cell.y)] > fromStartPerfect[index(exit.x, exit.y)]) exit = cell;
    }
    const exitIndex = index(exit.x, exit.y);
    addLoops(maze, rng, config.loops, new Set([exitIndex]));

    const blockedExit = (i) => i === exitIndex;
    const dist = bfs(maze, start.x, start.y, blockedExit);
    const fromExit = bfs(maze, exit.x, exit.y);
    const used = new Set([index(start.x, start.y), exitIndex]);
    const free = (cell) => !used.has(index(cell.x, cell.y)) && dist[index(cell.x, cell.y)] > 0;

    const keyCandidates = cells.filter(free)
      .map((cell) => ({ cell, score: Math.min(dist[index(cell.x, cell.y)], fromExit[index(cell.x, cell.y)]) }))
      .sort((a, b) => b.score - a.score);
    const top = keyCandidates.slice(0, Math.max(1, Math.floor(keyCandidates.length * 0.15)));
    const key = top[Math.floor(rng() * top.length)].cell;
    used.add(index(key.x, key.y));

    const maxDist = Math.max(...cells.map((cell) => dist[index(cell.x, cell.y)]));
    let item = null;
    if (config.item) {
      const target = maxDist * 0.4;
      const spot = cells.filter(free)
        .sort((a, b) => Math.abs(dist[index(a.x, a.y)] - target) - Math.abs(dist[index(b.x, b.y)] - target))[0];
      item = { type: config.item, x: spot.x, y: spot.y };
      used.add(index(spot.x, spot.y));
    }

    const ghostSpawns = [];
    const farCells = U.shuffle(cells.filter((cell) => free(cell) && dist[index(cell.x, cell.y)] >= maxDist * 0.5), rng);
    for (const cell of farCells) {
      if (ghostSpawns.length >= config.ghosts) break;
      if (ghostSpawns.some((other) => Math.abs(other.x - cell.x) + Math.abs(other.y - cell.y) < 6)) continue;
      ghostSpawns.push(cell);
    }
    for (const cell of farCells) {
      if (ghostSpawns.length >= config.ghosts) break;
      if (!ghostSpawns.includes(cell)) ghostSpawns.push(cell);
    }

    const deadEnds = U.shuffle(cells.filter((cell) => free(cell) && floorNeighbors(maze, cell.x, cell.y) === 1), rng);
    const others = U.shuffle(cells.filter((cell) => free(cell) && floorNeighbors(maze, cell.x, cell.y) !== 1), rng);
    const hearts = deadEnds.concat(others).slice(0, config.hearts);

    const keyDistance = dist[index(key.x, key.y)] + fromExit[index(key.x, key.y)];
    const par = Math.ceil((keyDistance / PLAYER_SPEED) * PAR_FACTOR + PAR_EXTRA_SECONDS);
    return { seed, maze, start, exit, key, item, hearts, ghostSpawns, par };
  }

  function starsFor(livesLost, totalTime, totalPar) {
    if (livesLost === 0 && totalTime <= totalPar) return 3;
    if (livesLost <= 1) return 2;
    return 1;
  }

  /* ---------- the game ---------- */

  function create(root, api) {
    const { scope, t, fx, audio, hud, sprites } = api;
    const canvas = U.el('canvas', { class: 'game-canvas game-canvas--maze', attrs: { role: 'img', 'aria-label': t('maze.aria') } });
    const pad = U.el('div', { class: 'dpad', attrs: { role: 'group', 'aria-label': t('maze.dpad') } }, [
      U.el('span', { class: 'dpad__arrow dpad__arrow--up', attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { class: 'dpad__arrow dpad__arrow--right', attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { class: 'dpad__arrow dpad__arrow--down', attrs: { 'aria-hidden': 'true' } }),
      U.el('span', { class: 'dpad__arrow dpad__arrow--left', attrs: { 'aria-hidden': 'true' } })
    ]);
    pad.hidden = !api.isTouch;
    const hint = U.el('div', { class: 'game-hint', text: api.isTouch ? t('maze.hint.touch') : t('maze.hint.keys') });
    root.append(canvas, pad, hint);
    const ctx = canvas.getContext('2d');
    const urlSeed = LQ.debug ? Number.parseInt(new URLSearchParams(window.location.search).get('seed'), 10) : NaN;
    const baseSeed = Number.isInteger(urlSeed) ? urlSeed >>> 0 : U.randomSeed();

    const state = {
      phase: 'loading',
      floorIndex: 0,
      layout: null,
      staticLayer: null,
      automap: null,
      automapDirty: true,
      explored: null,
      playerField: null,
      items: new Map(),
      ghosts: [],
      fireflies: [],
      player: null,
      lives: LIVES,
      livesLost: 0,
      score: 0,
      floorStartScore: 0,
      hasKey: false,
      light: 0,
      potionTimer: 0,
      floorTime: 0,
      totalTime: 0,
      totalPar: 0,
      ghostsHealed: 0,
      lockedNoticeCooldown: 0,
      shownSecond: -1,
      godMode: false,
      speedFactor: 1,
      doorOpen: false,
      runDir: null
    };
    let view = { width: 1, height: 1, dpr: 1, scale: 2, reserve: 0 };

    const input = LQ.input.createDirectionalInput(scope, {
      swipeTarget: canvas,
      pad,
      isActive: () => state.phase === 'play' && !api.paused && !LQ.ui.modal.isOpen()
    });

    hud.setStats([
      { id: 'floor', icon: '🗺️', value: `1/${FLOORS.length}`, label: t('hud.floor') },
      { id: 'lives', icon: '❤️', value: String(LIVES), label: t('hud.lives') },
      { id: 'score', icon: '💗', value: '0', label: t('hud.score') },
      { id: 'key', icon: '🔑', value: '✗', label: t('hud.key') },
      { id: 'time', icon: '⏱️', value: U.formatTime(0), label: t('hud.time') }
    ]);

    const floorConfig = () => FLOORS[state.floorIndex];
    const theme = () => THEMES[floorConfig().theme];
    const maze = () => state.layout.maze;
    const tileIndex = (x, y) => y * maze().width + x;

    /* ---------- static layer (hedges & paths), drawn once per floor ---------- */

    function renderStaticLayer() {
      const m = maze();
      const colors = theme();
      const layer = document.createElement('canvas');
      layer.width = m.width * TILE;
      layer.height = m.height * TILE;
      const g = layer.getContext('2d');
      const rng = U.createRng(state.layout.seed ^ 0x9e3779b9);
      const wallAt = (x, y) => !isFloor(m, x, y);
      const dot = (x, y, color, size) => {
        g.fillStyle = color;
        g.fillRect(x, y, size || 1, size || 1);
      };

      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          const px = x * TILE;
          const py = y * TILE;
          if (!wallAt(x, y)) {
            g.fillStyle = colors.path;
            g.fillRect(px, py, TILE, TILE);
            for (let i = 0; i < 6; i++) dot(px + Math.floor(rng() * 15), py + Math.floor(rng() * 15), colors.pathDark, rng() < 0.3 ? 2 : 1);
            for (let i = 0; i < 3; i++) dot(px + Math.floor(rng() * 15), py + Math.floor(rng() * 15), colors.pathLight);
            if (wallAt(x, y - 1)) {
              g.fillStyle = colors.shadow;
              g.fillRect(px, py, TILE, 4);
            }
            if (wallAt(x - 1, y)) {
              g.fillStyle = colors.shadow;
              g.fillRect(px, py, 2, TILE);
            }
            continue;
          }
          const faceVisible = !wallAt(x, y + 1);
          const topHeight = faceVisible ? 10 : TILE;
          g.fillStyle = colors.hedge;
          g.fillRect(px, py, TILE, topHeight);
          for (let i = 0; i < 16; i++) {
            const lx = px + Math.floor(rng() * 15);
            const ly = py + Math.floor(rng() * Math.max(1, topHeight - 1));
            dot(lx, ly, rng() < 0.55 ? colors.hedgeLight : colors.hedgeDark, rng() < 0.4 ? 2 : 1);
          }
          if (!wallAt(x, y - 1)) {
            g.fillStyle = colors.hedgeLight;
            g.fillRect(px, py, TILE, 1);
          }
          if (!wallAt(x - 1, y)) {
            g.fillStyle = colors.hedgeDark;
            g.fillRect(px, py, 1, topHeight);
          }
          if (!wallAt(x + 1, y)) {
            g.fillStyle = colors.hedgeDark;
            g.fillRect(px + TILE - 1, py, 1, topHeight);
          }
          if (rng() < 0.22) {
            const fx2 = px + 3 + Math.floor(rng() * 9);
            const fy2 = py + 2 + Math.floor(rng() * Math.max(1, topHeight - 5));
            dot(fx2, fy2, colors.flower, 3);
            dot(fx2 + 1, fy2 + 1, colors.flowerCenter);
          }
          if (faceVisible) {
            g.fillStyle = colors.face;
            g.fillRect(px, py + topHeight, TILE, TILE - topHeight);
            g.fillStyle = colors.faceDark;
            for (let sx = 1; sx < TILE; sx += 3) g.fillRect(px + sx, py + topHeight + 1, 1, TILE - topHeight - 1);
            g.fillRect(px, py + TILE - 1, TILE, 1);
          }
        }
      }
      state.staticLayer = layer;
    }

    /* ---------- exploration & automap ---------- */

    function markExplored(radius) {
      const m = maze();
      const { x: cx, y: cy } = state.player;
      const r = Math.ceil(radius);
      let changed = false;
      for (let y = Math.max(0, cy - r); y <= Math.min(m.height - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(m.width - 1, cx + r); x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > radius * radius) continue;
          const i = tileIndex(x, y);
          if (!state.explored[i]) {
            state.explored[i] = 1;
            changed = true;
          }
        }
      }
      if (changed) state.automapDirty = true;
    }

    function redrawAutomap() {
      const m = maze();
      const cell = U.clamp(Math.floor(Math.min(120, view.width * 0.28) / m.width), 2, 5) * view.dpr;
      const map = state.automap && state.automap.width === m.width * cell ? state.automap : document.createElement('canvas');
      map.width = m.width * cell;
      map.height = m.height * cell;
      const g = map.getContext('2d');
      g.clearRect(0, 0, map.width, map.height);
      for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
          if (!state.explored[tileIndex(x, y)]) continue;
          g.fillStyle = isFloor(m, x, y) ? 'rgba(255, 243, 226, 0.85)' : 'rgba(95, 150, 95, 0.9)';
          g.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      const { exit, key } = state.layout;
      if (state.explored[tileIndex(exit.x, exit.y)]) {
        g.fillStyle = '#e8576f';
        g.fillRect(exit.x * cell, exit.y * cell, cell, cell);
      }
      if (!state.hasKey && state.explored[tileIndex(key.x, key.y)]) {
        g.fillStyle = '#f2c35b';
        g.fillRect(key.x * cell, key.y * cell, cell, cell);
      }
      map.cell = cell;
      state.automap = map;
      state.automapDirty = false;
    }

    /* ---------- floors ---------- */

    function loadFloor(index) {
      state.floorIndex = index;
      const config = floorConfig();
      state.layout = buildFloor(config, (baseSeed + index * 7919) >>> 0);
      const m = maze();
      state.phase = 'play';
      state.lives = LIVES;
      state.hasKey = false;
      state.doorOpen = false;
      state.light = config.light;
      state.potionTimer = 0;
      state.floorTime = 0;
      state.floorStartScore = state.score;
      state.runDir = null;
      state.explored = new Uint8Array(m.width * m.height);
      if (!config.light) state.explored.fill(1);
      state.automapDirty = true;
      state.items = new Map();
      for (const heart of state.layout.hearts) state.items.set(tileIndex(heart.x, heart.y), { type: 'heart', x: heart.x, y: heart.y, phase: Math.random() * 6 });
      const { key, item } = state.layout;
      state.items.set(tileIndex(key.x, key.y), { type: 'key', x: key.x, y: key.y, phase: 0 });
      if (item) state.items.set(tileIndex(item.x, item.y), { type: item.type, x: item.x, y: item.y, phase: 0 });
      state.player = {
        x: state.layout.start.x, y: state.layout.start.y, fromX: 0, fromY: 0, toX: 0, toY: 0,
        t: 0, moving: false, dir: 'down', walkTime: 0, invulnerable: 0
      };
      state.ghosts = state.layout.ghostSpawns.map((spawn, i) => ({
        x: spawn.x, y: spawn.y, spawnX: spawn.x, spawnY: spawn.y, fromX: spawn.x, fromY: spawn.y, toX: spawn.x, toY: spawn.y,
        t: 0, moving: false, dir: 'left', speed: config.ghostSpeed, stun: 1.5 + i, mode: 'roam', respawn: 0, phase: Math.random() * 6
      }));
      state.fireflies = config.theme === 'day' ? [] : Array.from({ length: 14 }, () => ({
        x: Math.random() * m.width * TILE, y: Math.random() * m.height * TILE,
        vx: U.rand(-6, 6), vy: U.rand(-6, 6), phase: Math.random() * 6
      }));
      input.reset();
      renderStaticLayer();
      markExplored(state.light ? state.light + 0.5 : 0);
      updateField();
      updateHud();
      hud.set('floor', `${index + 1}/${FLOORS.length}`);
      hud.set('key', '✗');
      api.banner(`${t('maze.floor', { n: index + 1, total: FLOORS.length })} · ${t(`maze.floorName.${index + 1}`)}`, {
        duration: 2600,
        sub: `${t(`maze.floorHint.${index + 1}`)}  ·  ${t('maze.par', { time: U.formatTime(state.layout.par) })}`
      });
    }

    function updateHud() {
      hud.set('lives', String(state.lives));
      hud.set('score', U.formatNumber(state.score));
      hud.set('key', state.hasKey ? '✓' : '✗');
    }

    function updateField() {
      const exitIndex = tileIndex(state.layout.exit.x, state.layout.exit.y);
      state.playerField = bfs(maze(), state.player.x, state.player.y, (i) => i === exitIndex);
    }

    /* ---------- helpers ---------- */

    function entityPosition(entity) {
      if (!entity.moving) return { x: entity.x, y: entity.y };
      return { x: U.lerp(entity.fromX, entity.toX, entity.t), y: U.lerp(entity.fromY, entity.toY, entity.t) };
    }

    function toClient(tileX, tileY) {
      const rect = canvas.getBoundingClientRect();
      const cam = camera();
      return {
        x: rect.left + (cam.offX + (tileX + 0.5) * TILE * view.scale) / view.dpr,
        y: rect.top + (cam.offY + (tileY + 0.5) * TILE * view.scale) / view.dpr
      };
    }

    function playerCanEnter(x, y) {
      if (!isFloor(maze(), x, y)) return false;
      const { exit } = state.layout;
      return !(x === exit.x && y === exit.y) || state.hasKey;
    }

    function ghostCanEnter(x, y) {
      const { exit } = state.layout;
      return isFloor(maze(), x, y) && !(x === exit.x && y === exit.y);
    }

    /* ---------- player ---------- */

    function tryMove(dir) {
      const p = state.player;
      const nx = p.x + U.DIRS[dir].x;
      const ny = p.y + U.DIRS[dir].y;
      p.dir = dir;
      if (!playerCanEnter(nx, ny)) {
        const { exit } = state.layout;
        if (nx === exit.x && ny === exit.y && state.lockedNoticeCooldown <= 0) {
          state.lockedNoticeCooldown = 1.6;
          audio.play('locked');
          const client = toClient(nx, ny);
          fx.floatText(client.x, client.y - 20, t('maze.locked'), 'float-text--bad');
        }
        return false;
      }
      p.fromX = p.x;
      p.fromY = p.y;
      p.toX = nx;
      p.toY = ny;
      p.t = 0;
      p.moving = true;
      return true;
    }

    /** Keyboard/pad: newest held key first (older keys allow cornering). Swipes keep running Pac-Man style. */
    function chooseMove() {
      const held = input.heldDirs();
      if (held.length) {
        state.runDir = null;
        input.clearSwipe();
        for (const dir of held) {
          if (tryMove(dir)) return true;
        }
        return false;
      }
      const wanted = input.swipeDir;
      if (wanted) {
        if (tryMove(wanted)) {
          state.runDir = wanted;
          return true;
        }
        if (state.runDir && state.runDir !== wanted && tryMove(state.runDir)) return true;
        input.clearSwipe();
        state.runDir = null;
      }
      return false;
    }

    function arrive() {
      const p = state.player;
      p.x = p.toX;
      p.y = p.toY;
      p.moving = false;
      markExplored(state.light ? state.light + 0.5 : 0);
      updateField();
      const item = state.items.get(tileIndex(p.x, p.y));
      if (item) {
        state.items.delete(tileIndex(p.x, p.y));
        collect(item);
      }
      const { exit } = state.layout;
      if (p.x === exit.x && p.y === exit.y) clearFloor();
    }

    function updatePlayer(dt) {
      const p = state.player;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      let budget = dt * PLAYER_SPEED * state.speedFactor;
      let guard = 0;
      while (budget > 0 && guard++ < 4 && state.phase === 'play') {
        if (!p.moving && !chooseMove()) break;
        const step = Math.min(budget, 1 - p.t);
        p.t += step;
        budget -= step;
        if (p.t >= 1 - 1e-6) arrive();
      }
      if (p.moving) p.walkTime += dt;
    }

    function collect(item) {
      const client = toClient(item.x, item.y);
      switch (item.type) {
        case 'heart':
          state.score += SCORE.heart;
          audio.play('collect', 2);
          fx.burst(client.x, client.y, { count: 8, speed: 140 });
          fx.floatText(client.x, client.y - 18, `+${SCORE.heart}`);
          break;
        case 'key':
          state.hasKey = true;
          state.score += SCORE.key;
          state.automapDirty = true;
          audio.play('key');
          fx.sparkle(client.x, client.y, 20);
          api.banner(t('maze.keyFound'), { duration: 1700, tone: 'gold' });
          hud.pulse('key');
          break;
        case 'torch':
          state.light = TORCH_LIGHT;
          audio.play('powerup');
          fx.sparkle(client.x, client.y, 18);
          api.banner(t('maze.torch'), { duration: 1700, tone: 'gold' });
          markExplored(state.light + 0.5);
          break;
        case 'potion':
          state.potionTimer = POTION_SECONDS;
          audio.play('powerup');
          fx.hearts(client.x, client.y, 10);
          api.banner(t('maze.potion'), { duration: 1700, tone: 'gold' });
          break;
        default:
          break;
      }
      hud.pulse('score');
      updateHud();
    }

    /* ---------- ghosts ---------- */

    function chooseGhostStep(ghost) {
      const options = U.DIR_NAMES.filter((dir) => ghostCanEnter(ghost.x + U.DIRS[dir].x, ghost.y + U.DIRS[dir].y));
      if (!options.length) return;
      const field = state.playerField;
      const fieldAt = (dir) => {
        const value = field[tileIndex(ghost.x + U.DIRS[dir].x, ghost.y + U.DIRS[dir].y)];
        return value < 0 ? 9999 : value;
      };
      const here = field[tileIndex(ghost.x, ghost.y)];
      let choice;
      if (state.potionTimer > 0) {
        choice = options.reduce((best, dir) => (fieldAt(dir) > fieldAt(best) ? dir : best), options[0]);
      } else if (here >= 0 && here <= CHASE_RADIUS && Math.random() < CHASE_CHANCE) {
        choice = options.reduce((best, dir) => (fieldAt(dir) < fieldAt(best) ? dir : best), options[0]);
      } else {
        const forward = options.length > 1 ? options.filter((dir) => dir !== U.OPPOSITE[ghost.dir]) : options;
        choice = U.pick(forward);
      }
      ghost.dir = choice;
      ghost.fromX = ghost.x;
      ghost.fromY = ghost.y;
      ghost.toX = ghost.x + U.DIRS[choice].x;
      ghost.toY = ghost.y + U.DIRS[choice].y;
      ghost.t = 0;
      ghost.moving = true;
    }

    function updateGhosts(dt) {
      for (const ghost of state.ghosts) {
        if (ghost.mode === 'healed') {
          ghost.respawn -= dt;
          if (ghost.respawn <= 0) {
            Object.assign(ghost, { mode: 'roam', x: ghost.spawnX, y: ghost.spawnY, moving: false, t: 0, stun: 1.2 });
          }
          continue;
        }
        if (ghost.stun > 0) {
          ghost.stun -= dt;
          continue;
        }
        const speed = ghost.speed * (state.potionTimer > 0 ? SCARED_SPEED_FACTOR : 1);
        let budget = dt * speed;
        let guard = 0;
        while (budget > 0 && guard++ < 3) {
          if (!ghost.moving) chooseGhostStep(ghost);
          if (!ghost.moving) break;
          const step = Math.min(budget, 1 - ghost.t);
          ghost.t += step;
          budget -= step;
          if (ghost.t >= 1 - 1e-6) {
            ghost.x = ghost.toX;
            ghost.y = ghost.toY;
            ghost.moving = false;
          }
        }
      }
    }

    function healGhost(ghost) {
      const position = entityPosition(ghost);
      const client = toClient(position.x, position.y);
      ghost.mode = 'healed';
      ghost.respawn = GHOST_RESPAWN_SECONDS;
      ghost.moving = false;
      state.ghostsHealed++;
      state.score += SCORE.ghost;
      audio.play('heal');
      fx.hearts(client.x, client.y, 12);
      fx.floatText(client.x, client.y - 22, `+${SCORE.ghost} ${t('maze.healed')}`, 'float-text--gold');
      api.achieve('healer');
      updateHud();
    }

    function hurt(ghost) {
      state.lives--;
      state.livesLost++;
      state.player.invulnerable = INVULNERABLE_SECONDS;
      ghost.stun = 1.4;
      audio.play('hurt');
      audio.vibrate([60, 40, 60]);
      fx.shake(root, 1);
      fx.flash('rgba(232, 87, 111, 0.35)');
      hud.pulse('lives', 'bad');
      updateHud();
      if (state.lives > 0) {
        const client = toClient(state.player.x, state.player.y);
        fx.floatText(client.x, client.y - 26, t('maze.ouch'), 'float-text--bad');
        return;
      }
      state.phase = 'dead';
      audio.play('bad');
      api.banner(t('maze.heartbroken'), { duration: 1800 });
      scope.timeout(() => {
        state.score = state.floorStartScore;
        loadFloor(state.floorIndex);
      }, 1900);
    }

    function checkGhostCollisions() {
      if (state.godMode) return;
      const p = entityPosition(state.player);
      for (const ghost of state.ghosts) {
        if (ghost.mode === 'healed' || state.phase !== 'play') continue;
        const g = entityPosition(ghost);
        if (Math.hypot(p.x - g.x, p.y - g.y) >= HIT_DISTANCE) continue;
        if (state.potionTimer > 0) healGhost(ghost);
        else if (state.player.invulnerable <= 0 && ghost.stun <= 0) hurt(ghost);
      }
    }

    /* ---------- floor clear & finish ---------- */

    function clearFloor() {
      state.phase = 'clear';
      state.doorOpen = true;
      const timeBonus = Math.max(0, Math.round((state.layout.par - state.floorTime) * SCORE.timePerSecond));
      state.score += SCORE.floor + timeBonus;
      state.totalPar += state.layout.par;
      updateHud();
      const client = toClient(state.layout.exit.x, state.layout.exit.y);
      fx.sparkle(client.x, client.y, 26);
      const lastFloor = state.floorIndex === FLOORS.length - 1;
      if (!lastFloor) {
        audio.play('floorClear');
        api.banner(t('maze.floorClear'), { duration: 1500, tone: 'gold', sub: `+${SCORE.floor + timeBonus} ${t('common.lp')}` });
        scope.timeout(() => loadFloor(state.floorIndex + 1), 1700);
        return;
      }
      /* The hero stops in front of the gate; the beloved appears in the doorway. */
      const p = state.player;
      p.x = p.fromX;
      p.y = p.fromY;
      audio.play('door');
      fx.heartRain(2600);
      fx.hearts(client.x, client.y, 16);
      api.banner(t('maze.found', { name: api.content.belovedName }), { duration: 2400, tone: 'gold' });
      state.phase = 'won';
      api.achieve('mazeRunner');
      if (state.livesLost === 0) api.achieve('untouchable');
      scope.timeout(() => {
        api.finish({ score: state.score, stars: starsFor(state.livesLost, state.totalTime, state.totalPar), delay: 300 });
      }, 2300);
    }

    /* ---------- update ---------- */

    function update(dt) {
      if (input.pollGamepad()) api.pause();
      for (const firefly of state.fireflies) {
        firefly.phase += dt;
        firefly.x += (firefly.vx + Math.sin(firefly.phase * 0.7) * 8) * dt;
        firefly.y += (firefly.vy + Math.cos(firefly.phase * 0.5) * 8) * dt;
        const m = maze();
        if (firefly.x < 0 || firefly.x > m.width * TILE) firefly.vx *= -1;
        if (firefly.y < 0 || firefly.y > m.height * TILE) firefly.vy *= -1;
      }
      if (state.phase !== 'play') return;

      state.floorTime += dt;
      state.totalTime += dt;
      state.lockedNoticeCooldown = Math.max(0, state.lockedNoticeCooldown - dt);
      const second = Math.floor(state.totalTime);
      if (second !== state.shownSecond) {
        state.shownSecond = second;
        hud.set('time', U.formatTime(second));
      }
      if (state.potionTimer > 0) state.potionTimer = Math.max(0, state.potionTimer - dt);

      updatePlayer(dt);
      if (state.phase !== 'play') return;
      updateGhosts(dt);
      checkGhostCollisions();
    }

    /* ---------- render ---------- */

    function camera() {
      const m = maze();
      const s = view.scale;
      const worldW = m.width * TILE * s;
      const worldH = m.height * TILE * s;
      const viewW = canvas.width;
      const viewH = canvas.height;
      const p = entityPosition(state.player);
      const centerX = (p.x + 0.5) * TILE * s;
      const centerY = (p.y + 0.5) * TILE * s;
      const offX = worldW <= viewW ? Math.round((viewW - worldW) / 2) : Math.round(U.clamp(viewW / 2 - centerX, viewW - worldW, 0));
      /* On touch screens the hero always stays above the direction pad. */
      const usableH = viewH - view.reserve;
      const offY = worldH <= usableH
        ? Math.round((usableH - worldH) / 2)
        : Math.round(U.clamp(usableH / 2 - centerY, usableH - worldH, 0));
      return { offX, offY };
    }

    function drawSprite(sprite, worldX, worldY) {
      const s = view.scale;
      ctx.drawImage(sprite, Math.round(worldX * s) / s, Math.round(worldY * s) / s);
    }

    function render(now) {
      if (!state.layout) return;
      const colors = theme();
      const s = view.scale;
      const { offX, offY } = camera();
      const time = now / 1000;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(s, 0, 0, s, offX, offY);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(state.staticLayer, 0, 0);

      const { exit } = state.layout;
      const lastFloor = state.floorIndex === FLOORS.length - 1;
      if (state.hasKey && !state.doorOpen) {
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 5);
        ctx.fillStyle = '#ffe29a';
        ctx.fillRect(exit.x * TILE - 2, exit.y * TILE - 2, TILE + 4, TILE + 4);
        ctx.globalAlpha = 1;
      }
      drawSprite(sprites.item(state.doorOpen ? 'doorOpen' : 'door'), exit.x * TILE, exit.y * TILE);

      for (const item of state.items.values()) {
        const bob = Math.round(Math.sin(time * 3 + item.phase) * 1.5);
        let sprite;
        if (item.type === 'heart') sprite = sprites.item('heartSmall');
        else if (item.type === 'key') sprite = sprites.item('key');
        else if (item.type === 'torch') sprite = sprites.item(Math.floor(time * 6) % 2 ? 'torchFlicker' : 'torch');
        else sprite = sprites.item('potion');
        if (item.type !== 'heart') {
          ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 4);
          ctx.fillStyle = '#fff3c4';
          ctx.beginPath();
          ctx.arc(item.x * TILE + 8, item.y * TILE + 8, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        drawSprite(sprite, item.x * TILE + (TILE - sprite.width) / 2, item.y * TILE + (TILE - sprite.height) / 2 + bob);
      }

      const actors = [];
      for (const ghost of state.ghosts) {
        if (ghost.mode !== 'healed') actors.push({ kind: 'ghost', ghost, ...entityPosition(ghost) });
      }
      actors.push({ kind: 'player', ...entityPosition(state.player) });
      if (lastFloor && state.doorOpen) actors.push({ kind: 'beloved', x: exit.x, y: exit.y });
      actors.sort((a, b) => a.y - b.y);

      for (const actor of actors) {
        if (actor.kind === 'ghost') {
          const scared = state.potionTimer > 0 && !(state.potionTimer < 2 && Math.floor(time * 8) % 2 === 0);
          const frame = Math.floor(time * 3 + actor.ghost.phase) % 2 ? 'ghostWobble' : 'ghost';
          const bob = Math.sin(time * 4 + actor.ghost.phase) * 1.5;
          ctx.globalAlpha = actor.ghost.stun > 0 ? 0.6 : 0.92;
          drawSprite(sprites.item(frame, scared ? 'scared' : 'normal'), actor.x * TILE, actor.y * TILE - 4 + bob);
          ctx.globalAlpha = 1;
        } else if (actor.kind === 'player') {
          const p = state.player;
          if (p.invulnerable > 0 && Math.floor(p.invulnerable * 10) % 2 === 0) continue;
          const step = p.moving ? LQ.sprites.walkStep(p.walkTime) : 0;
          drawSprite(sprites.hero(api.hero.avatar, p.dir, step), actor.x * TILE, actor.y * TILE - 4);
        } else {
          drawSprite(sprites.hero(api.content.belovedAvatar, 'down', 0), actor.x * TILE, actor.y * TILE - 4);
          const heart = sprites.item('heartSmall');
          const pulse = Math.round(Math.sin(time * 4) * 1.5);
          drawSprite(heart, actor.x * TILE + 4.5, actor.y * TILE - 13 + pulse);
        }
      }

      const fog = colors.fog;
      if (fog && state.light > 0) {
        const p = entityPosition(state.player);
        const flicker = 1 + Math.sin(time * 7) * 0.02 + Math.sin(time * 13) * 0.01;
        const radius = state.light * TILE * s * flicker;
        const cx = offX + (p.x + 0.5) * TILE * s;
        const cy = offY + (p.y + 0.5) * TILE * s;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
        const [r, g, b, a] = fog;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${a * 0.55})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${a})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'lighter';
        for (const firefly of state.fireflies) {
          const glow = 0.45 + 0.4 * Math.sin(firefly.phase * 3);
          const fxp = offX + firefly.x * s;
          const fyp = offY + firefly.y * s;
          ctx.globalAlpha = glow * 0.35;
          ctx.fillStyle = '#ffe9a8';
          ctx.beginPath();
          ctx.arc(fxp, fyp, 3 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = glow;
          ctx.fillRect(fxp - s / 2, fyp - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
        for (const ghost of state.ghosts) {
          if (ghost.mode === 'healed') continue;
          const gp = entityPosition(ghost);
          const distance = Math.hypot(gp.x - p.x, gp.y - p.y);
          if (distance < state.light * 0.75 || distance > state.light + 5) continue;
          const gx = offX + (gp.x * TILE + 5) * s;
          const gy = offY + (gp.y * TILE + 2 + Math.sin(time * 4 + ghost.phase) * 1.5) * s;
          ctx.fillStyle = state.potionTimer > 0 ? '#a9d0ee' : '#f7b3c2';
          ctx.fillRect(gx, gy, s, s);
          ctx.fillRect(gx + 6 * s, gy, s, s);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (state.automapDirty) redrawAutomap();
      const map = state.automap;
      if (map) {
        const pad = 8 * view.dpr;
        const x = canvas.width - map.width - pad * 1.5;
        const y = pad * 1.5;
        ctx.fillStyle = 'rgba(30, 14, 22, 0.6)';
        ctx.fillRect(x - pad / 2, y - pad / 2, map.width + pad, map.height + pad);
        ctx.drawImage(map, x, y);
        if (Math.floor(time * 4) % 2 === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + state.player.x * map.cell, y + state.player.y * map.cell, map.cell, map.cell);
        }
      }
    }

    function resize() {
      const size = U.fitCanvas(canvas, 3);
      const deviceMin = Math.min(size.width, size.height) * size.dpr;
      const reserve = pad.hidden ? 0 : Math.round((pad.offsetHeight + 24) * size.dpr);
      view = { ...size, reserve, scale: Math.max(1, Math.round(deviceMin / (TILE * VIEW_TILES))) };
      state.automapDirty = true;
    }

    U.observeResize(scope, root, resize);
    resize();
    loadFloor(0);
    api.loop(update, render).start();
    scope.timeout(() => hint.classList.add('is-hidden'), 5000);

    return {
      debug: {
        state,
        layout: () => state.layout,
        /** Shortest list of directions from the player to (x, y). */
        pathTo(x, y) {
          const m = maze();
          const exitIndex = tileIndex(state.layout.exit.x, state.layout.exit.y);
          const target = tileIndex(x, y);
          const dist = bfs(m, x, y, (i) => i === exitIndex && i !== target && !state.hasKey);
          const path = [];
          let cx = state.player.x;
          let cy = state.player.y;
          for (let guard = 0; guard < m.width * m.height && tileIndex(cx, cy) !== target; guard++) {
            const here = dist[tileIndex(cx, cy)];
            const next = U.DIR_NAMES.find((dir) => {
              const nx = cx + U.DIRS[dir].x;
              const ny = cy + U.DIRS[dir].y;
              return isFloor(m, nx, ny) && dist[tileIndex(nx, ny)] === here - 1;
            });
            if (!next) return null;
            path.push(next);
            cx += U.DIRS[next].x;
            cy += U.DIRS[next].y;
          }
          return path;
        },
        setGodMode(on) {
          state.godMode = Boolean(on);
        },
        setSpeed(factor) {
          state.speedFactor = factor;
        }
      }
    };
  }

  function starGoals() {
    return [LQ.t('level.maze.star1'), LQ.t('level.maze.star2'), LQ.t('level.maze.star3')];
  }

  LQ.games = LQ.games || {};
  LQ.games.maze = {
    create,
    starGoals,
    logic: { generateMaze, buildFloor, bfs, addLoops, isFloor, floorNeighbors, starsFor, FLOORS, WALL, FLOOR }
  };
})(globalThis.LQ = globalThis.LQ || {});
