/* Love Quest · the Love-o-Matic capsule machine and the coupon book. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);
  const CAPSULE_COLORS = ['#e8738a', '#f2c35b', '#8fc1a9', '#a9d0ee', '#c7a4e0', '#f49ac1', '#f6a33c'];

  function wonCouponIndexes() {
    const count = LQ.content.coupons.length;
    return LQ.store.data.coupons.filter((index) => index < count);
  }

  function couponCard(coupon, special) {
    return U.el('article', { class: `coupon${special ? ' coupon--special' : ''}` }, [
      U.el('span', { class: 'coupon__icon', text: coupon.icon, attrs: { 'aria-hidden': 'true' } }),
      U.el('div', { class: 'coupon__body' }, [
        special ? U.el('span', { class: 'coupon__tag', text: t('gacha.special') }) : null,
        U.el('h3', { class: 'coupon__title', text: coupon.title }),
        U.el('p', { class: 'coupon__note', text: t('gacha.redeem', { name: LQ.content.belovedName }) })
      ])
    ]);
  }

  function buildCouponBook() {
    const list = U.el('div', { class: 'coupon-list' });
    if (LQ.store.data.finalCoupon) list.append(couponCard(LQ.content.finalCoupon, true));
    for (const index of wonCouponIndexes()) list.append(couponCard(LQ.content.coupons[index], false));
    if (!list.childElementCount) list.append(U.el('p', { class: 'coupon-list__empty', text: t('gacha.empty') }));
    return list;
  }

  function capsule(color, className) {
    return U.el('span', { class: `capsule ${className || ''}`.trim(), style: { '--capsule': color } }, [
      U.el('span', { class: 'capsule__top' }),
      U.el('span', { class: 'capsule__bottom' })
    ]);
  }

  function open(initialTab) {
    const save = LQ.store.data;
    let busy = false;
    let modal = null;

    const tokenText = U.el('p', { class: 'gacha-tokens' });
    const hint = U.el('p', { class: 'gacha-hint', attrs: { 'aria-live': 'polite' } });
    const dome = U.el('div', { class: 'gacha__dome' });
    for (let i = 0; i < 9; i++) {
      const item = capsule(CAPSULE_COLORS[i % CAPSULE_COLORS.length], 'capsule--dome');
      item.style.left = `${8 + (i % 3) * 30 + U.rand(-4, 4)}%`;
      item.style.top = `${22 + Math.floor(i / 3) * 22 + U.rand(-4, 4)}%`;
      item.style.rotate = `${U.randInt(-40, 40)}deg`;
      dome.append(item);
    }
    const crank = U.el('div', { class: 'gacha__crank', attrs: { 'aria-hidden': 'true' } }, U.el('span', { class: 'gacha__handle' }));
    const prize = U.el('button', { type: 'button', class: 'gacha__prize', hidden: true, attrs: { 'aria-label': t('gacha.capsule') } });
    const machine = U.el('div', { class: 'gacha' }, [
      dome,
      U.el('div', { class: 'gacha__body' }, [
        U.el('span', { class: 'gacha__label', text: t('gacha.title') }),
        crank,
        U.el('div', { class: 'gacha__slot' }),
        U.el('span', { class: 'gacha__coin', attrs: { 'aria-hidden': 'true' } })
      ]),
      prize
    ]);
    const turnButton = U.el('button', { type: 'button', class: 'btn btn--gold gacha-turn' });
    const reveal = U.el('div', { class: 'gacha-reveal', hidden: true });

    const machinePanel = U.el('div', { class: 'tab-panel', attrs: { role: 'tabpanel' } }, [
      U.el('p', { class: 'modal__lead', text: t('gacha.subtitle') }),
      tokenText, machine, hint, turnButton, reveal
    ]);
    const couponPanel = U.el('div', { class: 'tab-panel', attrs: { role: 'tabpanel' }, hidden: true });

    const tabMachine = U.el('button', { type: 'button', class: 'tab', attrs: { role: 'tab' } });
    const tabCoupons = U.el('button', { type: 'button', class: 'tab', attrs: { role: 'tab' } });
    const tabs = U.el('div', { class: 'tabs', attrs: { role: 'tablist' } }, [tabMachine, tabCoupons]);

    function availableIndexes() {
      const won = new Set(wonCouponIndexes());
      return LQ.content.coupons.map((coupon, index) => index).filter((index) => !won.has(index));
    }

    function refresh() {
      const available = availableIndexes();
      tokenText.textContent = t('gacha.tokens', { n: save.tokens });
      tabMachine.textContent = t('gacha.tabMachine');
      tabCoupons.textContent = t('gacha.tabCoupons', { n: wonCouponIndexes().length + (save.finalCoupon ? 1 : 0) });
      if (!available.length) {
        turnButton.textContent = t('gacha.allWon');
        turnButton.disabled = true;
      } else {
        turnButton.textContent = t('gacha.turn', { n: LQ.progress.SPIN_COST });
        turnButton.disabled = busy;
      }
    }

    function selectTab(name) {
      const machineActive = name !== 'coupons';
      tabMachine.setAttribute('aria-selected', String(machineActive));
      tabCoupons.setAttribute('aria-selected', String(!machineActive));
      machinePanel.hidden = !machineActive;
      couponPanel.hidden = machineActive;
      if (!machineActive) {
        couponPanel.textContent = '';
        couponPanel.append(buildCouponBook());
      }
    }

    function showReveal(index) {
      const coupon = LQ.content.coupons[index];
      reveal.textContent = '';
      reveal.append(
        U.el('p', { class: 'gacha-reveal__lead', text: t('gacha.youWon') }),
        couponCard(coupon, false),
        U.el('button', {
          type: 'button',
          class: 'btn btn--primary btn--small',
          text: 'OK',
          on: {
            click: () => {
              LQ.audio.play('click');
              reveal.hidden = true;
              machine.hidden = false;
              turnButton.hidden = false;
              busy = false;
              hint.textContent = '';
              refresh();
              turnButton.focus();
            }
          }
        })
      );
      machine.hidden = true;
      turnButton.hidden = true;
      reveal.hidden = false;
      const rect = reveal.getBoundingClientRect();
      LQ.fx.confetti(110);
      LQ.fx.hearts(rect.left + rect.width / 2, rect.top + 40, 10);
      reveal.querySelector('.btn').focus();
    }

    function spin() {
      if (busy) return;
      const available = availableIndexes();
      if (!available.length) return;
      if (!LQ.progress.spendTokens(LQ.progress.SPIN_COST)) {
        hint.textContent = t('gacha.notEnough', { n: LQ.progress.SPIN_COST });
        LQ.audio.play('wrong');
        LQ.fx.shake(machine, 0.6);
        return;
      }
      busy = true;
      const index = U.pick(available);
      save.coupons.push(index);
      save.stats.spins += 1;
      LQ.store.save();
      LQ.achievements.unlock('lucky');
      if (!availableIndexes().length) LQ.achievements.unlock('collector');
      LQ.events.emit('progress');

      hint.textContent = '';
      refresh();
      LQ.audio.play('coin');
      LQ.audio.play('crank');
      machine.classList.add('is-turning');
      setTimeout(() => {
        if (!modal.isOpen) return;
        machine.classList.remove('is-turning');
        prize.textContent = '';
        prize.append(capsule(U.pick(CAPSULE_COLORS)));
        prize.hidden = false;
        prize.classList.remove('is-open');
        prize.classList.add('is-dropping');
        LQ.audio.play('drop');
        hint.textContent = t('gacha.tapCapsule');
        prize.focus();
        prize.onclick = () => {
          prize.onclick = null;
          prize.classList.add('is-open');
          LQ.audio.play('open');
          setTimeout(() => {
            if (!modal.isOpen) return;
            prize.hidden = true;
            showReveal(index);
          }, 420);
        };
      }, 950);
    }

    turnButton.addEventListener('click', spin);
    tabMachine.addEventListener('click', () => { LQ.audio.play('click'); selectTab('machine'); });
    tabCoupons.addEventListener('click', () => { LQ.audio.play('click'); selectTab('coupons'); });

    refresh();
    selectTab(initialTab);
    modal = LQ.ui.modal.open({
      title: t('gacha.title'),
      content: U.el('div', { class: 'gacha-wrap' }, [tabs, machinePanel, couponPanel]),
      className: 'modal--gacha'
    });
    return modal;
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.gacha = { open, buildCouponBook, couponCard };
})(globalThis.LQ = globalThis.LQ || {});
