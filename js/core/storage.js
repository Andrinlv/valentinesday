/* Love Quest · save game in localStorage, validated on every load. */
(function (LQ) {
  'use strict';

  const KEY = 'loveQuest.save.v1';
  const VERSION = 1;
  const LEVEL_IDS = Object.freeze(['catch', 'memory', 'archery', 'quiz', 'maze', 'final']);
  const MAX_SCORE = 10000000;
  const MAX_TOKENS = 9999;

  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const toBool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
  const toInt = (value, min, max, fallback) =>
    (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback);

  function createDefault() {
    const levels = {};
    for (const id of LEVEL_IDS) levels[id] = { completed: false, stars: 0, best: 0, plays: 0 };
    return {
      version: VERSION,
      createdAt: Date.now(),
      introSeen: false,
      hero: { name: '', avatar: 0, chosen: false },
      levels,
      tokens: 0,
      achievements: {},
      coupons: [],
      finalCoupon: false,
      settings: { music: true, sfx: true, crt: false, lang: null },
      stats: { playTimeMs: 0, noAttempts: 0, spins: 0 }
    };
  }

  /** Turns anything (old, partial or tampered data) into a valid save object. */
  function sanitize(raw) {
    const save = createDefault();
    if (!isObject(raw) || raw.version !== VERSION) return save;

    save.createdAt = toInt(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, save.createdAt);
    save.introSeen = toBool(raw.introSeen, false);

    if (isObject(raw.hero)) {
      save.hero.name = typeof raw.hero.name === 'string' ? raw.hero.name.trim().slice(0, 16) : '';
      save.hero.avatar = toInt(raw.hero.avatar, 0, 3, 0);
      save.hero.chosen = toBool(raw.hero.chosen, false);
    }

    if (isObject(raw.levels)) {
      for (const id of LEVEL_IDS) {
        const level = raw.levels[id];
        if (!isObject(level)) continue;
        const stars = toInt(level.stars, 0, 3, 0);
        save.levels[id] = {
          completed: toBool(level.completed, false) || stars > 0,
          stars,
          best: toInt(level.best, 0, MAX_SCORE, 0),
          plays: toInt(level.plays, 0, 1000000, 0)
        };
      }
    }

    save.tokens = toInt(raw.tokens, 0, MAX_TOKENS, 0);

    if (isObject(raw.achievements)) {
      for (const [id, unlockedAt] of Object.entries(raw.achievements)) {
        if (/^[a-zA-Z]{1,40}$/.test(id) && Number.isFinite(unlockedAt)) save.achievements[id] = unlockedAt;
      }
    }

    if (Array.isArray(raw.coupons)) {
      save.coupons = Array.from(new Set(raw.coupons.filter((index) => Number.isInteger(index) && index >= 0 && index < 1000)));
    }
    save.finalCoupon = toBool(raw.finalCoupon, false);

    if (isObject(raw.settings)) {
      save.settings.music = toBool(raw.settings.music, true);
      save.settings.sfx = toBool(raw.settings.sfx, true);
      save.settings.crt = toBool(raw.settings.crt, false);
      save.settings.lang = raw.settings.lang === 'en' || raw.settings.lang === 'de' ? raw.settings.lang : null;
    }

    if (isObject(raw.stats)) {
      save.stats.playTimeMs = toInt(raw.stats.playTimeMs, 0, Number.MAX_SAFE_INTEGER, 0);
      save.stats.noAttempts = toInt(raw.stats.noAttempts, 0, 1000000, 0);
      save.stats.spins = toInt(raw.stats.spins, 0, 1000000, 0);
    }
    return save;
  }

  let warnedWrite = false;

  const store = {
    KEY,
    VERSION,
    LEVEL_IDS,
    MAX_TOKENS,
    sanitize,
    createDefault,
    data: createDefault(),

    load() {
      let raw = null;
      try {
        const text = globalThis.localStorage.getItem(KEY);
        if (text) raw = JSON.parse(text);
      } catch (err) {
        console.warn('[LoveQuest] The save game could not be read, starting fresh.', err);
      }
      this.data = sanitize(raw);
      return this.data;
    },

    save() {
      try {
        globalThis.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (err) {
        if (!warnedWrite) {
          warnedWrite = true;
          console.warn('[LoveQuest] Progress cannot be stored in this browser (private mode?). It is kept until the page closes.', err);
        }
      }
    },

    /** Clears all progress but keeps the player's settings. */
    resetProgress() {
      const settings = { ...this.data.settings };
      this.data = createDefault();
      this.data.settings = settings;
      this.save();
    }
  };

  LQ.store = store;
})(globalThis.LQ = globalThis.LQ || {});
