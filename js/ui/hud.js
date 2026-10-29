/* Love Quest · in-game heads-up display (title + stat chips). */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  let titleEl = null;
  let statsEl = null;
  const chips = new Map();

  const hud = {
    init() {
      titleEl = document.getElementById('hud-title');
      statsEl = document.getElementById('hud-stats');
    },

    setTitle(text) {
      titleEl.textContent = text;
    },

    /** stats: [{ id, icon, value, label }] */
    setStats(stats) {
      statsEl.textContent = '';
      chips.clear();
      for (const stat of stats) {
        const value = U.el('span', { class: 'chip__value', text: stat.value });
        const chip = U.el('div', {
          class: 'chip',
          dataset: { id: stat.id },
          attrs: { title: stat.label, 'aria-label': `${stat.label}: ${stat.value}` }
        }, [U.el('span', { class: 'chip__icon', text: stat.icon, attrs: { 'aria-hidden': 'true' } }), value]);
        chips.set(stat.id, { chip, value, label: stat.label, text: String(stat.value) });
        statsEl.append(chip);
      }
    },

    set(id, value) {
      const entry = chips.get(id);
      const text = String(value);
      if (!entry || entry.text === text) return;
      entry.text = text;
      entry.value.textContent = text;
      entry.chip.setAttribute('aria-label', `${entry.label}: ${text}`);
    },

    pulse(id, tone) {
      const entry = chips.get(id);
      if (!entry) return;
      entry.chip.classList.remove('is-pulse', 'is-bad');
      void entry.chip.offsetWidth;
      entry.chip.classList.add(tone === 'bad' ? 'is-bad' : 'is-pulse');
    },

    clear() {
      hud.setTitle('');
      hud.setStats([]);
    }
  };

  LQ.ui = LQ.ui || {};
  LQ.ui.hud = hud;
})(globalThis.LQ = globalThis.LQ || {});
