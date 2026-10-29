/* Love Quest · settings, trophy room, secret letter and pause menus. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);

  function settingRow(label, control, forId) {
    return U.el('div', { class: 'setting-row' }, [
      U.el(forId ? 'label' : 'span', { class: 'setting-row__label', text: label, attrs: forId ? { for: forId } : {} }),
      U.el('div', { class: 'setting-row__control' }, control)
    ]);
  }

  /** An on/off switch bound to a boolean setting. */
  function toggleRow(labelKey, key) {
    const id = `setting-${key}-${Math.random().toString(36).slice(2, 7)}`;
    const isOn = () => LQ.store.data.settings[key];
    const state = U.el('span', { class: 'switch__state', attrs: { 'aria-hidden': 'true' } });
    const button = U.el('button', { type: 'button', class: 'switch', id, attrs: { role: 'switch' } }, U.el('span', { class: 'switch__knob' }));
    const render = () => {
      button.setAttribute('aria-checked', String(isOn()));
      state.textContent = isOn() ? t('common.on') : t('common.off');
    };
    button.addEventListener('click', () => {
      LQ.app.updateSetting(key, !isOn());
      render();
      LQ.audio.play('click');
    });
    render();
    return settingRow(t(labelKey), [state, button], id);
  }

  function languageRow(onChange) {
    const group = U.el('div', { class: 'segmented', attrs: { role: 'group', 'aria-label': t('settings.language') } });
    for (const code of LQ.i18n.SUPPORTED) {
      const active = LQ.i18n.lang === code;
      group.append(U.el('button', {
        type: 'button',
        class: 'segmented__btn',
        text: code === 'de' ? 'Deutsch' : 'English',
        attrs: { 'aria-pressed': String(active), lang: code },
        on: {
          click: () => {
            if (LQ.i18n.lang === code) return;
            LQ.audio.play('select');
            LQ.app.updateSetting('lang', code);
            onChange();
          }
        }
      }));
    }
    return settingRow(t('settings.language'), group);
  }

  const menus = {
    openSettings() {
      let modal = null;
      const content = U.el('div', { class: 'settings' }, [
        toggleRow('settings.music', 'music'),
        toggleRow('settings.sfx', 'sfx'),
        toggleRow('settings.crt', 'crt'),
        languageRow(() => {
          modal.close('language');
          menus.openSettings();
        }),
        U.el('button', {
          type: 'button',
          class: 'btn btn--danger btn--small settings__reset',
          text: t('settings.reset'),
          on: {
            click: async () => {
              LQ.audio.play('click');
              const confirmed = await LQ.ui.modal.confirm({
                title: t('settings.resetTitle'),
                text: t('settings.resetText'),
                confirmLabel: t('settings.resetConfirm'),
                danger: true
              });
              if (!confirmed) return;
              modal.close('reset');
              LQ.app.resetProgress();
            }
          }
        }),
        U.el('p', { class: 'settings__credit', text: t('settings.madeWith', { name: LQ.app.heroName() }) })
      ]);
      modal = LQ.ui.modal.open({ title: t('settings.title'), content, className: 'modal--small' });
      return modal;
    },

    openTrophies() {
      const list = U.el('ul', { class: 'trophy-list' });
      for (const achievement of LQ.achievements.LIST) {
        const unlocked = LQ.achievements.isUnlocked(achievement.id);
        const hidden = achievement.secret && !unlocked;
        list.append(U.el('li', { class: `trophy ${unlocked ? 'is-unlocked' : 'is-locked'}` }, [
          U.el('span', { class: 'trophy__icon', text: hidden ? '❔' : achievement.icon, attrs: { 'aria-hidden': 'true' } }),
          U.el('div', { class: 'trophy__body' }, [
            U.el('strong', { class: 'trophy__title', text: hidden ? t('trophies.secret') : t(`ach.${achievement.id}.title`) }),
            U.el('span', { class: 'trophy__desc', text: hidden ? t('trophies.secretDesc') : t(`ach.${achievement.id}.desc`) })
          ]),
          achievement.tokens ? U.el('span', { class: 'trophy__reward', text: t('trophies.reward', { n: achievement.tokens }) }) : null
        ]));
      }
      const content = U.el('div', { class: 'trophies' }, [
        U.el('p', {
          class: 'modal__lead',
          text: t('trophies.count', { n: LQ.achievements.unlockedCount(), total: LQ.achievements.LIST.length })
        }),
        list
      ]);
      return LQ.ui.modal.open({ title: t('trophies.title'), content, className: 'modal--wide' });
    },

    openLetter() {
      const chunks = LQ.progress.letterChunks();
      const found = LQ.progress.letterPiecesFound();
      const total = LQ.progress.LETTER_PIECES;
      const text = U.el('p', { class: 'letter-paper__text' });
      chunks.forEach((chunk, index) => {
        if (!chunk) return;
        if (index < found) {
          text.append(U.el('span', { class: 'letter-piece', text: chunk }));
          return;
        }
        /* A missing piece keeps its trailing space or line break, so the letter's shape stays the same. */
        const words = chunk.trimEnd();
        const width = U.clamp(Math.round(U.graphemes(words).length * 0.5), 3, 14);
        text.append(U.el('span', {
          class: 'letter-piece letter-piece--hidden',
          style: { width: `${width}em` },
          attrs: { role: 'img', 'aria-label': t('letter.missing') }
        }), chunk.slice(words.length));
      });
      const paper = U.el('div', { class: 'letter-paper paper' }, [
        U.el('span', { class: 'wax-seal', text: '❤', attrs: { 'aria-hidden': 'true' } }),
        text,
        found >= total ? U.el('p', { class: 'letter-paper__signature', text: t('final.signature', { name: LQ.content.belovedName }) }) : null
      ]);
      const content = U.el('div', { class: 'letter' }, [
        U.el('p', { class: 'modal__lead', text: t('letter.progress', { n: found, total }) }),
        paper,
        found < total ? U.el('p', { class: 'letter__hint', text: t('letter.hint') }) : null
      ]);
      return LQ.ui.modal.open({ title: t('letter.title'), content, className: 'modal--letter' });
    },

    /** Pause dialog. Escape, ✕ and "Resume" all resume the game. */
    openPause({ onResume, onRestart, onQuit }) {
      const content = U.el('div', { class: 'settings' }, [
        toggleRow('settings.music', 'music'),
        toggleRow('settings.sfx', 'sfx')
      ]);
      return LQ.ui.modal.open({
        title: t('pause.title'),
        content,
        className: 'modal--small modal--pause',
        actions: [
          { label: t('pause.resume'), kind: 'primary', autofocus: true, value: 'resume' },
          { label: t('pause.restart'), kind: 'ghost', value: 'restart' },
          { label: t('pause.quit'), kind: 'ghost', value: 'quit' }
        ],
        onClose: (reason, action) => {
          const choice = action ? action.value : 'resume';
          if (choice === 'restart') onRestart();
          else if (choice === 'quit') onQuit();
          else onResume();
        }
      });
    }
  };

  LQ.ui = LQ.ui || {};
  LQ.ui.menus = menus;
})(globalThis.LQ = globalThis.LQ || {});
