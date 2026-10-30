/* Love Quest · progression: trials, stars, love points, love level, tokens and letter pieces. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;

  /* The journey, in order. "backdrop" selects the background painting of the trial. */
  const LEVELS = Object.freeze([
    { id: 'catch', icon: '💘', backdrop: 'ruins' },
    { id: 'memory', icon: '📸', backdrop: 'ruins' },
    { id: 'archery', icon: '🏹', backdrop: 'coast' },
    { id: 'quiz', icon: '💬', backdrop: 'castle' },
    { id: 'maze', icon: '🌹', backdrop: 'maze' },
    { id: 'final', icon: '💍', backdrop: 'castle' }
  ].map(Object.freeze));

  const STAR_LEVEL_IDS = Object.freeze(LEVELS.filter((level) => level.id !== 'final').map((level) => level.id));
  /* Love points needed for love levels 1–10. */
  const LOVE_LEVELS = Object.freeze([0, 250, 650, 1200, 1900, 2800, 3900, 5200, 6700, 8400]);
  const SPIN_COST = 3;
  /* One piece of the secret letter per completed trial; the last one is found in the finale. */
  const LETTER_PIECES = LEVELS.length;

  LQ.events = LQ.events || U.createEmitter();

  const save = () => LQ.store.data;

  const progress = {
    LEVELS,
    STAR_LEVEL_IDS,
    LOVE_LEVELS,
    SPIN_COST,
    LETTER_PIECES,

    levelIndex(id) {
      return LEVELS.findIndex((level) => level.id === id);
    },

    levelMeta(id) {
      return LEVELS[progress.levelIndex(id)] || null;
    },

    levelState(id) {
      return save().levels[id];
    },

    isUnlocked(id) {
      const index = progress.levelIndex(id);
      if (index < 0) return false;
      if (index === 0 || (LQ.debug && LQ.debug.unlockAll)) return true;
      return save().levels[LEVELS[index - 1].id].completed;
    },

    /** The trial the hero currently stands at: the first unlocked, unfinished one. */
    currentLevelId() {
      const open = LEVELS.find((level) => progress.isUnlocked(level.id) && !save().levels[level.id].completed);
      return open ? open.id : LEVELS[LEVELS.length - 1].id;
    },

    totalLP() {
      return STAR_LEVEL_IDS.reduce((sum, id) => sum + save().levels[id].best, 0);
    },

    totalStars() {
      return STAR_LEVEL_IDS.reduce((sum, id) => sum + save().levels[id].stars, 0);
    },

    maxStars() {
      return STAR_LEVEL_IDS.length * 3;
    },

    /** { level, title, progress (0–1 towards the next level), next (LP needed) } */
    loveLevel(lp) {
      const points = lp === undefined ? progress.totalLP() : lp;
      let level = 1;
      for (let i = 0; i < LOVE_LEVELS.length; i++) {
        if (points >= LOVE_LEVELS[i]) level = i + 1;
      }
      const current = LOVE_LEVELS[level - 1];
      const next = LOVE_LEVELS[level];
      return {
        level,
        title: LQ.t(`rank.${level}`),
        next: next === undefined ? null : next,
        progress: next === undefined ? 1 : U.clamp((points - current) / (next - current), 0, 1)
      };
    },

    addTokens(amount) {
      const data = save();
      data.tokens = U.clamp(data.tokens + Math.round(amount), 0, LQ.store.MAX_TOKENS);
      LQ.events.emit('progress');
    },

    spendTokens(amount) {
      const data = save();
      if (data.tokens < amount) return false;
      data.tokens -= amount;
      LQ.store.save();
      LQ.events.emit('progress');
      return true;
    },

    letterPiecesFound() {
      return LEVELS.filter((level) => save().levels[level.id].completed).length;
    },

    /**
     * The letter split into LETTER_PIECES consecutive chunks of roughly equal size. Joined they give back
     * the exact text, line breaks included. Letters with fewer words than pieces are split by character
     * (spaces ride along with the character before them), so every piece still reveals something.
     */
    letterChunks(letter = LQ.content.finalLetter) {
      let units = letter.match(/\S+\s*/g) || [];
      if (units.length < LETTER_PIECES) {
        units = [];
        for (const char of U.graphemes(letter)) {
          if (!char.trim() && units.length) units[units.length - 1] += char;
          else units.push(char);
        }
      }
      const chunks = [];
      for (let i = 0; i < LETTER_PIECES; i++) {
        const start = Math.round((i * units.length) / LETTER_PIECES);
        const end = Math.round(((i + 1) * units.length) / LETTER_PIECES);
        chunks.push(units.slice(start, end).join(''));
      }
      return chunks;
    },

    /**
     * Records a finished trial and returns what changed, for the results screen.
     * result: { score, stars }
     */
    applyResult(levelId, result) {
      const data = save();
      const level = data.levels[levelId];
      const index = progress.levelIndex(levelId);
      if (!level || index < 0) throw new Error(`Unknown level "${levelId}"`);

      const score = Math.max(0, Math.round(Number(result.score) || 0));
      const stars = U.clamp(Math.round(Number(result.stars) || 0), 0, 3);
      const loveBefore = progress.loveLevel().level;
      const previousBest = level.best;
      const previousStars = level.stars;
      const firstClear = !level.completed;

      level.plays += 1;
      level.completed = true;
      level.stars = Math.max(previousStars, stars);
      if (score > level.best) level.best = score;

      const newStars = level.stars - previousStars;
      if (newStars > 0) progress.addTokens(newStars);
      LQ.store.save();

      const next = LEVELS[index + 1];
      const outcome = {
        levelId,
        score,
        stars,
        previousBest,
        newBest: score > previousBest && previousBest > 0,
        newStars,
        firstClear,
        letterPiece: firstClear ? progress.letterPiecesFound() : 0,
        unlockedLevelId: firstClear && next ? next.id : null,
        loveLevelBefore: loveBefore,
        loveLevelAfter: progress.loveLevel().level
      };

      LQ.achievements.unlock('firstSteps');
      if (stars === 3) LQ.achievements.unlock('starCollector');
      if (STAR_LEVEL_IDS.every((id) => data.levels[id].stars === 3)) LQ.achievements.unlock('perfectionist');

      if (outcome.loveLevelAfter > outcome.loveLevelBefore) {
        const love = progress.loveLevel();
        LQ.audio.play('levelUp');
        LQ.fx.toast({ icon: '💗', title: LQ.t('toast.levelUp'), text: LQ.t('toast.levelUpText', { n: love.level, title: love.title }), tone: 'rose' });
      }
      LQ.events.emit('progress');
      return outcome;
    }
  };

  LQ.progress = progress;
})(globalThis.LQ = globalThis.LQ || {});
