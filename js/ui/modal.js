/* Love Quest · accessible modal dialogs (focus trap, Escape, stacking). */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const stack = [];
  let counter = 0;
  let listening = false;

  function topModal() {
    return stack[stack.length - 1] || null;
  }

  function onKeyDown(event) {
    const modal = topModal();
    if (!modal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (modal.dismissible) modal.close('escape');
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = U.$$(FOCUSABLE, modal.el).filter((node) => node.offsetParent !== null);
    if (!focusables.length) {
      event.preventDefault();
      modal.el.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || !modal.el.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !modal.el.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  /**
   * options: { title, content (Node|string), actions: [{ label, kind, onClick, autofocus, close }],
   *            dismissible (default true), className, onClose(reason) }
   * Returns { el, body, close(reason), isOpen }.
   */
  function open(options) {
    const opts = Object.assign({ actions: [], dismissible: true, className: '' }, options);
    if (!listening) {
      document.addEventListener('keydown', onKeyDown, true);
      listening = true;
    }
    const root = document.getElementById('modal-root');
    const previousFocus = document.activeElement;
    const openedAt = performance.now();
    const id = ++counter;

    const dialog = U.el('div', {
      class: `modal panel ${opts.className}`.trim(),
      attrs: { role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }
    });
    const backdrop = U.el('div', { class: 'modal-backdrop' }, dialog);

    if (opts.title) {
      dialog.setAttribute('aria-labelledby', `modal-title-${id}`);
      dialog.append(U.el('h2', { class: 'modal__title pixel-title', id: `modal-title-${id}`, text: opts.title }));
    }

    const handle = {
      el: dialog,
      body: U.el('div', { class: 'modal__body' }),
      dismissible: opts.dismissible,
      isOpen: true,
      /**
       * Closes the dialog; action is the chosen action object (if any). When a pointer closed it,
       * the fading backdrop keeps swallowing taps so a double tap cannot reach the scene below.
       */
      close(reason, action, event) {
        if (!handle.isOpen) return;
        handle.isOpen = false;
        const index = stack.indexOf(handle);
        if (index >= 0) stack.splice(index, 1);
        const byPointer = reason === 'backdrop' || Boolean(event && event.detail > 0);
        backdrop.classList.add('is-leaving');
        if (!byPointer) backdrop.classList.add('is-passthrough');
        setTimeout(() => backdrop.remove(), 200);
        if (previousFocus && typeof previousFocus.focus === 'function' && document.contains(previousFocus)) {
          previousFocus.focus({ preventScroll: true });
        }
        if (opts.onClose) opts.onClose(reason || 'close', action || null);
      }
    };

    if (opts.dismissible) {
      dialog.append(U.el('button', {
        type: 'button',
        class: 'modal__close',
        text: '✕',
        attrs: { 'aria-label': LQ.t('common.close') },
        on: {
          click: (event) => {
            if (!handle.isOpen) return;
            LQ.audio.play('click');
            handle.close('close', null, event);
          }
        }
      }));
    }

    if (opts.content !== undefined && opts.content !== null) {
      handle.body.append(opts.content instanceof Node ? opts.content : U.el('p', { text: String(opts.content) }));
    }
    dialog.append(handle.body);

    if (opts.actions.length) {
      const actions = U.el('div', { class: 'modal__actions' });
      for (const action of opts.actions) {
        const button = U.el('button', {
          type: 'button',
          class: `btn ${action.kind ? `btn--${action.kind}` : 'btn--primary'}`,
          text: action.label,
          on: {
            click: (event) => {
              if (!handle.isOpen) return;
              LQ.audio.play('click');
              if (action.close !== false) handle.close('action', action, event);
              if (action.onClick) action.onClick();
            }
          }
        });
        if (action.autofocus) button.dataset.autofocus = 'true';
        actions.append(button);
      }
      dialog.append(actions);
    }

    /* A click that started on the element which opened this dialog must not close it again. */
    backdrop.addEventListener('click', (event) => {
      if (event.target !== backdrop || !handle.dismissible || !handle.isOpen) return;
      if (performance.now() - openedAt < 350) return;
      handle.close('backdrop');
    });

    root.append(backdrop);
    stack.push(handle);

    const preferred = dialog.querySelector('[data-autofocus="true"]') || dialog.querySelector('.modal__actions .btn') ||
      dialog.querySelector(FOCUSABLE);
    requestAnimationFrame(() => (preferred || dialog).focus({ preventScroll: true }));
    return handle;
  }

  /** Resolves true when confirmed; Cancel, Escape, ✕ and backdrop clicks resolve false. */
  function confirm(options) {
    return new Promise((resolve) => {
      open({
        title: options.title,
        content: options.text,
        className: 'modal--small',
        actions: [
          { label: options.cancelLabel || LQ.t('common.cancel'), kind: 'ghost', autofocus: true, value: false },
          { label: options.confirmLabel, kind: options.danger ? 'danger' : 'primary', value: true }
        ],
        onClose: (reason, action) => resolve(Boolean(action && action.value))
      });
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.modal = {
    open,
    confirm,
    isOpen: () => stack.length > 0,
    closeAll() {
      stack.slice().reverse().forEach((modal) => modal.close('closeAll'));
    }
  };
})(globalThis.LQ = globalThis.LQ || {});
