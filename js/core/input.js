/* Love Quest · directional input from keyboard, swipe gestures, an on-screen pad and gamepads. */
(function (LQ) {
  'use strict';

  const KEY_DIRS = Object.freeze({
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  });
  const SWIPE_THRESHOLD = 22;

  function directionFromVector(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  /**
   * options.swipeTarget – element that receives swipe gestures
   * options.pad         – on-screen direction pad element (optional)
   * options.isActive    – () => boolean, input is ignored while false (e.g. paused)
   * options.onSwipe     – (dir) => void, called when a swipe is recognised
   */
  function createDirectionalInput(scope, options) {
    const isActive = options.isActive || (() => true);
    const held = []; // [{ source, dir }], most recent last
    let swipeDir = null;
    let gamepadDir = null;
    let gamepadStartWasPressed = false;

    function release(source) {
      const index = held.findIndex((entry) => entry.source === source);
      if (index >= 0) held.splice(index, 1);
    }

    function press(source, dir) {
      release(source);
      held.push({ source, dir });
      swipeDir = null;
    }

    function releaseKeys() {
      for (let i = held.length - 1; i >= 0; i--) {
        if (held[i].source.startsWith('key:')) held.splice(i, 1);
      }
    }

    /* Keys are tracked even while input is inactive, so a key held through a pause or banner keeps working. */
    scope.on(window, 'keydown', (event) => {
      const dir = KEY_DIRS[event.code];
      /* With a modifier this is a shortcut (Cmd+S, Ctrl+W…); macOS would never send its keyup. */
      if (!dir || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isActive()) event.preventDefault();
      const source = `key:${event.code}`;
      if (!event.repeat || !held.some((entry) => entry.source === source)) press(source, dir);
    });
    scope.on(window, 'keyup', (event) => {
      /* macOS drops the keyup of every key released while Cmd is down. */
      if (event.key === 'Meta') releaseKeys();
      else if (KEY_DIRS[event.code]) release(`key:${event.code}`);
    });
    scope.on(window, 'blur', releaseKeys);

    if (options.swipeTarget) {
      const target = options.swipeTarget;
      let tracking = null;
      scope.on(target, 'pointerdown', (event) => {
        if (!event.isPrimary || !isActive()) return;
        tracking = { id: event.pointerId, x: event.clientX, y: event.clientY };
        try {
          /* Keeps the gesture alive when the finger or mouse leaves the target. */
          target.setPointerCapture(event.pointerId);
        } catch (err) {
          /* capture is a nicety, not required */
        }
      });
      scope.on(target, 'pointermove', (event) => {
        if (!tracking || event.pointerId !== tracking.id || !isActive()) return;
        /* The button was released somewhere the pointerup never reached us. */
        if (event.buttons === 0) {
          tracking = null;
          return;
        }
        const dx = event.clientX - tracking.x;
        const dy = event.clientY - tracking.y;
        if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return;
        swipeDir = directionFromVector(dx, dy);
        tracking.x = event.clientX;
        tracking.y = event.clientY;
        if (options.onSwipe) options.onSwipe(swipeDir);
      });
      const end = (event) => {
        if (tracking && event.pointerId === tracking.id) tracking = null;
      };
      scope.on(target, 'pointerup', end);
      scope.on(target, 'pointercancel', end);
      scope.on(target, 'lostpointercapture', end);
    }

    if (options.pad) {
      const pad = options.pad;
      let padPointer = null;
      const setPad = (dir) => {
        release('pad');
        if (dir) press('pad', dir);
        pad.dataset.dir = dir || '';
      };
      const fromEvent = (event) => {
        const rect = pad.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        if (Math.hypot(dx, dy) < rect.width * 0.12) return null;
        return directionFromVector(dx, dy);
      };
      scope.on(pad, 'pointerdown', (event) => {
        if (!isActive()) return;
        event.preventDefault();
        padPointer = event.pointerId;
        try {
          pad.setPointerCapture(event.pointerId);
        } catch (err) {
          /* capture is a nicety, not required */
        }
        setPad(fromEvent(event));
      });
      scope.on(pad, 'pointermove', (event) => {
        if (event.pointerId !== padPointer) return;
        const dir = fromEvent(event);
        if (pad.dataset.dir !== (dir || '')) setPad(dir);
      });
      const endPad = (event) => {
        if (event.pointerId !== padPointer) return;
        padPointer = null;
        setPad(null);
      };
      scope.on(pad, 'pointerup', endPad);
      scope.on(pad, 'pointercancel', endPad);
      scope.on(pad, 'lostpointercapture', endPad);
      scope.on(pad, 'contextmenu', (event) => event.preventDefault());
    }

    return {
      /** Currently held directions, most recent first (keyboard, pad and gamepad). */
      heldDirs() {
        const dirs = [];
        for (let i = held.length - 1; i >= 0; i--) {
          if (!dirs.includes(held[i].dir)) dirs.push(held[i].dir);
        }
        return dirs;
      },

      get swipeDir() {
        return swipeDir;
      },

      clearSwipe() {
        swipeDir = null;
      },

      /** Reads connected gamepads. Returns true when Start was just pressed. */
      pollGamepad() {
        const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
        let dir = null;
        let startPressed = false;
        for (const gamepad of pads) {
          if (!gamepad) continue;
          const buttons = gamepad.buttons;
          const pressed = (index) => Boolean(buttons[index] && buttons[index].pressed);
          if (pressed(12)) dir = 'up';
          else if (pressed(13)) dir = 'down';
          else if (pressed(14)) dir = 'left';
          else if (pressed(15)) dir = 'right';
          else {
            const ax = gamepad.axes[0] || 0;
            const ay = gamepad.axes[1] || 0;
            if (Math.max(Math.abs(ax), Math.abs(ay)) > 0.5) dir = directionFromVector(ax, ay);
          }
          startPressed = startPressed || pressed(9);
          if (dir) break;
        }
        if (dir !== gamepadDir) {
          release('gamepad');
          if (dir) press('gamepad', dir);
          gamepadDir = dir;
        }
        const startEdge = startPressed && !gamepadStartWasPressed;
        gamepadStartWasPressed = startPressed;
        return startEdge;
      },

      /** Forgets a pending swipe run; physically held keys and the touched pad stay active. */
      reset() {
        swipeDir = null;
      }
    };
  }

  LQ.input = { createDirectionalInput, directionFromVector, KEY_DIRS };
})(globalThis.LQ = globalThis.LQ || {});
