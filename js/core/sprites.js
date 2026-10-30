/* Love Quest · hand-made pixel art. Every sprite is a grid of palette letters ('.' = transparent). */
(function (LQ) {
  'use strict';

  const OUTLINE = '#3b2326';
  const FACE = { o: OUTLINE, e: OUTLINE, w: '#fffaf2', b: '#f4a3a8', m: '#b5525c', g: '#f2c35b' };

  /* Upper bodies (rows 0–13) per hair style and facing. "side" faces left; right is mirrored. */
  const STYLES = {
    short: {
      front: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhHho...',
        '...ohhsssshho...',
        '...ohssssssho...',
        '...ohewssewho...',
        '...oseesseeso...',
        '....obsmmsbo....',
        '.....ooSSoo.....',
        '...occcwwccco...',
        '..osCccccccCso..',
        '...oCggggggCo...'
      ],
      back: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...oHhhhhhhHo...',
        '....oHHHHHHo....',
        '.....ooSSoo.....',
        '...occcccccco...',
        '..osCccccccCso..',
        '...oCggggggCo...'
      ],
      side: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohsshhhhho...',
        '...osssshhhho...',
        '...osesshhhho...',
        '...osessshhho...',
        '....obsssHHo....',
        '......oSSo......',
        '....occcccco....',
        '....occsscco....',
        '....oCggggCo....'
      ]
    },
    long: {
      front: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '..ohhhhhhhhhho..',
        '..ohhhsssshhho..',
        '..ohhsssssshho..',
        '..ohhewssewhho..',
        '..ohseesseesho..',
        '..ohobsmmsboho..',
        '..ohhooSSoohho..',
        '..ohcccwwcccho..',
        '..ohsccccccsho..',
        '..oHCggggggCHo..'
      ],
      back: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohHhhhhhhHho..',
        '..ohHhhhhhhHho..',
        '..osHHhhhhHHso..',
        '...oCggggggCo...'
      ],
      side: [
        '................',
        '.....oooooo.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhhho..',
        '...ohsshhhhhhho.',
        '...osssshhhhhho.',
        '...osesshhhhhho.',
        '...osessshhhhho.',
        '....obsssHhhhho.',
        '......oSSohhhho.',
        '....occccchhhho.',
        '....occsschhhho.',
        '....oCggggCHHo..'
      ]
    },
    hood: {
      front: [
        '................',
        '......oooo......',
        '....oohhhhoo....',
        '...ohhhhhhhho...',
        '..ohhhhhhhhhho..',
        '..ohhHHHHHHhho..',
        '..ohHssssssHho..',
        '..ohHewssewHho..',
        '..ohseesseesho..',
        '..ohhbsmmsbhho..',
        '..ohhhSSSShhho..',
        '..ohhhhgghhhho..',
        '..osHhhhhhhHso..',
        '..oHHhhhhhhHHo..'
      ],
      back: [
        '................',
        '......oooo......',
        '....oohhhhoo....',
        '...ohhhhhhhho...',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohhhhhhhhhho..',
        '..ohHhhhhhhHho..',
        '..ohHhhhhhhHho..',
        '..ohhhhhhhhhho..',
        '..osHhhhhhhHso..',
        '..oHHHHHHHHHHo..'
      ],
      side: [
        '................',
        '.......oooo.....',
        '.....oohhhhoo...',
        '....ohhhhhhhho..',
        '...ohhhhhhhhhho.',
        '...oHHHhhhhhhho.',
        '...oHsshhhhhhho.',
        '...osesHhhhhhho.',
        '...osessHhhhhho.',
        '....obssHhhhhho.',
        '....ohhhhhhhhho.',
        '....ohhghhhhhho.',
        '....ohshhhhhhho.',
        '....oHHHHHHHHHo.'
      ]
    },
    crown: {
      front: [
        '.....g.gg.g.....',
        '.....gggggg.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhsssshho...',
        '...ohssssssho...',
        '...ohewssewho...',
        '...oseesseeso...',
        '....obsmmsbo....',
        '.....ooSSoo.....',
        '...occcggccco...',
        '..osCccccccCso..',
        '...oCggggggCo...'
      ],
      back: [
        '.....g.gg.g.....',
        '.....gggggg.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...oHhhhhhhHo...',
        '....oHHHHHHo....',
        '.....ooSSoo.....',
        '...occcccccco...',
        '..osCccccccCso..',
        '...oCggggggCo...'
      ],
      side: [
        '......g.g.g.....',
        '.....gggggg.....',
        '....ohhhhhho....',
        '...ohhhhhhhho...',
        '...ohhhhhhhho...',
        '...ohsshhhhho...',
        '...osssshhhho...',
        '...osesshhhho...',
        '...osessshhho...',
        '....obsssHHo....',
        '......oSSo......',
        '....occcccco....',
        '....occsscco....',
        '....oCggggCo....'
      ]
    }
  };

  /* Legs (rows 14–15): [standing, left step, right step]. */
  const LEGS = {
    pants: {
      front: [
        ['....oppooppo....', '.....ff..ff.....'],
        ['....offooppo....', '.........ff.....'],
        ['....oppooffo....', '.....ff.........']
      ],
      side: [
        ['.....oppppo.....', '.....ffff.......'],
        ['....opo..opo....', '...ff.....ff....'],
        ['.....oppppo.....', '......ffff......']
      ]
    },
    dress: {
      front: [
        ['..oCCCCCCCCCCo..', '.....ff..ff.....'],
        ['..oCCCCCCCCCCo..', '.....ff.........'],
        ['..oCCCCCCCCCCo..', '.........ff.....']
      ],
      side: [
        ['....oCCCCCCo....', '.....ff.ff......'],
        ['...oCCCCCCCo....', '....ff....ff....'],
        ['....oCCCCCCo....', '......ff.ff.....']
      ]
    }
  };

  const AVATARS = Object.freeze([
    {
      id: 'rose', nameKey: 'avatar.rose', style: 'long', legs: 'dress',
      palette: { ...FACE, s: '#f7cfae', S: '#e3a989', h: '#9a4f2c', H: '#6e3520', c: '#7aa35f', C: '#56803f', p: '#56803f', f: '#5b3a2a' }
    },
    {
      id: 'wanderer', nameKey: 'avatar.wanderer', style: 'hood', legs: 'pants',
      palette: { ...FACE, s: '#efc19c', S: '#d29c78', h: '#8c7b8f', H: '#625268', c: '#8c7b8f', C: '#625268', p: '#5a4636', f: '#3b2a20' }
    },
    {
      id: 'sunny', nameKey: 'avatar.sunny', style: 'short', legs: 'pants',
      palette: { ...FACE, s: '#fad7bb', S: '#e8b493', h: '#f0c05a', H: '#c98f2e', c: '#e8738a', C: '#c0566c', p: '#4f6d8f', f: '#3b2f3a' }
    },
    {
      id: 'royal', nameKey: 'avatar.royal', style: 'crown', legs: 'pants',
      palette: { ...FACE, s: '#c98d68', S: '#a76f4f', h: '#3a2418', H: '#24150e', c: '#8a5cb8', C: '#664290', p: '#4d3570', f: '#2e2038' }
    }
  ]);

  const HEART = [
    '.ooo...ooo.',
    'oRRRo.oRRRo',
    'oRwwRoRRRRo',
    'oRwRRRRRRRo',
    'oRRRRRRRRRo',
    '.oRRRRRRRo.',
    '..oRRRRRo..',
    '...oRRRo...',
    '....oRo....',
    '.....o.....'
  ];

  const ITEMS = {
    heart: { rows: HEART, palettes: {
      red: { o: '#5e1f2c', R: '#e8576f', w: '#ffd9de' },
      pink: { o: '#6b2a4a', R: '#f49ac1', w: '#fff0f6' },
      gold: { o: '#6b4a12', R: '#f2c35b', w: '#fff6d8' }
    } },
    heartSmall: { rows: [
      '.oo.oo.',
      'oRwoRRo',
      'oRRRRRo',
      '.oRRRo.',
      '..oRo..',
      '...o...'
    ], palettes: { red: { o: '#5e1f2c', R: '#e8576f', w: '#ffd9de' } } },
    heartBroken: { rows: [
      '.ooo...ooo.',
      'oRRRo.oRRRo',
      'oRwwRoRRRRo',
      'oRwRRkRRRRo',
      'oRRRkRRRRRo',
      '.oRRRkRRRo.',
      '..oRkRRRo..',
      '...oRkRo...',
      '....oRo....',
      '.....o.....'
    ], palettes: { grey: { o: '#3a3340', R: '#8d8590', w: '#c9c3cc', k: '#3a3340' } } },
    letter: { rows: [
      'ooooooooooo',
      'oWoWWWWWoWo',
      'oWWoWWWoWWo',
      'oWWWoWoWWWo',
      'oWWWWRWWWWo',
      'oWWWRRRWWWo',
      'oWWWWRWWWWo',
      'ooooooooooo'
    ], palettes: { cream: { o: '#7a4a3a', W: '#fff3e0', R: '#e8576f' } } },
    key: { rows: [
      '.ooo........',
      'oGGGoooooooo',
      'oG.GGGGGGGGo',
      'oGGGoooGoGoo',
      '.ooo...o.o..'
    ], palettes: { gold: { o: '#6b4a12', G: '#f2c35b' } } },
    torch: { rows: [
      '...y..',
      '..yy..',
      '.yYYy.',
      '.yYWy.',
      'yYWWYy',
      '.yYYy.',
      '.oddo.',
      '..dd..',
      '..dD..',
      '..dD..',
      '..dD..',
      '..oo..'
    ], palettes: { warm: { y: '#f6a33c', Y: '#ffd166', W: '#fff5d6', o: OUTLINE, d: '#8a5a3a', D: '#5a3520' } } },
    torchFlicker: { rows: [
      '..y...',
      '..yy..',
      '.yYYy.',
      '.yWYy.',
      'yYWWYy',
      '.yYYy.',
      '.oddo.',
      '..dd..',
      '..dD..',
      '..dD..',
      '..dD..',
      '..oo..'
    ], palettes: { warm: { y: '#f6a33c', Y: '#ffd166', W: '#fff5d6', o: OUTLINE, d: '#8a5a3a', D: '#5a3520' } } },
    potion: { rows: [
      '...ooo...',
      '...oco...',
      '...oco...',
      '..oGGGo..',
      '..oGGGo..',
      '.oGGGGGo.',
      'oPPPPPPPo',
      'oPwRPRPPo',
      'oPPRRRPPo',
      '.oPPRPPo.',
      '..ooooo..'
    ], palettes: { pink: { o: OUTLINE, c: '#b07a4a', G: 'rgba(225, 240, 255, 0.55)', P: '#f49ac1', R: '#e8576f', w: '#fff0f6' } } },
    door: { rows: [
      '.....oooooo.....',
      '...oossssssoo...',
      '..ossddDDddsso..',
      '.osddddDDddddso.',
      '.osmmddDDddmmso.',
      'osdddddDDdddddso',
      'osdddddDDdddddso',
      'osdddggDDggdddso',
      'osdddggggggdddso',
      'osddddggggddddso',
      'osdddddggdddddso',
      'osdddddDDdddddso',
      'osmmdddDDdddmmso',
      'osdddddDDdddddso',
      'osdddddDDdddddso',
      'osssssssssssssso'
    ], palettes: { wood: { o: OUTLINE, s: '#b9a898', d: '#a0673f', D: '#6e4226', m: '#5d5560', g: '#f2c35b' } } },
    doorOpen: { rows: [
      '.....oooooo.....',
      '...oossssssoo...',
      '..osskkkkkksso..',
      '.oskkkkkkkkkkso.',
      '.oskkkkkkkkkkso.',
      'oskkkkkkkkkkkkso',
      'oskkkkkkkkkkkkso',
      'oskkkkkkkkkkkkso',
      'oskkkkkkkkkkkkso',
      'oskkkkkkkkkkkkso',
      'oskkkkkkkkkkkkso',
      'oskkkkLLLLkkkkso',
      'oskkkLLLLLLkkkso',
      'oskkLLLLLLLLkkso',
      'oskLLLLLLLLLLkso',
      'osssssssssssssso'
    ], palettes: { night: { o: OUTLINE, s: '#b9a898', k: '#1f1220', L: '#f6d28b' } } },
    ghost: { rows: [
      '................',
      '.....oooooo.....',
      '...oovvvvvvoo...',
      '..ovvvvvvvvvvo..',
      '..ovvvvvvvvvvo..',
      '.ovvwwvvvvwwvvo.',
      '.ovvwevvvvwevvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvmvvmvvvvo.',
      '.ovvvvvmmvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvoovvvvoovvo.',
      '.ovo..ovvo..ovo.',
      '..o....oo....o..'
    ], palettes: {
      normal: { o: '#3b2346', v: '#9b7bc8', w: '#fffaf2', e: '#2c1a3e', m: '#2c1a3e' },
      scared: { o: '#3c5a78', v: '#a9d0ee', w: '#a9d0ee', e: '#ffffff', m: '#ffffff' }
    } },
    ghostWobble: { rows: [
      '................',
      '.....oooooo.....',
      '...oovvvvvvoo...',
      '..ovvvvvvvvvvo..',
      '..ovvvvvvvvvvo..',
      '.ovvwwvvvvwwvvo.',
      '.ovvwevvvvwevvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvmvvmvvvvo.',
      '.ovvvvvmmvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.ovvvvvvvvvvvvo.',
      '.oovvvvoovvvvoo.',
      '..ovvo....ovvo..',
      '...oo......oo...'
    ], palettes: {
      normal: { o: '#3b2346', v: '#9b7bc8', w: '#fffaf2', e: '#2c1a3e', m: '#2c1a3e' },
      scared: { o: '#3c5a78', v: '#a9d0ee', w: '#a9d0ee', e: '#ffffff', m: '#ffffff' }
    } }
  };

  const cache = new Map();

  function render(rows, palette, flip) {
    const height = rows.length;
    const width = rows[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    for (let y = 0; y < height; y++) {
      const row = rows[y];
      for (let x = 0; x < width; x++) {
        const key = row[flip ? width - 1 - x : x];
        if (key === '.') continue;
        const color = palette[key];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return canvas;
  }

  function cached(key, build) {
    let canvas = cache.get(key);
    if (!canvas) {
      canvas = build();
      cache.set(key, canvas);
    }
    return canvas;
  }

  /** Raw rows for a hero frame (16×16). dir: up/down/left/right, step: 0 stand, 1/2 walking. */
  function heroRows(avatar, dir, step) {
    const style = STYLES[avatar.style];
    const facing = dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side';
    const legSet = LEGS[avatar.legs][facing === 'side' ? 'side' : 'front'];
    return style[facing].concat(legSet[step] || legSet[0]);
  }

  function normalizeAvatar(index) {
    return Number.isInteger(index) && index >= 0 && index < AVATARS.length ? index : 0;
  }

  const sprites = {
    AVATARS,
    STYLES,
    LEGS,
    ITEMS,
    TILE: 16,

    heroRows(avatarIndex, dir, step) {
      return heroRows(AVATARS[normalizeAvatar(avatarIndex)], dir || 'down', step || 0);
    },

    /** 16×16 canvas of a hero frame. */
    hero(avatarIndex, dir, step) {
      const index = normalizeAvatar(avatarIndex);
      const facing = dir || 'down';
      const frame = step || 0;
      return cached(`hero|${index}|${facing}|${frame}`, () =>
        render(heroRows(AVATARS[index], facing, frame), AVATARS[index].palette, facing === 'right'));
    },

    /** Walking animation step for a running clock: step, stand, other step, stand. */
    walkStep(time) {
      return [1, 0, 2, 0][Math.floor(time * 8) % 4];
    },

    item(name, variant) {
      const item = ITEMS[name];
      if (!item) throw new Error(`Unknown sprite "${name}"`);
      const paletteName = variant && item.palettes[variant] ? variant : Object.keys(item.palettes)[0];
      return cached(`item|${name}|${paletteName}`, () => render(item.rows, item.palettes[paletteName], false));
    },

    /** A DOM canvas that shows pixel art crisply at an integer scale. */
    createView(width, height, scale) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.className = 'pixel-art';
      canvas.style.width = `${width * scale}px`;
      canvas.style.height = `${height * scale}px`;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      canvas.show = (source, offsetX, offsetY) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(source, offsetX || 0, offsetY || 0);
      };
      return canvas;
    }
  };

  LQ.sprites = sprites;
})(globalThis.LQ = globalThis.LQ || {});
