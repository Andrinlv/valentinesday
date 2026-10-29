# 💌 Love Quest · Valentinesday

A cozy retro Valentine's adventure in the browser. Your Valentine chooses a pixel hero,
walks a winding path from the old ruins to the castle and passes five trials of love,
including a three-floor pixel labyrinth, before facing **the final question**.

Everything is plain HTML, CSS and JavaScript: no build step, no frameworks, no tracking.
Open `index.html` and play, on a phone or a computer.

---

## ✨ What's inside

| # | Trial | What happens |
|---|-------|--------------|
| 1 | 💘 **Catch the Love** | Tap rising hearts, chain combos up to x5, grab five love letters with your personal notes, avoid broken hearts. |
| 2 | 📸 **Memories** | A polaroid memory game with six pairs (emojis or your own photos), move counter and one "peek". |
| 3 | 🏹 **Cupid's Arrow** | Slingshot archery with real arrow physics and a trajectory preview. One arrow can pierce several hearts. |
| 4 | 💬 **Love Quiz** | Your own questions, a speed bonus and a 50:50 joker. |
| 5 | 🌹 **The Labyrinth** | A retro rose-garden maze over three floors: find the key, open the gate, carry a torch through the twilight, outsmart the Heartbreaker ghosts at night with a love potion. Every maze is generated fresh and always solvable. |
| ♥ | 💍 **The Final Question** | "Will you be my Valentine?", with a NO button that runs away. Saying YES unlocks fireworks, your secret letter, a special coupon and a downloadable **certificate of love**. |

**Gamification:** 1 to 3 stars per trial, love points and a love level with titles,
18 achievements (some secret), tokens, the **Love-o-Matic** capsule machine that pays out
real-life love coupons, a secret letter that is revealed piece by piece, and a save game
that remembers everything.

**Polish:** hand-made pixel art, chiptune sound effects, background music, an iris-wipe
transition, particles, confetti and fireworks, English and German, keyboard, touch and
gamepad controls, reduced-motion support and an optional retro TV filter.

---

## 🚀 Play

1. Open `index.html` in a browser (double-click works), **or**
2. serve the folder locally for the best experience:

   ```bash
   npm start
   ```

   then open <http://localhost:8080>.

The game saves progress in the browser (`localStorage`). *Settings → Reset progress* starts over.

---

## 💝 Make it yours

Everything personal lives in **`js/config.js`**:

| Setting | Meaning |
|---------|---------|
| `language` | `'en'` or `'de'` (players can switch in the settings). |
| `heroName` | Name of the person playing (pre-filled on the hero screen). |
| `belovedName` | Your name; signs the letter and waits at the end of the labyrinth. |
| `belovedAvatar` | Your pixel avatar: `0` Rose, `1` Wanderer, `2` Sunny, `3` Royal. |
| `loveQuotes` | The notes inside the five love letters of trial 1. |
| `memoryItems` | Six emojis **or image paths** (e.g. `'assets/photos/us-1.jpg'`). |
| `quiz` | Your questions: `answers`, `correct` (index starting at 0) and an optional `wrongMsg`. |
| `proposalQuestion` | The final question. |
| `finalLetter` | Your letter. Line breaks (`\n`) are kept. |
| `coupons` / `finalCoupon` | Rewards from the Love-o-Matic and for saying YES. |

Invalid entries never break the game: they are skipped or replaced by defaults, with a
hint in the browser console (F12).

---

## 🎮 Controls

| | Desktop | Phone / tablet |
|---|---|---|
| Menus | Mouse, Tab, Enter, Escape | Tap |
| Catch / Memory | Click | Tap |
| Cupid's Arrow | Drag back and release, or ←/→ aim, ↑/↓ power, Space shoot | Pull back and release |
| Quiz | Click or keys 1–6 | Tap |
| Labyrinth | Arrow keys / WASD, gamepad | Swipe or on-screen pad |
| Pause | Escape or P (Start on a gamepad) | ❚❚ button |

The game pauses automatically when the tab is hidden.

---

## 📁 Project structure

```text
index.html            entry point (all scenes)
css/main.css          design system, menus, map, modals
css/games.css         trial-specific styles
js/config.js          ❤ your personal content
js/core/              engine: utils, i18n, content validation, save game, audio,
                      pixel sprites, effects, progress, achievements, input
js/ui/                scenes & transitions, modals, HUD, menus, results,
                      Love-o-Matic, loading/hero/intro screens, quest map
js/games/             catch, memory, archery, quiz, maze, final
js/main.js            bootstrap and the trial session API
assets/img, assets/audio
tests/unit            unit tests (node:test)
tests/e2e             full Playwright playthrough (desktop + mobile)
```

---

## 🛠 Development

```bash
npm install                     # ESLint + Playwright (only needed for development)
npx playwright install chromium
npm run lint                    # static checks
npm test                        # unit tests
npm run test:e2e                # plays the whole game on desktop and mobile
```

Debug flags (append to the URL):

- `?debug=1` exposes the current trial in the console (`LQ.debug.session`).
- `?debug=1&unlock=1` unlocks every trial on the map (great for previewing your changes).
- `?debug=1&seed=42` makes the labyrinth reproducible.

Works in current versions of Chrome, Edge, Firefox and Safari (desktop and mobile).

---

## 📜 License & Privacy

This repository is intended to remain private. The code may be copied for personal or
educational use. Please respect the privacy of the original creator.

Happy coding and happy Valentine's Day! 💘
