/* Love Quest · the quest map: a winding footpath from the ruins to the castle. */
(function (LQ) {
  'use strict';

  const U = LQ.utils;
  const t = (key, vars) => LQ.t(key, vars);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const WALK_SPEED = 170; // px per second
  const AVATAR_SCALE = 3;
  const AVATAR_LIFT = 26; // the hero stands slightly above the node centre
  const AVATAR_HEADROOM = AVATAR_LIFT + 16 * AVATAR_SCALE + 8; // room above a node for the hero standing on it
  const MIN_NODE_GAP = 84; // node diameter plus a little air
  const NODE_STATES = Object.freeze(['locked', 'done', 'current', 'open']);

  function starText(count) {
    return '★'.repeat(count) + '☆'.repeat(3 - count);
  }

  /** A gentle zigzag of node positions: bottom-to-top when vertical, left-to-right otherwise. */
  function zigzag(width, height, count, vertical) {
    const points = [];
    for (let i = 0; i < count; i++) {
      const share = count > 1 ? i / (count - 1) : 0.5;
      if (vertical) {
        const padY = U.clamp(height * 0.09, 46, 80);
        const top = U.clamp(AVATAR_HEADROOM, padY, Math.max(padY, height - padY));
        const swing = Math.max(0, width / 2 - U.clamp(width * 0.16, 52, 90));
        points.push({ x: width / 2 + Math.sin(i * 1.35 + 0.35) * swing, y: height - padY - share * (height - padY - top) });
      } else {
        const padX = U.clamp(width * 0.08, 56, 120);
        const padY = U.clamp(height * 0.16, 52, 90);
        const top = U.clamp(AVATAR_HEADROOM, padY, Math.max(padY, height - padY));
        const swing = Math.max(0, (height - top - padY) / 2);
        points.push({ x: padX + share * (width - padX * 2), y: top + swing + Math.sin(i * 1.3 + 0.9) * swing });
      }
    }
    return points;
  }

  function minSpacing(points) {
    let min = Infinity;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        min = Math.min(min, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
      }
    }
    return min;
  }

  /** Vertical path on portrait screens, horizontal otherwise; the other way round when that keeps nodes apart. */
  function layoutPoints(width, height, count) {
    const preferVertical = height > width * 1.05;
    const preferred = zigzag(width, height, count, preferVertical);
    const spacing = minSpacing(preferred);
    if (spacing >= MIN_NODE_GAP) return preferred;
    const other = zigzag(width, height, count, !preferVertical);
    return minSpacing(other) > spacing ? other : preferred;
  }

  /** Smooth Catmull-Rom segment between points i and i+1 as an SVG path. */
  function segmentPath(points, i) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs || {})) node.setAttribute(name, String(value));
    return node;
  }

  function openLevelCard(levelId) {
    const meta = LQ.progress.levelMeta(levelId);
    const state = LQ.progress.levelState(levelId);
    const index = LQ.progress.levelIndex(levelId);
    const isFinal = levelId === 'final';
    const goals = isFinal ? [t('level.final.goal')] : LQ.games[levelId].starGoals();

    const goalList = U.el('ul', { class: 'level-card__goals' }, goals.map((goal, i) => {
      const earned = !isFinal && state.stars > i;
      return U.el('li', { class: `level-card__goal${earned ? ' is-earned' : ''}` }, [
        U.el('span', { class: 'level-card__goal-star', text: isFinal ? '❤' : earned ? '★' : '☆', attrs: { 'aria-hidden': 'true' } }),
        U.el('span', { text: goal })
      ]);
    }));

    const content = U.el('div', { class: 'level-card' }, [
      U.el('div', { class: 'level-card__badge', text: meta.icon, attrs: { 'aria-hidden': 'true' } }),
      U.el('p', { class: 'level-card__trial', text: isFinal ? t('map.finale') : t('map.trial', { n: index + 1 }) }),
      U.el('p', { class: 'level-card__desc', text: t(`level.${levelId}.desc`) }),
      U.el('h3', { class: 'level-card__goals-title', text: t('map.goals') }),
      goalList,
      isFinal ? null : U.el('p', {
        class: 'level-card__best',
        text: state.plays > 0 ? t('map.best', { score: U.formatNumber(state.best) }) : t('map.noBest')
      })
    ]);

    return LQ.ui.modal.open({
      title: t(`level.${levelId}.title`),
      content,
      className: 'modal--level',
      actions: [{
        label: state.completed ? t('map.replay') : t('map.play'),
        kind: isFinal ? 'gold' : 'primary',
        autofocus: true,
        onClick: () => LQ.app.startLevel(levelId)
      }]
    });
  }

  function registerMap() {
    const el = document.getElementById('scene-map');

    LQ.ui.scenes.register('map', {
      el,
      ambient: true,
      enter(params, scope) {
        const world = document.getElementById('map-world');
        const statsEl = document.getElementById('map-stats');
        const dock = document.getElementById('map-dock');
        const faceEl = document.getElementById('map-hero-face');
        const save = LQ.store.data;
        const levels = LQ.progress.LEVELS;

        let points = [];
        let segments = [];
        let nodes = [];
        let avatarPos = { x: 0, y: 0 };
        let avatarDir = 'down';
        let walk = null; // { road, length, distance, target, onDone }
        let idleBob = -1;
        let idleOffset = 0;
        let levelCard = null; // { levelId, dialog } of the last level card this map opened

        /* After a first clear the hero starts at the finished trial and walks to the new one. */
        let standing = LQ.progress.currentLevelId();
        let pendingUnlock = null;
        const walkFromIndex = params.walkFrom ? LQ.progress.levelIndex(params.walkFrom) : -1;
        const nextId = walkFromIndex >= 0 && walkFromIndex < levels.length - 1 ? levels[walkFromIndex + 1].id : null;
        /* Only a trial that is still next is worth the walk (another tab may have finished it already). */
        const shouldWalk = nextId !== null && LQ.progress.isUnlocked(nextId) && !LQ.progress.levelState(nextId).completed;
        if (shouldWalk) {
          standing = params.walkFrom;
          pendingUnlock = nextId;
        }

        world.textContent = '';
        const svg = svgEl('svg', { class: 'map-path', 'aria-hidden': 'true' });
        const nodeLayer = U.el('div', { class: 'map-nodes' });
        const avatar = LQ.sprites.createView(16, 16, AVATAR_SCALE);
        avatar.classList.add('map-avatar');
        avatar.setAttribute('aria-hidden', 'true');
        const shadow = U.el('div', { class: 'map-avatar-shadow', attrs: { 'aria-hidden': 'true' } });
        world.append(svg, nodeLayer, shadow, avatar);

        const face = LQ.sprites.createView(16, 16, 3);
        faceEl.textContent = '';
        faceEl.append(face);
        face.show(LQ.sprites.hero(save.hero.avatar, 'down', 0));

        function renderHud() {
          const love = LQ.progress.loveLevel();
          document.getElementById('map-hero-name').textContent = LQ.app.heroName();
          document.getElementById('map-hero-rank').textContent = `${t('map.loveLevel', { n: love.level })} · ${love.title}`;
          document.getElementById('map-xp-fill').style.width = `${Math.round(love.progress * 100)}%`;
          statsEl.textContent = '';
          const chip = (icon, value, label) => U.el('div', { class: 'chip chip--map', attrs: { title: label, 'aria-label': `${label}: ${value}` } }, [
            U.el('span', { class: 'chip__icon', text: icon, attrs: { 'aria-hidden': 'true' } }),
            U.el('span', { class: 'chip__value', text: value })
          ]);
          statsEl.append(
            chip('💗', U.formatNumber(LQ.progress.totalLP()), t('map.stats.lp')),
            chip('⭐', `${LQ.progress.totalStars()}/${LQ.progress.maxStars()}`, t('map.stats.stars')),
            chip('🪙', String(save.tokens), t('map.stats.tokens'))
          );

          const couponsLeft = LQ.content.coupons.length - save.coupons.filter((i) => i < LQ.content.coupons.length).length;
          const canSpin = save.tokens >= LQ.progress.SPIN_COST && couponsLeft > 0;
          updateDock('letter', t('map.letter'), `${LQ.progress.letterPiecesFound()}/${LQ.progress.LETTER_PIECES}`);
          updateDock('gacha', t('map.gacha'), canSpin ? '!' : '', canSpin);
          updateDock('trophies', t('map.trophies'), `${LQ.achievements.unlockedCount()}/${LQ.achievements.LIST.length}`);
          updateDock('settings', t('map.settings'), '');
        }

        /* The dock is built once and updated in place, so keyboard focus survives updates. */
        const dockButtons = {};
        dock.textContent = '';
        for (const def of [
          { key: 'letter', icon: '💌', open: () => LQ.ui.menus.openLetter() },
          { key: 'gacha', icon: '🎰', open: () => LQ.ui.gacha.open('machine') },
          { key: 'trophies', icon: '🏆', open: () => LQ.ui.menus.openTrophies() },
          { key: 'settings', icon: '⚙️', open: () => LQ.ui.menus.openSettings() }
        ]) {
          const label = U.el('span', { class: 'dock-btn__label' });
          const badge = U.el('span', { class: 'dock-btn__badge', attrs: { 'aria-hidden': 'true' } });
          const button = U.el('button', { type: 'button', class: 'dock-btn' }, [
            U.el('span', { class: 'dock-btn__icon', text: def.icon, attrs: { 'aria-hidden': 'true' } }),
            label,
            badge
          ]);
          scope.on(button, 'click', () => {
            LQ.audio.play('click');
            def.open();
          });
          dockButtons[def.key] = { button, label, badge };
          dock.append(button);
        }

        function updateDock(key, text, badgeText, highlight) {
          const entry = dockButtons[key];
          entry.label.textContent = text;
          entry.badge.textContent = badgeText;
          entry.badge.hidden = !badgeText;
          entry.button.classList.toggle('is-highlight', Boolean(highlight));
          entry.button.setAttribute('aria-label', badgeText ? `${text} (${badgeText})` : text);
        }

        function showLevelCard(levelId) {
          levelCard = { levelId, dialog: openLevelCard(levelId) };
        }

        function nodeState(levelId) {
          if (!LQ.progress.isUnlocked(levelId) || levelId === pendingUnlock) return 'locked';
          if (LQ.progress.levelState(levelId).completed) return 'done';
          return levelId === LQ.progress.currentLevelId() ? 'current' : 'open';
        }

        function positionNodes() {
          nodes.forEach((node, index) => {
            const point = points[index];
            if (!point) return;
            node.style.left = `${point.x}px`;
            node.style.top = `${point.y}px`;
          });
        }

        /* The nodes are built once and updated in place, so focus and running animations survive updates. */
        function buildNodes() {
          nodeLayer.textContent = '';
          nodes = levels.map((level, index) => {
            const isFinal = level.id === 'final';
            const node = U.el('button', { type: 'button', class: `map-node${isFinal ? ' is-final' : ''}` }, [
              U.el('span', { class: 'map-node__icon', attrs: { 'aria-hidden': 'true' } }),
              U.el('span', { class: 'map-node__num', text: isFinal ? '♥' : String(index + 1), attrs: { 'aria-hidden': 'true' } }),
              U.el('span', { class: 'map-node__stars', attrs: { 'aria-hidden': 'true' } }),
              U.el('span', { class: 'map-node__name', attrs: { 'aria-hidden': 'true' } })
            ]);
            scope.on(node, 'click', () => {
              if (walk) return;
              if (nodeState(level.id) === 'locked') {
                LQ.audio.play('locked');
                LQ.fx.shake(node, 0.5);
                LQ.fx.toast({ icon: '🔒', title: t('map.locked') });
                return;
              }
              LQ.audio.play('select');
              showLevelCard(level.id);
            });
            /* Lets the current-trial pulse take over again once the unlock pop has played. */
            scope.on(node, 'animationend', (event) => {
              if (event.animationName === 'unlockPop') node.classList.remove('is-unlocking');
            });
            nodeLayer.append(node);
            return node;
          });
        }

        function updateNodes() {
          levels.forEach((level, index) => {
            const node = nodes[index];
            const state = LQ.progress.levelState(level.id);
            const status = nodeState(level.id);
            const isFinal = level.id === 'final';
            const title = t(`level.${level.id}.title`);
            const label = `${isFinal ? t('map.finale') : t('map.trial', { n: index + 1 })}: ${title}` +
              (!isFinal && state.completed ? `, ${state.stars}/3 ★` : '');
            NODE_STATES.forEach((name) => node.classList.toggle(`is-${name}`, name === status));
            node.setAttribute('aria-label', status === 'locked' ? `${label} 🔒` : label);
            node.querySelector('.map-node__icon').textContent = status === 'locked' ? '🔒' : level.icon;
            const stars = node.querySelector('.map-node__stars');
            stars.hidden = isFinal || status === 'locked';
            stars.textContent = starText(state.stars);
            node.querySelector('.map-node__name').textContent = title;
          });
        }

        function renderPath() {
          const width = world.clientWidth;
          const height = world.clientHeight;
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
          svg.setAttribute('width', String(width));
          svg.setAttribute('height', String(height));
          svg.textContent = '';
          segments = [];
          for (let i = 0; i < points.length - 1; i++) {
            const d = segmentPath(points, i);
            const done = LQ.progress.levelState(levels[i].id).completed && levels[i + 1].id !== pendingUnlock;
            svg.append(svgEl('path', { d, class: 'map-path__glow' }));
            const road = svgEl('path', { d, class: `map-path__road${done ? ' is-done' : ''}` });
            svg.append(road);
            segments.push(road);
          }
        }

        function placeAvatar() {
          const x = Math.round(avatarPos.x);
          const y = Math.round(avatarPos.y - AVATAR_LIFT);
          avatar.style.transform = `translate(${x - 8 * AVATAR_SCALE}px, ${y - 16 * AVATAR_SCALE + idleOffset}px)`;
          shadow.style.transform = `translate(${x - 14}px, ${y - 5}px)`;
        }

        function layout() {
          points = layoutPoints(world.clientWidth, world.clientHeight, levels.length);
          renderPath();
          positionNodes();
          if (walk) {
            /* The screen changed size mid-walk: arrive immediately. */
            const { target, onDone } = walk;
            walk = null;
            avatarPos = { ...points[target] };
            placeAvatar();
            onDone();
            return;
          }
          avatarPos = { ...points[LQ.progress.levelIndex(standing)] };
          placeAvatar();
        }

        function startWalk(fromIndex) {
          const target = fromIndex + 1;
          const road = segments[fromIndex];
          if (!road) return;
          avatarPos = { ...points[fromIndex] };
          placeAvatar();
          walk = {
            road,
            target,
            length: road.getTotalLength(),
            distance: 0,
            onDone: () => {
              standing = levels[target].id;
              pendingUnlock = null;
              avatarDir = 'down';
              renderPath();
              updateNodes();
              const node = nodes[target];
              node.classList.add('is-unlocking');
              const rect = node.getBoundingClientRect();
              LQ.fx.sparkle(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
              LQ.audio.play('unlock');
              scope.timeout(() => {
                /* Progress may have moved on meanwhile (another tab): then refresh() moved the hero. */
                if (!LQ.ui.modal.isOpen() && standing === levels[target].id) showLevelCard(levels[target].id);
              }, 650);
            }
          };
        }

        /* Progress can change while the map is showing (gacha, trophies, another tab): redraw in place. */
        function refresh() {
          renderHud();
          face.show(LQ.sprites.hero(save.hero.avatar, 'down', 0));
          /* A card whose trial another tab locked again would only lead to "not available". */
          if (levelCard && levelCard.dialog.isOpen && !LQ.progress.isUnlocked(levelCard.levelId)) levelCard.dialog.close('locked');
          /* A walk to the trial that is still next finishes first; its arrival redraws everything. */
          if (pendingUnlock && LQ.progress.isUnlocked(pendingUnlock) && !LQ.progress.levelState(pendingUnlock).completed) return;
          /* Otherwise (another tab reset or advanced the quest) the walk is obsolete. */
          walk = null;
          pendingUnlock = null;
          standing = LQ.progress.currentLevelId();
          renderPath();
          updateNodes();
          avatarPos = { ...points[LQ.progress.levelIndex(standing)] };
          placeAvatar();
        }

        scope.add(LQ.events.on('progress', refresh));
        scope.add(LQ.events.on('language', () => {
          renderHud();
          updateNodes();
        }));

        buildNodes();
        renderHud();
        updateNodes();
        U.observeResize(scope, world, layout);
        layout();

        if (shouldWalk) {
          scope.timeout(() => {
            if (pendingUnlock) startWalk(walkFromIndex);
          }, 450);
        } else if (params.fromIntro) {
          scope.timeout(() => {
            if (!LQ.ui.modal.isOpen()) showLevelCard(LQ.progress.currentLevelId());
          }, 600);
        } else if (params.welcome) {
          LQ.fx.toast({ icon: '🏰', title: t('map.welcomeBack', { name: LQ.app.heroName() }) });
        }

        U.createLoop(scope, (dt, now) => {
          if (walk) {
            walk.distance = Math.min(walk.length, walk.distance + WALK_SPEED * dt);
            const point = walk.road.getPointAtLength(walk.distance);
            const dx = point.x - avatarPos.x;
            const dy = point.y - avatarPos.y;
            if (Math.abs(dx) + Math.abs(dy) > 0.01) {
              avatarDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            }
            avatarPos = { x: point.x, y: point.y };
            placeAvatar();
            avatar.show(LQ.sprites.hero(save.hero.avatar, avatarDir, LQ.sprites.walkStep(now / 1000)));
            idleBob = -1;
            idleOffset = 0;
            if (walk.distance >= walk.length) {
              const { onDone } = walk;
              walk = null;
              onDone();
            }
            return;
          }
          const bob = Math.floor(now / 520) % 2;
          if (bob !== idleBob) {
            idleBob = bob;
            idleOffset = bob ? -2 : 0;
            avatar.show(LQ.sprites.hero(save.hero.avatar, 'down', 0));
            placeAvatar();
          }
        }).start();
      }
    });
  }

  LQ.ui = LQ.ui || {};
  LQ.ui.map = { init: registerMap, layoutPoints, segmentPath, openLevelCard };
})(globalThis.LQ = globalThis.LQ || {});
