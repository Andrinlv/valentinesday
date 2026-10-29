/* Love Quest · shared utilities: DOM helpers, math, randomness and lifecycle scopes. */
(function (LQ) {
  'use strict';

  const noop = () => {};

  const DIRS = Object.freeze({
    up: Object.freeze({ x: 0, y: -1 }),
    down: Object.freeze({ x: 0, y: 1 }),
    left: Object.freeze({ x: -1, y: 0 }),
    right: Object.freeze({ x: 1, y: 0 })
  });

  const OPPOSITE = Object.freeze({ up: 'down', down: 'up', left: 'right', right: 'left' });

  let segmenter = null;

  function safeCall(fn) {
    try {
      fn();
    } catch (err) {
      console.error('[LoveQuest] cleanup failed:', err);
    }
  }

  const U = {
    noop,
    DIRS,
    OPPOSITE,
    DIR_NAMES: Object.freeze(['up', 'right', 'down', 'left']),

    $(selector, root) {
      return (root || document).querySelector(selector);
    },

    $$(selector, root) {
      return Array.from((root || document).querySelectorAll(selector));
    },

    /**
     * Creates a DOM element.
     * props: class, text, attrs, dataset, style, on (event map) or any element property.
     * Text is always inserted as text, never parsed as HTML.
     */
    el(tag, props, children) {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(props || {})) {
        if (value === undefined || value === null || value === false) continue;
        switch (key) {
          case 'class': node.className = value; break;
          case 'text': node.textContent = String(value); break;
          case 'attrs':
            for (const [name, attr] of Object.entries(value)) {
              if (attr !== undefined && attr !== null && attr !== false) node.setAttribute(name, String(attr));
            }
            break;
          case 'dataset': Object.assign(node.dataset, value); break;
          case 'style':
            for (const [name, style] of Object.entries(value)) {
              if (name.startsWith('--')) node.style.setProperty(name, style);
              else node.style[name] = style;
            }
            break;
          case 'on':
            for (const [type, handler] of Object.entries(value)) node.addEventListener(type, handler);
            break;
          default: node[key] = value;
        }
      }
      for (const child of [].concat(children === undefined ? [] : children)) {
        if (child === null || child === undefined || child === false) continue;
        node.append(child instanceof Node ? child : String(child));
      }
      return node;
    },

    clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    },

    lerp(a, b, t) {
      return a + (b - a) * t;
    },

    rand(min, max, rng) {
      return min + (rng || Math.random)() * (max - min);
    },

    /** Random integer in [min, max] (both inclusive). */
    randInt(min, max, rng) {
      return Math.floor(min + (rng || Math.random)() * (max - min + 1));
    },

    pick(list, rng) {
      return list[Math.floor((rng || Math.random)() * list.length)];
    },

    /** Returns a shuffled copy (Fisher–Yates). */
    shuffle(list, rng) {
      const random = rng || Math.random;
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },

    /** Picks an entry from [{ weight, ... }] proportionally to its weight. */
    weightedPick(entries, rng) {
      const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = (rng || Math.random)() * total;
      for (const entry of entries) {
        roll -= entry.weight;
        if (roll < 0) return entry;
      }
      return entries[entries.length - 1];
    },

    /** Small, fast, deterministic PRNG (mulberry32). Returns floats in [0, 1). */
    createRng(seed) {
      let state = seed >>> 0;
      return function next() {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    randomSeed() {
      return Math.floor(Math.random() * 0xffffffff) >>> 0;
    },

    distance(ax, ay, bx, by) {
      return Math.hypot(bx - ax, by - ay);
    },

    ease: Object.freeze({
      linear: (t) => t,
      inQuad: (t) => t * t,
      outQuad: (t) => 1 - (1 - t) * (1 - t),
      outCubic: (t) => 1 - Math.pow(1 - t, 3),
      inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
      outBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }
    }),

    /** 75 → "1:15" */
    formatTime(seconds) {
      const total = Math.max(0, Math.floor(seconds));
      const minutes = Math.floor(total / 60);
      const rest = total % 60;
      return `${minutes}:${String(rest).padStart(2, '0')}`;
    },

    formatNumber(value) {
      const locale = LQ.i18n ? LQ.i18n.locale() : 'en-US';
      return Math.round(value).toLocaleString(locale);
    },

    /** Splits text into user-perceived characters, so emoji and accents are never cut in half. */
    graphemes(text) {
      const value = String(text);
      if (!segmenter && typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
        segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      }
      return segmenter ? Array.from(segmenter.segment(value), (part) => part.segment) : Array.from(value);
    },

    /** Shortens text to at most max user-perceived characters. */
    truncate(text, max) {
      const value = String(text);
      return value.length <= max ? value : U.graphemes(value).slice(0, max).join('');
    },

    /**
     * Resolves once the given CSS font specs are usable: waits for the non-blocking font stylesheet
     * (#font-css), then loads the faces. Never takes longer than timeoutMs.
     */
    whenFontsReady(specs, timeoutMs) {
      if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') {
        return Promise.resolve();
      }
      const link = document.getElementById('font-css');
      const sheetReady = !link || link.sheet ? Promise.resolve() : new Promise((resolve) => {
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
      });
      const loading = sheetReady.then(() => Promise.all(specs.map((spec) => document.fonts.load(spec)))).catch(() => undefined);
      return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    },

    prefersReducedMotion() {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    isCoarsePointer() {
      return typeof matchMedia === 'function' &&
        (matchMedia('(pointer: coarse)').matches || matchMedia('(any-pointer: coarse)').matches);
    },

    /**
     * A scope collects cleanup callbacks (listeners, timers, loops, child scopes)
     * so a whole scene or game can be torn down with a single dispose() call.
     */
    createScope() {
      const disposers = new Set();
      let disposed = false;

      const scope = {
        get disposed() {
          return disposed;
        },

        /** Registers a cleanup callback. Returns a function that unregisters it. */
        add(fn) {
          if (disposed) {
            safeCall(fn);
            return noop;
          }
          disposers.add(fn);
          return () => disposers.delete(fn);
        },

        on(target, type, handler, options) {
          target.addEventListener(type, handler, options);
          return scope.add(() => target.removeEventListener(type, handler, options));
        },

        timeout(fn, ms) {
          if (disposed) return noop;
          let unregister = noop;
          const id = setTimeout(() => {
            unregister();
            fn();
          }, ms);
          unregister = scope.add(() => clearTimeout(id));
          return () => {
            clearTimeout(id);
            unregister();
          };
        },

        interval(fn, ms) {
          if (disposed) return noop;
          const id = setInterval(fn, ms);
          const unregister = scope.add(() => clearInterval(id));
          return () => {
            clearInterval(id);
            unregister();
          };
        },

        /** Resolves after ms; never resolves when the scope is disposed first (= cancelled). */
        wait(ms) {
          return new Promise((resolve) => scope.timeout(resolve, ms));
        },

        /** A nested scope that is disposed together with its parent. */
        child() {
          const childScope = U.createScope();
          const unregister = scope.add(() => childScope.dispose());
          childScope.add(unregister);
          return childScope;
        },

        dispose() {
          if (disposed) return;
          disposed = true;
          const pending = Array.from(disposers).reverse();
          disposers.clear();
          pending.forEach(safeCall);
        }
      };
      return scope;
    },

    /**
     * requestAnimationFrame loop bound to a scope. step(dt, now) receives the
     * elapsed seconds, clamped so a background tab cannot cause huge jumps.
     */
    createLoop(scope, step) {
      let running = false;
      let rafId = 0;
      let last = 0;
      let errors = 0;

      function tick(now) {
        if (!running) return;
        const dt = last ? Math.min(0.05, Math.max(0, (now - last) / 1000)) : 0;
        last = now;
        try {
          step(dt, now);
        } catch (err) {
          /* Keep the game alive (a single bad frame must not freeze it), but never flood the console. */
          errors++;
          if (errors <= 3 || errors % 300 === 0) console.error(`[LoveQuest] frame error #${errors}:`, err);
        }
        if (running) rafId = requestAnimationFrame(tick);
      }

      const loop = {
        get running() {
          return running;
        },
        start() {
          if (running || scope.disposed) return;
          running = true;
          last = 0;
          rafId = requestAnimationFrame(tick);
        },
        stop() {
          running = false;
          cancelAnimationFrame(rafId);
        }
      };
      scope.add(() => loop.stop());
      return loop;
    },

    /** Calls callback (debounced to one animation frame) whenever element changes size. */
    observeResize(scope, element, callback) {
      let frame = 0;
      const run = () => {
        frame = 0;
        if (!scope.disposed) callback();
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(run);
      };
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(schedule);
        observer.observe(element);
        scope.add(() => observer.disconnect());
      } else {
        scope.on(window, 'resize', schedule);
      }
      scope.on(window, 'orientationchange', schedule);
      scope.add(() => cancelAnimationFrame(frame));
    },

    /** Matches a canvas backing store to its CSS size × devicePixelRatio. */
    fitCanvas(canvas, maxDpr) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(maxDpr || 2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const backingWidth = Math.round(width * dpr);
      const backingHeight = Math.round(height * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      return { width, height, dpr };
    },

    /** Converts a pointer event into coordinates relative to element (CSS pixels). */
    localPoint(event, element) {
      const rect = element.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },

    /** Minimal publish/subscribe helper. on() returns an unsubscribe function. */
    createEmitter() {
      const handlers = new Map();
      return {
        on(name, handler) {
          if (!handlers.has(name)) handlers.set(name, new Set());
          handlers.get(name).add(handler);
          return () => handlers.get(name).delete(handler);
        },
        emit(name, payload) {
          const listeners = handlers.get(name);
          if (!listeners) return;
          for (const handler of Array.from(listeners)) {
            try {
              handler(payload);
            } catch (err) {
              console.error(`[LoveQuest] "${name}" listener failed:`, err);
            }
          }
        }
      };
    }
  };

  LQ.utils = U;
})(globalThis.LQ = globalThis.LQ || {});
