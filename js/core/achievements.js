/* Love Quest · achievements: unlocked once, rewarded with tokens and a toast. */
(function (LQ) {
  'use strict';

  const LIST = Object.freeze([
    { id: 'firstSteps', icon: '👣', tokens: 1 },
    { id: 'comboKing', icon: '🔥', tokens: 1 },
    { id: 'postman', icon: '💌', tokens: 1 },
    { id: 'eidetic', icon: '🧠', tokens: 2 },
    { id: 'multiHit', icon: '🎯', tokens: 2 },
    { id: 'robinHood', icon: '🏹', tokens: 1 },
    { id: 'knowItAll', icon: '🎓', tokens: 2 },
    { id: 'mazeRunner', icon: '🗝️', tokens: 1 },
    { id: 'untouchable', icon: '🛡️', tokens: 2 },
    { id: 'healer', icon: '👻', tokens: 1 },
    { id: 'starCollector', icon: '⭐', tokens: 1 },
    { id: 'perfectionist', icon: '🌟', tokens: 3 },
    { id: 'itsAMatch', icon: '💍', tokens: 3 },
    { id: 'lucky', icon: '🍀', tokens: 1 },
    { id: 'collector', icon: '🎁', tokens: 0 },
    { id: 'cheatCode', icon: '🕹️', tokens: 2, secret: true },
    { id: 'konami', icon: '👾', tokens: 3, secret: true },
    { id: 'persistent', icon: '🙈', tokens: 1, secret: true }
  ].map(Object.freeze));

  const BY_ID = new Map(LIST.map((achievement) => [achievement.id, achievement]));

  const achievements = {
    LIST,

    get(id) {
      return BY_ID.get(id);
    },

    isUnlocked(id) {
      return Boolean(LQ.store.data.achievements[id]);
    },

    unlockedCount() {
      return LIST.filter((achievement) => achievements.isUnlocked(achievement.id)).length;
    },

    /** Unlocks once, pays out tokens and celebrates. Returns true only on the first unlock. */
    unlock(id) {
      const achievement = BY_ID.get(id);
      if (!achievement) {
        console.warn(`[LoveQuest] Unknown achievement "${id}"`);
        return false;
      }
      const save = LQ.store.data;
      if (save.achievements[id]) return false;
      save.achievements[id] = Date.now();
      if (achievement.tokens) LQ.progress.addTokens(achievement.tokens);
      LQ.store.save();
      LQ.audio.play('achievement');
      const reward = achievement.tokens ? `  ·  ${LQ.t('trophies.reward', { n: achievement.tokens })}` : '';
      LQ.fx.toast({
        icon: achievement.icon,
        title: LQ.t('ach.unlocked'),
        text: `${LQ.t(`ach.${id}.title`)}${reward}`,
        tone: 'gold'
      });
      LQ.events.emit('progress');
      return true;
    }
  };

  LQ.achievements = achievements;
})(globalThis.LQ = globalThis.LQ || {});
