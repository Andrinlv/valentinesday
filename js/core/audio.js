/* Love Quest · background music + synthesized chiptune sound effects (Web Audio). */
(function (LQ) {
  'use strict';

  const MUSIC_VOLUME = 0.4;

  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let sfxEnabled = true;
  let musicEnabled = true;
  let musicWanted = false;
  let musicEl = null;
  let musicBroken = false;
  let duckTimer = 0;

  const midi = (note) => 440 * Math.pow(2, (note - 69) / 12);

  function ensureContext() {
    if (ctx) return ctx;
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    } catch (err) {
      console.warn('[LoveQuest] Web Audio is not available, sound effects are disabled.', err);
      ctx = null;
    }
    return ctx;
  }

  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 2);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  /** A single enveloped oscillator note. */
  function tone({ type = 'square', freq = 440, to = 0, dur = 0.1, vol = 0.1, delay = 0, attack = 0.004, slide = 'exp' }) {
    const start = ctx.currentTime + delay;
    const end = start + dur;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to > 0) {
      if (slide === 'exp') osc.frequency.exponentialRampToValueAtTime(to, end);
      else osc.frequency.linearRampToValueAtTime(to, end);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }

  /** A filtered noise burst (paper, whoosh, crackle, thud). */
  function noise({ dur = 0.15, vol = 0.1, delay = 0, freq = 1200, to = 0, q = 0.8, filter = 'bandpass' }) {
    const start = ctx.currentTime + delay;
    const end = start + dur;
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer();
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.setValueAtTime(freq, start);
    if (to > 0) biquad.frequency.exponentialRampToValueAtTime(to, end);
    biquad.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, vol), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(biquad);
    biquad.connect(gain);
    gain.connect(master);
    const offset = Math.random() * 0.5;
    source.start(start, offset, dur + 0.05);
    source.stop(end + 0.05);
  }

  function arpeggio(notes, { step = 0.08, type = 'triangle', vol = 0.1, hold = 1.4, delay = 0 } = {}) {
    notes.forEach((note, index) => {
      tone({ type, freq: midi(note), dur: step * hold, vol, delay: delay + index * step });
    });
  }

  const SOUNDS = {
    click: () => tone({ type: 'square', freq: 880, dur: 0.045, vol: 0.05 }),
    select: () => arpeggio([76, 83], { step: 0.05, type: 'square', vol: 0.05 }),
    dodge: () => tone({ type: 'sine', freq: 380, to: 760, dur: 0.12, vol: 0.12 }),
    type: () => tone({ type: 'square', freq: 1150 + Math.random() * 120, dur: 0.018, vol: 0.025 }),
    collect: (combo = 0) => {
      const base = 720 * Math.pow(1.06, Math.min(12, combo));
      tone({ type: 'triangle', freq: base, to: base * 1.6, dur: 0.1, vol: 0.13 });
      tone({ type: 'sine', freq: base * 2, dur: 0.07, vol: 0.04, delay: 0.03 });
    },
    letter: () => arpeggio([84, 88, 91, 96], { step: 0.06, vol: 0.1 }),
    bad: () => {
      tone({ type: 'sawtooth', freq: 260, to: 90, dur: 0.28, vol: 0.09 });
      noise({ dur: 0.18, vol: 0.06, freq: 500 });
    },
    flip: () => {
      noise({ dur: 0.07, vol: 0.12, freq: 2600, q: 1.2 });
      tone({ type: 'square', freq: 1400, dur: 0.02, vol: 0.02 });
    },
    match: () => arpeggio([76, 80, 83, 88], { step: 0.065, vol: 0.11 }),
    wrong: () => {
      tone({ type: 'square', freq: 196, to: 150, dur: 0.12, vol: 0.06 });
      tone({ type: 'square', freq: 165, to: 120, dur: 0.16, vol: 0.06, delay: 0.13 });
    },
    correct: () => arpeggio([72, 76, 79, 84], { step: 0.07, vol: 0.12 }),
    beep: () => tone({ type: 'square', freq: midi(72), dur: 0.12, vol: 0.07 }),
    go: () => tone({ type: 'square', freq: midi(84), dur: 0.3, vol: 0.08 }),
    shoot: () => {
      tone({ type: 'triangle', freq: 210, to: 95, dur: 0.16, vol: 0.14 });
      noise({ dur: 0.22, vol: 0.05, freq: 900, to: 3000, filter: 'highpass' });
    },
    hit: (index = 0) => {
      const base = 900 * Math.pow(1.12, Math.min(6, index));
      tone({ type: 'square', freq: base, to: base * 1.7, dur: 0.08, vol: 0.08 });
      noise({ dur: 0.08, vol: 0.06, freq: 3000 });
    },
    key: () => arpeggio([79, 84, 88, 91], { step: 0.055, vol: 0.12, type: 'square' }),
    door: () => {
      noise({ dur: 0.3, vol: 0.08, freq: 300, filter: 'lowpass' });
      arpeggio([67, 72, 76, 79], { step: 0.09, vol: 0.1, delay: 0.1 });
    },
    locked: () => {
      tone({ type: 'square', freq: 140, dur: 0.07, vol: 0.07 });
      tone({ type: 'square', freq: 140, dur: 0.07, vol: 0.07, delay: 0.1 });
    },
    hurt: () => {
      tone({ type: 'sawtooth', freq: 420, to: 70, dur: 0.35, vol: 0.12 });
      noise({ dur: 0.25, vol: 0.08, freq: 700 });
    },
    powerup: () => arpeggio([60, 64, 67, 72, 76, 79, 84], { step: 0.045, vol: 0.09, type: 'square' }),
    heal: () => tone({ type: 'triangle', freq: 1300, to: 380, dur: 0.28, vol: 0.12 }),
    floorClear: () => {
      arpeggio([67, 72, 76, 79], { step: 0.1, vol: 0.12 });
      tone({ type: 'triangle', freq: midi(84), dur: 0.45, vol: 0.12, delay: 0.42 });
    },
    win: () => {
      arpeggio([72, 76, 79, 84], { step: 0.09, vol: 0.12, type: 'square' });
      arpeggio([79, 84, 88], { step: 0.12, vol: 0.1, delay: 0.4, hold: 2.5 });
    },
    star: (index = 0) => {
      const notes = [88, 91, 96];
      tone({ type: 'triangle', freq: midi(notes[Math.min(2, index)]), dur: 0.3, vol: 0.13 });
      tone({ type: 'sine', freq: midi(notes[Math.min(2, index)] + 12), dur: 0.2, vol: 0.05, delay: 0.05 });
    },
    achievement: () => {
      arpeggio([76, 81, 85, 88], { step: 0.07, vol: 0.09, type: 'square' });
      tone({ type: 'triangle', freq: midi(93), dur: 0.5, vol: 0.1, delay: 0.3 });
    },
    levelUp: () => arpeggio([72, 76, 79, 84, 88, 91, 96], { step: 0.06, vol: 0.1, type: 'square' }),
    coin: () => {
      tone({ type: 'square', freq: midi(83), dur: 0.07, vol: 0.07 });
      tone({ type: 'square', freq: midi(88), dur: 0.35, vol: 0.07, delay: 0.07 });
    },
    crank: () => {
      for (let i = 0; i < 6; i++) noise({ dur: 0.04, vol: 0.12, freq: 1800, q: 4, delay: i * 0.11 });
    },
    drop: () => {
      tone({ type: 'triangle', freq: 420, to: 160, dur: 0.18, vol: 0.12 });
      noise({ dur: 0.12, vol: 0.08, freq: 400, filter: 'lowpass', delay: 0.16 });
    },
    open: () => {
      noise({ dur: 0.1, vol: 0.12, freq: 2200 });
      arpeggio([84, 88, 91, 96, 100], { step: 0.05, vol: 0.09, delay: 0.06 });
    },
    unlock: () => arpeggio([79, 83, 86, 91], { step: 0.07, vol: 0.1 }),
    whoosh: () => noise({ dur: 0.32, vol: 0.05, freq: 400, to: 2800, q: 1.4 }),
    firework: () => {
      noise({ dur: 0.08, vol: 0.06, freq: 1500, delay: 0 });
      noise({ dur: 0.7, vol: 0.12, freq: 900, to: 120, filter: 'lowpass', delay: 0.05 });
    }
  };

  function play(name, arg) {
    if (!sfxEnabled) return;
    const sound = SOUNDS[name];
    if (!sound) {
      console.warn(`[LoveQuest] Unknown sound "${name}"`);
      return;
    }
    if (!ensureContext()) return;
    if (ctx.state !== 'running') {
      /* "suspended", or "interrupted" on iOS after a call; never wake the engine in a background tab */
      if (document.hidden || ctx.state === 'closed') return;
      ctx.resume().catch(() => {});
    }
    try {
      sound(arg);
    } catch (err) {
      console.warn(`[LoveQuest] Sound "${name}" failed`, err);
    }
  }

  function syncMusic() {
    if (!musicEl || musicBroken) return;
    const shouldPlay = musicWanted && musicEnabled && !document.hidden;
    if (shouldPlay && musicEl.paused) {
      const attempt = musicEl.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => { /* blocked until the next user gesture; unlock() retries */ });
      }
    } else if (!shouldPlay && !musicEl.paused) {
      musicEl.pause();
    }
  }

  function onVisibilityChange() {
    syncMusic();
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  }

  LQ.audio = {
    SOUND_NAMES: Object.freeze(Object.keys(SOUNDS)),

    init(element) {
      musicEl = element;
      if (musicEl) {
        musicEl.volume = MUSIC_VOLUME;
        musicEl.addEventListener('error', () => {
          musicBroken = true;
          console.warn('[LoveQuest] The background music could not be loaded.');
        });
      }
      document.addEventListener('visibilitychange', onVisibilityChange);
    },

    /** Must run inside a user gesture at least once (browser autoplay rules). */
    unlock() {
      const context = ensureContext();
      if (context && context.state !== 'running' && context.state !== 'closed') context.resume().catch(() => {});
      syncMusic();
    },

    play,

    startMusic() {
      musicWanted = true;
      syncMusic();
    },

    setMusicEnabled(enabled) {
      musicEnabled = Boolean(enabled);
      syncMusic();
    },

    setSfxEnabled(enabled) {
      sfxEnabled = Boolean(enabled);
    },

    /** Lowers the music for a moment so a jingle can shine. */
    duck(ms, level) {
      if (!musicEl) return;
      clearTimeout(duckTimer);
      musicEl.volume = MUSIC_VOLUME * (level === undefined ? 0.3 : level);
      duckTimer = setTimeout(() => {
        musicEl.volume = MUSIC_VOLUME;
      }, ms);
    },

    vibrate(pattern) {
      if (!sfxEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        /* vibration is optional */
      }
    }
  };
})(globalThis.LQ = globalThis.LQ || {});
