# Pixel Plumber (Mario-Style Platformer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an original Mario-style browser platformer with three levels, power-ups, enemies, generated pixel art, and generated sound.

**Architecture:** Vanilla JS ES modules, one responsibility per file. Pure logic modules (physics, movement, level parsing, player power state, combat rules, scoring, session, camera, state machine, storage) have no DOM access and are unit-tested with `node --test`. Rendering, audio output, and game feel are checked by hand in a browser. A fixed 60 Hz timestep drives updates; rendering interpolates between the previous and current body positions.

**Tech Stack:** HTML5 Canvas, WebAudio, ES modules, Node's built-in test runner (`node --test`). No dependencies, no build step.

**Spec:** `docs/superpowers/specs/2026-10-06-mario-game-design.md`

## Global Constraints

Copied from the spec. Every task's requirements include these.

- Vanilla JavaScript with ES modules. No dependencies and no build tooling.
- Served with `python3 -m http.server 8000`. There is no `npm install` and no build step; `package.json` only holds `"type": "module"` and the test script.
- Unit tests use Node's built-in runner (`node --test`), with no dependencies.
- No image or audio files. Sprites are pixel art defined in code and rendered to canvas; all sound is generated with WebAudio.
- Fixed timestep (60 Hz) for updates; rendering interpolates between updates; the frame delta is clamped to a maximum.
- All tuning values live in `src/constants.js`.
- Original game: no Nintendo characters, names, music, or assets.
- Controls: Move = Arrow keys or A/D; Jump = Space, W, or Up; Run = Shift; Fireball = X (fire state only); Mute = M.
- All levels are exactly 14 rows tall; the camera scrolls horizontally only.
- Level characters: `.` empty, `#` ground, `B` brick, `?` ? block (coin), `M` ? block (mushroom, becomes a fire flower when the player is already big), `C` coin, `G` goomba, `K` koopa, `P` player start, `F` goal flag, `|` pipe, `-` one-way platform.
- Level validation errors name the level, row (1-based), and column (1-based).
- `localStorage` access is wrapped in try/catch with defaults. If WebAudio is unavailable, every audio call is a no-op. The game pauses on tab blur.

## Review Focus

Inputs and conditions the spec implies but no spec line pins down. Each has a test in the task that owns the code.

- A key still held when the window loses focus must not stay "pressed" (stuck movement). Task 1 (`input.test.js`).
- Level files saved with Windows line endings (`\r\n`) or trailing spaces must still parse. Task 2 (`level.test.js`).
- Holding the jump key after landing must not make the player re-jump; only a fresh press does. Task 4 (`movement.test.js`).
- A head that straddles two blocks must hit only the block it overlaps most, not both. Task 3 (`physics.test.js`).
- Kicking a stationary koopa shell must not hurt the player on the same contact. Task 7 (`world.test.js`).

## File Structure

```
index.html                 canvas + module script
package.json               "type": "module" + test script
.gitignore
README.md                  how to run, controls, level format
src/
  constants.js             all tuning values
  loop.js                  createStepper (pure), startLoop (rAF)
  input.js                 keyboard state with press edges
  storage.js               safe localStorage wrapper
  tiles.js                 tile ids, TileMap
  level.js                 parseLevel + LevelError
  levels/index.js          LEVELS list, loadLevel
  levels/level1.js level2.js level3.js
  physics.js               bodies, gravity, tile collision, overlaps, renderPos
  movement.js              player motor: accel, friction, jump, coyote, buffer
  playerState.js           small/big/fire transitions (pure)
  camera.js                horizontal follow, active-range test
  combat.js                stomp vs side classification, stomp scoring, stompEnemy
  session.js               score, coins, lives, power across levels
  spriteData.js            pixel art + palette (pure data)
  sprites.js               canvas rendering of sprite data
  render.js                drawBodySprite, drawTiles, background
  blocks.js                brick/? block hit logic, bumps
  interactions.js          player/enemy/item/fireball interactions
  world.js                 createWorld, updateWorld, renderWorld
  stateMachine.js          createMachine
  states.js                title, playing, levelClear, gameOver, win, error
  hud.js                   score/coins/lives/world/time
  audio.js                 WebAudio synth: SFX + music
  main.js                  boot
  entities/
    player.js walker.js goomba.js koopa.js powerup.js fireball.js coin.js coinpop.js debris.js index.js
test/                      one *.test.js per pure module + helpers.js
```

---

### Task 1: Scaffold, constants, loop, input

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `README.md`
- Create: `src/constants.js`, `src/loop.js`, `src/input.js`, `src/main.js`
- Test: `test/loop.test.js`, `test/input.test.js`

**Interfaces:**
- Produces:
  - `constants.js`: `TILE, VIEW_W, VIEW_H, LEVEL_ROWS, STEP, MAX_FRAME, PHYS, PLAYER, ENEMY, ITEM, GAME` (exact fields below).
  - `loop.js`: `createStepper(step, maxFrame) -> { advance(frameDt, update) -> alpha, reset() }`; `startLoop({ update, render, raf?, now? }) -> { stop(), resetClock() }`. `update(dt)` is called with `STEP`; `render(alpha)` with alpha in [0, 1).
  - `input.js`: `createInput(target = window) -> { isDown(action), wasPressed(action), endFrame(), clear(), dispose() }`. Actions: `left right jump run fire mute start`.

- [ ] **Step 1: Create the project files**

`package.json`:

```json
{
  "name": "pixel-plumber",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

`.gitignore`:

```
.DS_Store
node_modules/
```

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Pixel Plumber</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin: 0; height: 100%; background: #000; }
    body { display: flex; align-items: center; justify-content: center; }
    canvas { height: min(100vh, 672px); aspect-ratio: 8 / 7; image-rendering: pixelated; background: #5c94fc; }
  </style>
</head>
<body>
  <canvas id="game" width="256" height="224"></canvas>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

`README.md`:

````markdown
# Pixel Plumber

A Mario-style platformer for the browser. Original characters and art. No assets, no dependencies, no build step.

## Run

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (ES modules need an HTTP origin, so double-clicking `index.html` will not work).

## Controls

| Action | Keys |
|---|---|
| Move | Arrow keys or A/D |
| Jump | Space, W, or Up (hold for a higher jump) |
| Run | Shift |
| Fireball | X (after picking up a fire flower) |
| Mute | M |
| Start | Enter or Space |

## Tests

```
node --test
```

## Levels

Levels are 14-row text grids in `src/levels/`, one character per tile, registered in `src/levels/index.js`:

| Char | Meaning |
|---|---|
| `.` | empty |
| `#` | solid ground |
| `B` | brick |
| `?` | ? block with a coin |
| `M` | ? block with a mushroom (a fire flower when you are already big) |
| `-` | one-way platform |
| `\|` | pipe |
| `C` | coin |
| `G` | goomba |
| `K` | koopa |
| `P` | player start (exactly one) |
| `F` | goal flag (exactly one) |
````

- [ ] **Step 2: Write the failing tests**

`test/loop.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepper } from '../src/loop.js';

const STEP = 1 / 60;

test('runs one update per STEP of elapsed time', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(STEP + 0.0001, () => n++);
  assert.equal(n, 1);
});

test('carries leftover time into the next frame', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(0.01, () => n++);
  assert.equal(n, 0);
  s.advance(0.01, () => n++);
  assert.equal(n, 1);
});

test('clamps a huge frame delta', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(10, () => n++);
  assert.ok(n >= 14 && n <= 15, `ran ${n} updates`);
});

test('returns the interpolation alpha in [0, 1)', () => {
  const s = createStepper(STEP, 0.25);
  const alpha = s.advance(STEP / 2, () => {});
  assert.ok(Math.abs(alpha - 0.5) < 1e-9);
});

test('passes STEP to the update callback', () => {
  const s = createStepper(STEP, 0.25);
  const seen = [];
  s.advance(STEP * 2.5, (dt) => seen.push(dt));
  assert.deepEqual(seen, [STEP, STEP]);
});

test('reset drops accumulated time', () => {
  const s = createStepper(STEP, 0.25);
  s.advance(0.01, () => {});
  s.reset();
  let n = 0;
  s.advance(0.01, () => n++);
  assert.equal(n, 0);
});
```

`test/input.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';

const key = (type, code) => Object.assign(new Event(type, { cancelable: true }), { code });

function setup() {
  const target = new EventTarget();
  const input = createInput(target);
  return { target, input };
}

test('keydown sets isDown and wasPressed', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'KeyA'));
  assert.equal(input.isDown('left'), true);
  assert.equal(input.wasPressed('left'), true);
});

test('endFrame clears the press edge but not the held state', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'Space'));
  input.endFrame();
  assert.equal(input.wasPressed('jump'), false);
  assert.equal(input.isDown('jump'), true);
});

test('keyup clears the held state', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ArrowRight'));
  target.dispatchEvent(key('keyup', 'ArrowRight'));
  assert.equal(input.isDown('right'), false);
});

test('key auto-repeat does not produce a new press edge', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'Space'));
  input.endFrame();
  target.dispatchEvent(key('keydown', 'Space'));
  assert.equal(input.wasPressed('jump'), false);
});

test('any bound key triggers its action', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ShiftRight'));
  assert.equal(input.isDown('run'), true);
});

test('arrow keys and space have their default prevented', () => {
  const { target } = setup();
  const e = key('keydown', 'ArrowUp');
  target.dispatchEvent(e);
  assert.equal(e.defaultPrevented, true);
});

test('blur releases every held key (no stuck movement)', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ArrowRight'));
  target.dispatchEvent(key('keydown', 'ShiftLeft'));
  target.dispatchEvent(new Event('blur'));
  assert.equal(input.isDown('right'), false);
  assert.equal(input.isDown('run'), false);
  assert.equal(input.wasPressed('right'), false);
});

test('dispose stops listening', () => {
  const { target, input } = setup();
  input.dispose();
  target.dispatchEvent(key('keydown', 'KeyA'));
  assert.equal(input.isDown('left'), false);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL. Both files report `Cannot find module '../src/loop.js'` / `'../src/input.js'`.

- [ ] **Step 4: Write the implementation**

`src/constants.js` (every tuning value in the game lives here; later tasks only read these names):

```js
// src/constants.js
export const TILE = 16;
export const VIEW_W = 256;
export const VIEW_H = 224;
export const LEVEL_ROWS = VIEW_H / TILE;
export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;

// Movement and gravity, in pixels and seconds.
export const PHYS = {
  gravityRise: 800,
  gravityFall: 1400,
  maxFall: 420,
  walkMax: 90,
  runMax: 150,
  accel: 380,
  airAccel: 260,
  friction: 420,
  skidDecel: 700,
  jumpVel: 330,
  jumpCutVel: 200,
  coyote: 0.1,
  buffer: 0.1,
  bounceVel: 220,
};

export const PLAYER = {
  sizes: {
    small: { w: 12, h: 15 },
    big: { w: 12, h: 31 },
    fire: { w: 12, h: 31 },
  },
  invincibleTime: 2,
  deathPause: 0.5,
  deathHopVel: 300,
  deathGravity: 900,
  deathTotal: 2.5,
  maxFireballs: 2,
  flagSlideSpeed: 110,
  walkOutSpeed: 70,
  walkOutDistance: 48,
  walkOutTimeout: 2,
};

export const ENEMY = {
  walkSpeed: 30,
  shellSpeed: 200,
  squashTime: 0.5,
  kickCooldown: 0.25,
  knockVel: 180,
  activeBehind: 64,
  activeAhead: 32,
};

export const ITEM = {
  riseTime: 0.5,
  mushroomSpeed: 50,
  fireballSpeed: 150,
  fireballBounce: 200,
  fireballGravity: 900,
  coinPopTime: 0.5,
  bumpTime: 0.15,
};

export const GAME = {
  startLives: 3,
  levelTime: 300,
  coinsForLife: 100,
  timeBonusPerSecond: 50,
  clearScreenTime: 3,
  scores: {
    coin: 200,
    brick: 50,
    powerUp: 1000,
    fireballKill: 100,
    shellKill: 500,
    stomp: [100, 200, 400, 500, 800, 1000, 2000, 4000, 8000],
  },
};
```

`src/loop.js`:

```js
// src/loop.js
import { STEP, MAX_FRAME } from './constants.js';

export function createStepper(step, maxFrame) {
  let acc = 0;
  return {
    advance(frameDt, update) {
      acc += Math.min(frameDt, maxFrame);
      while (acc >= step) {
        update(step);
        acc -= step;
      }
      return acc / step;
    },
    reset() {
      acc = 0;
    },
  };
}

export function startLoop({ update, render, raf = (f) => requestAnimationFrame(f), now = () => performance.now() }) {
  const stepper = createStepper(STEP, MAX_FRAME);
  let last = now();
  let running = true;
  function frame() {
    if (!running) return;
    const t = now();
    const dt = (t - last) / 1000;
    last = t;
    const alpha = stepper.advance(dt, update);
    render(alpha);
    raf(frame);
  }
  raf(frame);
  return {
    stop() {
      running = false;
    },
    resetClock() {
      last = now();
      stepper.reset();
    },
  };
}
```

`src/input.js`:

```js
// src/input.js
export const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  run: ['ShiftLeft', 'ShiftRight'],
  fire: ['KeyX'],
  mute: ['KeyM'],
  start: ['Enter', 'Space'],
};

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(target = window) {
  const down = new Set();
  const pressed = new Set();

  const onDown = (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!down.has(e.code)) {
      down.add(e.code);
      pressed.add(e.code);
    }
  };
  const onUp = (e) => down.delete(e.code);
  const clear = () => {
    down.clear();
    pressed.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', clear);

  const any = (set, action) => KEYMAP[action].some((code) => set.has(code));
  return {
    isDown: (action) => any(down, action),
    wasPressed: (action) => any(pressed, action),
    endFrame: () => pressed.clear(),
    clear,
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', clear);
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS. All loop and input tests are green.

- [ ] **Step 6: Write the boot file and check it in the browser**

`src/main.js` (replaced in Task 6; it only proves the loop and input run):

```js
// src/main.js
import { VIEW_W, VIEW_H } from './constants.js';
import { startLoop } from './loop.js';
import { createInput } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const input = createInput(window);

let t = 0;
startLoop({
  update(dt) {
    t += dt;
    input.endFrame();
  },
  render() {
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(`PIXEL PLUMBER  t=${t.toFixed(1)}`, 8, 16);
  },
});
```

Run: `python3 -m http.server 8000` (in the project root, in the background), then `curl -s http://localhost:8000/src/main.js | head -3` to confirm it serves, then open http://localhost:8000.
Expected: blue canvas with white text whose `t=` value counts up; the browser console shows no errors. Stop the server afterward.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore index.html README.md src test
git commit -m "feat: project scaffold, constants, fixed-step loop, input"
```

---

### Task 2: Tiles and level loading

**Files:**
- Create: `src/tiles.js`, `src/level.js`, `src/levels/index.js`, `src/levels/level1.js`
- Create: `test/helpers.js`
- Test: `test/tiles.test.js`, `test/level.test.js`

**Interfaces:**
- Consumes: `TILE`, `LEVEL_ROWS` from `constants.js`.
- Produces:
  - `tiles.js`: `T` (frozen `{ EMPTY:0, GROUND:1, BRICK:2, QBLOCK:3, USED:4, PIPE:5, ONEWAY:6 }`); `isSolid(t) -> boolean` (true for GROUND, BRICK, QBLOCK, USED, PIPE; false for EMPTY and ONEWAY); `class TileMap { constructor(cols, rows, data?, contents?); cols; rows; get(c, r) -> tile id; set(c, r, t); peekContents(c, r) -> 'coin'|'mushroom'|null; takeContents(c, r) -> same, and removes it }`. `get` returns `T.GROUND` for columns outside `[0, cols)` (invisible side walls) and `T.EMPTY` for rows outside `[0, rows)`.
  - `level.js`: `class LevelError extends Error`; `parseLevel(name, text) -> { name, cols, rows, tiles: TileMap, spawns: [{ type: 'coin'|'goomba'|'koopa', col, row }], start: { col, row }, flag: { col, row } }`.
  - `levels/index.js`: `LEVELS: [{ name, text }]`, `loadLevel(index) -> parsed level`.
  - `test/helpers.js`: `makeMap(rows: string[], contents?: { 'col,row': 'coin'|'mushroom' }) -> TileMap` (chars `. # B ? M U - |`; `U` = used block); `levelText({ cols = 40, edit? }) -> string` (a valid 14-row level with ground in rows 12-13, `P` at row 11 col 2, `F` at row 11 col `cols - 3`; `edit(grid)` receives a mutable array of row arrays).

- [ ] **Step 1: Write the test helpers**

`test/helpers.js`:

```js
// test/helpers.js
import { TileMap, T } from '../src/tiles.js';

const CHAR_TO_TILE = {
  '.': T.EMPTY, '#': T.GROUND, B: T.BRICK, '?': T.QBLOCK, M: T.QBLOCK, U: T.USED, '-': T.ONEWAY, '|': T.PIPE,
};

export function makeMap(rows, contents = {}) {
  const cols = rows[0].length;
  const data = new Uint8Array(cols * rows.length);
  rows.forEach((row, r) => [...row].forEach((ch, c) => { data[r * cols + c] = CHAR_TO_TILE[ch]; }));
  return new TileMap(cols, rows.length, data, new Map(Object.entries(contents)));
}

export function levelText({ cols = 40, edit } = {}) {
  const grid = Array.from({ length: 14 }, () => Array(cols).fill('.'));
  for (let c = 0; c < cols; c++) { grid[12][c] = '#'; grid[13][c] = '#'; }
  grid[11][2] = 'P';
  grid[11][cols - 3] = 'F';
  if (edit) edit(grid);
  return '\n' + grid.map((r) => r.join('')).join('\n') + '\n';
}
```

- [ ] **Step 2: Write the failing tests**

`test/tiles.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, isSolid } from '../src/tiles.js';
import { makeMap } from './helpers.js';

test('isSolid: ground, brick, ? block, used block and pipe are solid', () => {
  for (const t of [T.GROUND, T.BRICK, T.QBLOCK, T.USED, T.PIPE]) assert.equal(isSolid(t), true);
});

test('isSolid: empty and one-way are not solid', () => {
  assert.equal(isSolid(T.EMPTY), false);
  assert.equal(isSolid(T.ONEWAY), false);
});

test('get reads tiles and set writes them', () => {
  const m = makeMap(['..', '#.']);
  assert.equal(m.get(0, 1), T.GROUND);
  m.set(1, 0, T.BRICK);
  assert.equal(m.get(1, 0), T.BRICK);
});

test('left and right of the map are solid walls; above and below are empty', () => {
  const m = makeMap(['..', '..']);
  assert.equal(m.get(-1, 0), T.GROUND);
  assert.equal(m.get(2, 0), T.GROUND);
  assert.equal(m.get(0, -1), T.EMPTY);
  assert.equal(m.get(0, 2), T.EMPTY);
});

test('takeContents returns the contents once, peekContents does not consume', () => {
  const m = makeMap(['?'], { '0,0': 'mushroom' });
  assert.equal(m.peekContents(0, 0), 'mushroom');
  assert.equal(m.takeContents(0, 0), 'mushroom');
  assert.equal(m.takeContents(0, 0), null);
});
```

`test/level.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, LevelError } from '../src/level.js';
import { T } from '../src/tiles.js';
import { LEVELS, loadLevel } from '../src/levels/index.js';
import { levelText } from './helpers.js';

const bad = (text, pattern) =>
  assert.throws(() => parseLevel('lvl', text), (e) => e instanceof LevelError && pattern.test(e.message));

test('parses tiles, block contents, spawns, start and flag', () => {
  const text = levelText({
    edit: (g) => {
      g[8][5] = '?'; g[8][6] = 'M'; g[8][7] = 'B';
      g[10][9] = 'C'; g[11][12] = 'G'; g[11][14] = 'K';
      g[10][20] = '-'; g[11][22] = '|';
    },
  });
  const level = parseLevel('t', text);
  assert.equal(level.name, 't');
  assert.equal(level.cols, 40);
  assert.equal(level.rows, 14);
  assert.equal(level.tiles.get(5, 8), T.QBLOCK);
  assert.equal(level.tiles.peekContents(5, 8), 'coin');
  assert.equal(level.tiles.get(6, 8), T.QBLOCK);
  assert.equal(level.tiles.peekContents(6, 8), 'mushroom');
  assert.equal(level.tiles.get(7, 8), T.BRICK);
  assert.equal(level.tiles.get(20, 10), T.ONEWAY);
  assert.equal(level.tiles.get(22, 11), T.PIPE);
  assert.equal(level.tiles.get(0, 12), T.GROUND);
  assert.deepEqual(level.spawns, [
    { type: 'coin', col: 9, row: 10 },
    { type: 'goomba', col: 12, row: 11 },
    { type: 'koopa', col: 14, row: 11 },
  ]);
  assert.deepEqual(level.start, { col: 2, row: 11 });
  assert.deepEqual(level.flag, { col: 37, row: 11 });
  assert.equal(level.tiles.get(12, 11), T.EMPTY, 'spawn cells are empty tiles');
  assert.equal(level.tiles.get(2, 11), T.EMPTY, 'start cell is an empty tile');
});

test('unknown character error names the level, row and column (1-based)', () => {
  bad(levelText({ edit: (g) => { g[2][4] = 'X'; } }), /lvl.*'X'.*row 3, col 5/);
});

test('requires exactly one P', () => {
  bad(levelText({ edit: (g) => { g[11][2] = '.'; } }), /exactly one 'P', found 0/);
  bad(levelText({ edit: (g) => { g[11][4] = 'P'; } }), /exactly one 'P', found 2/);
});

test('requires exactly one F', () => {
  bad(levelText({ edit: (g) => { g[11][5] = 'F'; } }), /exactly one 'F', found 2/);
});

test('rejects a ragged row', () => {
  const lines = levelText().split('\n');
  lines[3] = lines[3].slice(1);
  bad(lines.join('\n'), /row 3 has 39 columns, expected 40/);
});

test('rejects a level that is not 14 rows tall', () => {
  const lines = levelText().split('\n');
  lines.splice(1, 1);
  bad(lines.join('\n'), /must be 14 rows tall, found 13/);
});

test('accepts Windows line endings and trailing spaces', () => {
  const crlf = levelText().replace(/\n/g, '\r\n');
  assert.equal(parseLevel('crlf', crlf).cols, 40);
  const spaced = levelText().replace(/\n/g, '   \n');
  assert.equal(parseLevel('spaced', spaced).cols, 40);
});

test('every registered level parses', () => {
  assert.ok(LEVELS.length >= 1);
  LEVELS.forEach((_, i) => assert.doesNotThrow(() => loadLevel(i)));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL. `Cannot find module '../src/tiles.js'` (and `level.js`, `levels/index.js`).

- [ ] **Step 4: Write the implementation**

`src/tiles.js`:

```js
// src/tiles.js
export const T = Object.freeze({ EMPTY: 0, GROUND: 1, BRICK: 2, QBLOCK: 3, USED: 4, PIPE: 5, ONEWAY: 6 });

export function isSolid(t) {
  return t === T.GROUND || t === T.BRICK || t === T.QBLOCK || t === T.USED || t === T.PIPE;
}

export class TileMap {
  constructor(cols, rows, data = new Uint8Array(cols * rows), contents = new Map()) {
    this.cols = cols;
    this.rows = rows;
    this.data = data;
    this.contents = contents;
  }

  get(c, r) {
    if (c < 0 || c >= this.cols) return T.GROUND;
    if (r < 0 || r >= this.rows) return T.EMPTY;
    return this.data[r * this.cols + c];
  }

  set(c, r, t) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    this.data[r * this.cols + c] = t;
  }

  peekContents(c, r) {
    return this.contents.get(`${c},${r}`) ?? null;
  }

  takeContents(c, r) {
    const key = `${c},${r}`;
    const value = this.contents.get(key) ?? null;
    this.contents.delete(key);
    return value;
  }
}
```

`src/level.js`:

```js
// src/level.js
import { LEVEL_ROWS } from './constants.js';
import { T, TileMap } from './tiles.js';

export class LevelError extends Error {}

const TILE_CHARS = { '.': T.EMPTY, '#': T.GROUND, B: T.BRICK, '?': T.QBLOCK, M: T.QBLOCK, '-': T.ONEWAY, '|': T.PIPE };
const CONTENTS = { '?': 'coin', M: 'mushroom' };
const SPAWN_CHARS = { C: 'coin', G: 'goomba', K: 'koopa' };

export function parseLevel(name, text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd());
  if (lines.length && lines[0] === '') lines.shift();
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  if (lines.length !== LEVEL_ROWS) {
    throw new LevelError(`${name}: must be ${LEVEL_ROWS} rows tall, found ${lines.length}`);
  }
  const cols = lines[0].length;
  lines.forEach((line, r) => {
    if (line.length !== cols) throw new LevelError(`${name}: row ${r + 1} has ${line.length} columns, expected ${cols}`);
  });

  const data = new Uint8Array(cols * LEVEL_ROWS);
  const contents = new Map();
  const spawns = [];
  const starts = [];
  const flags = [];

  for (let r = 0; r < LEVEL_ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c];
      if (ch in TILE_CHARS) {
        data[r * cols + c] = TILE_CHARS[ch];
        if (ch in CONTENTS) contents.set(`${c},${r}`, CONTENTS[ch]);
      } else if (ch in SPAWN_CHARS) {
        spawns.push({ type: SPAWN_CHARS[ch], col: c, row: r });
      } else if (ch === 'P') {
        starts.push({ col: c, row: r });
      } else if (ch === 'F') {
        flags.push({ col: c, row: r });
      } else {
        throw new LevelError(`${name}: unknown character '${ch}' at row ${r + 1}, col ${c + 1}`);
      }
    }
  }

  if (starts.length !== 1) throw new LevelError(`${name}: expected exactly one 'P', found ${starts.length}`);
  if (flags.length !== 1) throw new LevelError(`${name}: expected exactly one 'F', found ${flags.length}`);

  return { name, cols, rows: LEVEL_ROWS, tiles: new TileMap(cols, LEVEL_ROWS, data, contents), spawns, start: starts[0], flag: flags[0] };
}
```

`src/levels/level1.js` (64 columns x 14 rows; every row below is exactly 64 characters):

```js
// src/levels/level1.js
export default `
................................................................
................................................................
................................................................
................................................................
................................................................
................................................................
................................................................
............................................CCCC................
..........?BMB?...................BMB..................#........
...................CCCC.......................||......##........
............................||................||.....###........
..P.............G.......G...||..K....G........||..G.####....F...
####################..##################...#####################
####################..##################...#####################
`;
```

`src/levels/index.js`:

```js
// src/levels/index.js
import { parseLevel } from '../level.js';
import level1 from './level1.js';

export const LEVELS = [
  { name: '1-1', text: level1 },
];

export function loadLevel(index) {
  const { name, text } = LEVELS[index];
  return parseLevel(name, text);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS, including "every registered level parses" for level 1.

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat: tile map, level parser with validation, level 1"
```

---

### Task 3: Physics and tile collision

**Files:**
- Create: `src/physics.js`
- Test: `test/physics.test.js`

**Interfaces:**
- Consumes: `TILE`, `PHYS` from `constants.js`; `T`, `isSolid` from `tiles.js`; `makeMap` from `test/helpers.js`.
- Produces (`physics.js`):
  - `createBody(x, y, w, h) -> { x, y, w, h, vx: 0, vy: 0, px: x, py: y, onGround: false }` (`x, y` is the top-left corner; `px, py` are the previous-step position used for interpolation and one-way platforms).
  - `applyGravity(body, dt, riseG = PHYS.gravityRise, fallG = PHYS.gravityFall)`: uses `riseG` while `vy < 0`, else `fallG`; caps `vy` at `PHYS.maxFall`.
  - `moveBody(body, tiles, dt) -> { wall: -1|0|1, ceiling: { col, row } | null, landed: boolean }`: copies `x, y` to `px, py`, moves X then Y, resolves against solid tiles (and one-way tiles when landing from above), zeroes the blocked velocity component, and sets `body.onGround = landed`.
  - `overlaps(a, b) -> boolean` (AABB, touching edges do not overlap).
  - `renderPos(body, alpha) -> { x, y }` (linear interpolation between `px, py` and `x, y`).

- [ ] **Step 1: Write the failing tests**

`test/physics.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBody, applyGravity, moveBody, overlaps, renderPos } from '../src/physics.js';
import { TILE, PHYS } from '../src/constants.js';
import { makeMap } from './helpers.js';

const DT = 1 / 60;
const step = (body, tiles) => {
  applyGravity(body, DT);
  return moveBody(body, tiles, DT);
};

test('a falling body lands on the ground and stays there', () => {
  const tiles = makeMap(['..........', '..........', '..........', '##########']);
  const b = createBody(20, 0, 12, 15);
  for (let i = 0; i < 120; i++) step(b, tiles);
  assert.equal(b.y, 3 * TILE - 15);
  assert.equal(b.onGround, true);
  assert.equal(b.vy, 0);
});

test('gravity is stronger falling than rising and is capped', () => {
  const rising = createBody(0, 0, 12, 15); rising.vy = -100;
  const falling = createBody(0, 0, 12, 15); falling.vy = 100;
  applyGravity(rising, DT);
  applyGravity(falling, DT);
  assert.ok(rising.vy - -100 < falling.vy - 100);
  const fast = createBody(0, 0, 12, 15); fast.vy = 1000;
  applyGravity(fast, DT);
  assert.equal(fast.vy, PHYS.maxFall);
});

test('walking into a wall stops at the wall and reports it', () => {
  const tiles = makeMap(['..........', '..........', '.....#....', '##########']);
  const b = createBody(20, 3 * TILE - 15, 12, 15);
  let hit = null;
  for (let i = 0; i < 120 && !hit; i++) {
    b.vx = 100;
    const r = step(b, tiles);
    if (r.wall) hit = r;
  }
  assert.equal(hit.wall, 1);
  assert.equal(b.x, 5 * TILE - 12);
  assert.equal(b.vx, 0);
});

test('walking across many ground tiles never snags on a seam', () => {
  const tiles = makeMap(['.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '#'.repeat(40)]);
  const b = createBody(4, 3 * TILE - 15, 12, 15);
  for (let i = 0; i < 200; i++) {
    b.vx = 100;
    const r = step(b, tiles);
    assert.equal(r.wall, 0);
    assert.equal(b.y, 3 * TILE - 15);
  }
  assert.ok(b.x > 300);
});

test('the map edges act as walls', () => {
  const tiles = makeMap(['..........', '..........', '..........', '##########']);
  const left = createBody(0, 3 * TILE - 15, 12, 15);
  left.vx = -100;
  assert.equal(step(left, tiles).wall, -1);
  assert.equal(left.x, 0);
  const right = createBody(10 * TILE - 12, 3 * TILE - 15, 12, 15);
  right.vx = 100;
  assert.equal(step(right, tiles).wall, 1);
  assert.equal(right.x, 10 * TILE - 12);
});

test('hitting a block from below reports it and stops upward motion', () => {
  const tiles = makeMap(['..........', '..B.......', '..........', '..........', '..........', '##########']);
  const b = createBody(34, 5 * TILE - 15, 12, 15);
  b.vy = -300;
  let ceiling = null;
  for (let i = 0; i < 60 && !ceiling; i++) ceiling = step(b, tiles).ceiling;
  assert.deepEqual(ceiling, { col: 2, row: 1 });
  assert.equal(b.y, 2 * TILE);
  assert.equal(b.vy, 0);
});

test('a head straddling two blocks hits only the one it overlaps most', () => {
  const tiles = makeMap(['..........', '...BB.....', '..........', '..........', '..........', '##########']);
  const b = createBody(60, 5 * TILE - 15, 12, 15); // spans x 60..72: 4px over col 3, 8px over col 4
  b.vy = -300;
  let ceiling = null;
  for (let i = 0; i < 60 && !ceiling; i++) ceiling = step(b, tiles).ceiling;
  assert.deepEqual(ceiling, { col: 4, row: 1 });
});

test('one-way platforms let a body rise through and land on top', () => {
  const tiles = makeMap(['..........', '..........', '...---....', '..........', '..........', '##########']);
  const b = createBody(50, 5 * TILE - 15, 12, 15);
  b.vy = -300;
  for (let i = 0; i < 200; i++) {
    const r = step(b, tiles);
    assert.equal(r.ceiling, null);
  }
  assert.equal(b.onGround, true);
  assert.equal(b.y, 2 * TILE - 15);
});

test('moving above the top of the map is allowed (no ceiling there)', () => {
  const tiles = makeMap(['..........', '..........', '##########']);
  const b = createBody(20, -20, 12, 15);
  b.vy = -100;
  const r = moveBody(b, tiles, DT);
  assert.equal(r.ceiling, null);
  assert.ok(b.y < -20);
});

test('a body with no floor keeps falling and is never grounded', () => {
  const tiles = makeMap(['..........', '..........', '..........']);
  const b = createBody(20, 0, 12, 15);
  for (let i = 0; i < 120; i++) step(b, tiles);
  assert.ok(b.y > 3 * TILE);
  assert.equal(b.onGround, false);
});

test('overlaps: touching edges do not overlap, intersecting boxes do', () => {
  const a = createBody(0, 0, 10, 10);
  assert.equal(overlaps(a, createBody(10, 0, 10, 10)), false);
  assert.equal(overlaps(a, createBody(9, 9, 10, 10)), true);
});

test('renderPos interpolates between the previous and current position', () => {
  const b = createBody(0, 0, 10, 10);
  b.x = 10; b.y = 20;
  assert.deepEqual(renderPos(b, 0.5), { x: 5, y: 10 });
  assert.deepEqual(renderPos(b, 1), { x: 10, y: 20 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/physics.test.js`
Expected: FAIL with `Cannot find module '../src/physics.js'`.

- [ ] **Step 3: Write the implementation**

`src/physics.js`:

```js
// src/physics.js
import { TILE, PHYS } from './constants.js';
import { T, isSolid } from './tiles.js';

const EPS = 0.001;

export function createBody(x, y, w, h) {
  return { x, y, w, h, vx: 0, vy: 0, px: x, py: y, onGround: false };
}

export function applyGravity(body, dt, riseG = PHYS.gravityRise, fallG = PHYS.gravityFall) {
  const g = body.vy < 0 ? riseG : fallG;
  body.vy = Math.min(body.vy + g * dt, PHYS.maxFall);
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function renderPos(body, alpha) {
  return { x: body.px + (body.x - body.px) * alpha, y: body.py + (body.y - body.py) * alpha };
}

function span(body) {
  return {
    c0: Math.floor(body.x / TILE),
    c1: Math.floor((body.x + body.w - EPS) / TILE),
    r0: Math.floor(body.y / TILE),
    r1: Math.floor((body.y + body.h - EPS) / TILE),
  };
}

export function moveBody(body, tiles, dt) {
  body.px = body.x;
  body.py = body.y;
  const result = { wall: 0, ceiling: null, landed: false };

  // X axis first.
  body.x += body.vx * dt;
  if (body.vx !== 0) {
    const { c0, c1, r0, r1 } = span(body);
    if (body.vx > 0) {
      xRight: for (let c = c0; c <= c1; c++) {
        for (let r = r0; r <= r1; r++) {
          if (isSolid(tiles.get(c, r))) {
            body.x = c * TILE - body.w;
            result.wall = 1;
            body.vx = 0;
            break xRight;
          }
        }
      }
    } else {
      xLeft: for (let c = c1; c >= c0; c--) {
        for (let r = r0; r <= r1; r++) {
          if (isSolid(tiles.get(c, r))) {
            body.x = (c + 1) * TILE;
            result.wall = -1;
            body.vx = 0;
            break xLeft;
          }
        }
      }
    }
  }

  // Then the Y axis.
  body.y += body.vy * dt;
  const { c0, c1, r0, r1 } = span(body);
  if (body.vy > 0) {
    land: for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = tiles.get(c, r);
        const oneWayLanding = t === T.ONEWAY && body.py + body.h <= r * TILE + EPS;
        if (isSolid(t) || oneWayLanding) {
          body.y = r * TILE - body.h;
          body.vy = 0;
          result.landed = true;
          break land;
        }
      }
    }
  } else if (body.vy < 0) {
    let best = null;
    let bestOverlap = 0;
    for (let c = c0; c <= c1; c++) {
      if (!isSolid(tiles.get(c, r0))) continue;
      const overlap = Math.min(body.x + body.w, (c + 1) * TILE) - Math.max(body.x, c * TILE);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = { col: c, row: r0 };
      }
    }
    if (best) {
      body.y = (best.row + 1) * TILE;
      body.vy = 0;
      result.ceiling = best;
    }
  }

  body.onGround = result.landed;
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for all of `physics.test.js` and the earlier suites.

- [ ] **Step 5: Commit**

```bash
git add src/physics.js test/physics.test.js
git commit -m "feat: body physics with axis-separated tile collision"
```

---

### Task 4: Player motor (acceleration, friction, jump feel)

**Files:**
- Create: `src/movement.js`
- Test: `test/movement.test.js`

**Interfaces:**
- Consumes: `PHYS` from `constants.js`; `createBody`, `applyGravity`, `moveBody` from `physics.js`; `makeMap` from `test/helpers.js`.
- Produces (`movement.js`):
  - `createMotor() -> { coyote: 0, buffer: 0, facing: 1, jumping: false, skidding: false }`.
  - `stepMotor(body, motor, cmd, dt) -> { jumped: boolean }` where `cmd = { left, right, run, jumpHeld, jumpPressed }` (booleans). It edits `body.vx` and `body.vy` only (never position); the caller then runs `applyGravity` and `moveBody`.

- [ ] **Step 1: Write the failing tests**

`test/movement.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBody, applyGravity, moveBody } from '../src/physics.js';
import { createMotor, stepMotor } from '../src/movement.js';
import { PHYS, TILE } from '../src/constants.js';
import { makeMap } from './helpers.js';

const DT = 1 / 60;
const GROUND_ROW = 8;
const flat = () => makeMap([...Array(GROUND_ROW).fill('.'.repeat(60)), '#'.repeat(60)]);
const standing = () => createBody(16, GROUND_ROW * TILE - 15, 12, 15);
const idle = { left: false, right: false, run: false, jumpHeld: false, jumpPressed: false };

function tick(body, motor, tiles, cmd = {}) {
  const r = stepMotor(body, motor, { ...idle, ...cmd }, DT);
  applyGravity(body, DT);
  const m = moveBody(body, tiles, DT);
  return { ...r, ...m };
}

test('accelerates to the walk cap and no further', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  for (let i = 0; i < 120; i++) tick(b, m, tiles, { right: true });
  assert.ok(Math.abs(b.vx - PHYS.walkMax) < 1e-9);
});

test('holding run raises the cap, releasing run slows back to walk speed', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  for (let i = 0; i < 180; i++) tick(b, m, tiles, { right: true, run: true });
  assert.ok(Math.abs(b.vx - PHYS.runMax) < 1e-9);
  for (let i = 0; i < 60; i++) tick(b, m, tiles, { right: true });
  assert.ok(Math.abs(b.vx - PHYS.walkMax) < 1e-9);
});

test('friction brings the player to a stop on the ground', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  b.vx = PHYS.walkMax;
  for (let i = 0; i < 60; i++) tick(b, m, tiles);
  assert.equal(b.vx, 0);
});

test('reversing on the ground skids with extra deceleration', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  b.vx = 80;
  tick(b, m, tiles, { left: true });
  assert.equal(m.skidding, true);
  assert.ok(Math.abs(b.vx - (80 - PHYS.skidDecel * DT)) < 1e-9);
  assert.equal(m.facing, -1);
});

function peakRise(holdFrames) {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  const startY = b.y;
  let minY = b.y;
  for (let i = 0; i < 90; i++) {
    tick(b, m, tiles, { jumpPressed: i === 0, jumpHeld: i < holdFrames });
    minY = Math.min(minY, b.y);
  }
  return startY - minY;
}

test('jump height is variable: a held jump goes much higher than a tap', () => {
  const full = peakRise(90);
  const tap = peakRise(1);
  assert.ok(full > 3 * TILE && full < 5 * TILE, `full jump rose ${full}px`);
  assert.ok(tap > 0 && tap < full * 0.6, `tap rose ${tap}px, full ${full}px`);
});

test('coyote time: a jump just after leaving a ledge still works, a late one does not', () => {
  const b = createBody(0, 0, 12, 15), m = createMotor();
  b.onGround = true;
  stepMotor(b, m, idle, DT);
  b.onGround = false;
  for (let i = 0; i < 3; i++) stepMotor(b, m, idle, DT);
  const early = stepMotor(b, m, { ...idle, jumpPressed: true, jumpHeld: true }, DT);
  assert.equal(early.jumped, true);
  assert.ok(b.vy < 0);

  const b2 = createBody(0, 0, 12, 15), m2 = createMotor();
  b2.onGround = true;
  stepMotor(b2, m2, idle, DT);
  b2.onGround = false;
  for (let i = 0; i < 12; i++) stepMotor(b2, m2, idle, DT);
  const late = stepMotor(b2, m2, { ...idle, jumpPressed: true, jumpHeld: true }, DT);
  assert.equal(late.jumped, false);
});

test('jump buffering: pressed shortly before landing fires on landing, pressed too early does not', () => {
  const press = { ...idle, jumpPressed: true, jumpHeld: true };
  const hold = { ...idle, jumpHeld: true };

  const b = createBody(0, 0, 12, 15), m = createMotor();
  b.onGround = false;
  stepMotor(b, m, press, DT);
  for (let i = 0; i < 2; i++) stepMotor(b, m, hold, DT);
  b.onGround = true;
  const r = stepMotor(b, m, hold, DT);
  assert.equal(r.jumped, true);
  assert.ok(b.vy < 0);

  const b2 = createBody(0, 0, 12, 15), m2 = createMotor();
  b2.onGround = false;
  stepMotor(b2, m2, press, DT);
  for (let i = 0; i < 10; i++) stepMotor(b2, m2, hold, DT);
  b2.onGround = true;
  assert.equal(stepMotor(b2, m2, hold, DT).jumped, false);
});

test('holding jump after landing does not jump again; only a new press does', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  const groundY = b.y;
  for (let i = 0; i < 30; i++) {
    const r = tick(b, m, tiles, { jumpHeld: true });
    assert.equal(r.jumped, false);
    assert.equal(b.y, groundY);
  }
  const r = tick(b, m, tiles, { jumpHeld: true, jumpPressed: true });
  assert.equal(r.jumped, true);
});

test('air control is weaker than ground control', () => {
  const ground = createBody(0, 0, 12, 15); ground.onGround = true;
  const air = createBody(0, 0, 12, 15); air.onGround = false;
  stepMotor(ground, createMotor(), { ...idle, right: true }, DT);
  stepMotor(air, createMotor(), { ...idle, right: true }, DT);
  assert.ok(air.vx < ground.vx);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/movement.test.js`
Expected: FAIL with `Cannot find module '../src/movement.js'`.

- [ ] **Step 3: Write the implementation**

`src/movement.js`:

```js
// src/movement.js
import { PHYS } from './constants.js';

export function createMotor() {
  return { coyote: 0, buffer: 0, facing: 1, jumping: false, skidding: false };
}

export function stepMotor(body, motor, cmd, dt) {
  motor.coyote = body.onGround ? PHYS.coyote : Math.max(0, motor.coyote - dt);
  motor.buffer = cmd.jumpPressed ? PHYS.buffer : Math.max(0, motor.buffer - dt);
  if (body.onGround) motor.jumping = false;

  const dir = (cmd.right ? 1 : 0) - (cmd.left ? 1 : 0);
  const max = cmd.run ? PHYS.runMax : PHYS.walkMax;
  motor.skidding = false;

  if (dir !== 0) {
    motor.facing = dir;
    if (body.onGround && body.vx * dir < 0) {
      body.vx += dir * PHYS.skidDecel * dt;
      motor.skidding = true;
    } else if (body.vx * dir < max) {
      body.vx += dir * (body.onGround ? PHYS.accel : PHYS.airAccel) * dt;
      if (body.vx * dir > max) body.vx = dir * max;
    } else {
      body.vx -= dir * Math.min(PHYS.friction * dt, body.vx * dir - max);
    }
  } else if (body.onGround) {
    const drop = Math.min(Math.abs(body.vx), PHYS.friction * dt);
    body.vx -= Math.sign(body.vx) * drop;
  }

  let jumped = false;
  if (motor.buffer > 0 && motor.coyote > 0) {
    body.vy = -PHYS.jumpVel;
    motor.coyote = 0;
    motor.buffer = 0;
    motor.jumping = true;
    jumped = true;
  }
  if (motor.jumping && !cmd.jumpHeld && body.vy < -PHYS.jumpCutVel) body.vy = -PHYS.jumpCutVel;

  return { jumped };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src/movement.js test/movement.test.js
git commit -m "feat: player motor with acceleration, skid, variable jump, coyote time, jump buffer"
```

### Task 5: Pure game rules: player power, camera, session

**Files:**
- Create: `src/playerState.js`, `src/camera.js`, `src/session.js`
- Test: `test/playerState.test.js`, `test/camera.test.js`, `test/session.test.js`

**Interfaces:**
- Consumes: `PLAYER`, `TILE`, `VIEW_W`, `ENEMY`, `GAME` from `constants.js`; `isSolid` from `tiles.js`; `createBody` from `physics.js`; `makeMap` from `test/helpers.js`.
- Produces:
  - `playerState.js`: `sizeOf(power) -> { w, h }`; `applyPowerUp(power, item) -> power` (`item` is `'mushroom'` or `'fireflower'`, anything else throws); `applyHit(power) -> { power: 'small'|'dead', invincible: boolean }`; `resizeBody(body, size)` (keeps the feet position, sets `w`, `h`, `y`, `py`); `canResize(tiles, body, size) -> boolean` (true when the resized body, feet fixed, overlaps no solid tile).
  - `camera.js`: `createCamera(levelWidthPx) -> { x, px, maxX, update(centerX), snapTo(centerX), renderX(alpha) }`; `inActiveRange(camera, body) -> boolean`.
  - `session.js`: `createSession() -> { score, coins, lives, power, levelIndex }`; `addScore(session, points)`; `addCoin(session) -> boolean` (true when the 100th coin awards a life); `loseLife(session) -> remainingLives` (also resets `power` to `'small'`); `advanceLevel(session, levelCount) -> boolean` (increments `levelIndex`; true if another level remains).

- [ ] **Step 1: Write the failing tests**

`test/playerState.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeOf, applyPowerUp, applyHit, resizeBody, canResize } from '../src/playerState.js';
import { createBody } from '../src/physics.js';
import { TILE } from '../src/constants.js';
import { makeMap } from './helpers.js';

test('sizes: small is one tile, big and fire are two', () => {
  assert.equal(sizeOf('small').h, 15);
  assert.equal(sizeOf('big').h, 31);
  assert.equal(sizeOf('fire').h, 31);
});

test('power-ups: mushroom grows, fire flower gives fire, mushroom never downgrades fire', () => {
  assert.equal(applyPowerUp('small', 'mushroom'), 'big');
  assert.equal(applyPowerUp('big', 'mushroom'), 'big');
  assert.equal(applyPowerUp('fire', 'mushroom'), 'fire');
  assert.equal(applyPowerUp('small', 'fireflower'), 'fire');
  assert.equal(applyPowerUp('big', 'fireflower'), 'fire');
  assert.throws(() => applyPowerUp('small', 'banana'));
});

test('hits: small dies; big and fire shrink to small with invincibility', () => {
  assert.deepEqual(applyHit('small'), { power: 'dead', invincible: false });
  assert.deepEqual(applyHit('big'), { power: 'small', invincible: true });
  assert.deepEqual(applyHit('fire'), { power: 'small', invincible: true });
});

test('resizeBody keeps the feet where they were', () => {
  const b = createBody(10, 50, 12, 15);
  resizeBody(b, sizeOf('big'));
  assert.equal(b.y + b.h, 65);
  assert.equal(b.h, 31);
  assert.equal(b.py, b.y);
  resizeBody(b, sizeOf('small'));
  assert.equal(b.y + b.h, 65);
  assert.equal(b.h, 15);
});

test('canResize: true in open space, false under a one-tile-high ceiling', () => {
  const open = makeMap(['..........', '..........', '..........', '##########']);
  const small = createBody(20, 3 * TILE - 15, 12, 15);
  assert.equal(canResize(open, small, sizeOf('big')), true);

  const tight = makeMap(['..........', '##########', '..........', '##########']);
  const small2 = createBody(20, 3 * TILE - 15, 12, 15);
  assert.equal(canResize(tight, small2, sizeOf('big')), false);
  assert.equal(canResize(tight, small2, sizeOf('small')), true);
});
```

`test/camera.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera, inActiveRange } from '../src/camera.js';
import { VIEW_W } from '../src/constants.js';

test('centers on the target', () => {
  const cam = createCamera(1000);
  cam.update(500);
  assert.equal(cam.x, 500 - VIEW_W / 2);
});

test('clamps at the left edge and at the right edge', () => {
  const cam = createCamera(1000);
  cam.update(10);
  assert.equal(cam.x, 0);
  cam.update(990);
  assert.equal(cam.x, 1000 - VIEW_W);
});

test('a level narrower than the view never scrolls', () => {
  const cam = createCamera(200);
  cam.update(150);
  assert.equal(cam.x, 0);
});

test('snapTo sets x and px together; renderX interpolates', () => {
  const cam = createCamera(1000);
  cam.snapTo(300);
  assert.equal(cam.px, cam.x);
  cam.update(500);
  assert.equal(cam.renderX(0.5), (300 - VIEW_W / 2 + (500 - VIEW_W / 2)) / 2);
});

test('inActiveRange covers the view plus a margin on each side', () => {
  const cam = createCamera(2000);
  cam.snapTo(100 + VIEW_W / 2);
  assert.equal(cam.x, 100);
  assert.equal(inActiveRange(cam, { x: 100 + VIEW_W + 20, w: 14 }), true);
  assert.equal(inActiveRange(cam, { x: 100 + VIEW_W + 40, w: 14 }), false);
  assert.equal(inActiveRange(cam, { x: 100 - 60, w: 14 }), true);
  assert.equal(inActiveRange(cam, { x: 100 - 100, w: 14 }), false);
});
```

`test/session.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, addScore, addCoin, loseLife, advanceLevel } from '../src/session.js';
import { GAME } from '../src/constants.js';

test('a new session starts with the configured lives and no score', () => {
  const s = createSession();
  assert.deepEqual(s, { score: 0, coins: 0, lives: GAME.startLives, power: 'small', levelIndex: 0 });
});

test('addScore accumulates', () => {
  const s = createSession();
  addScore(s, 100);
  addScore(s, 250);
  assert.equal(s.score, 350);
});

test('the 100th coin awards a life and wraps the counter', () => {
  const s = createSession();
  for (let i = 0; i < 99; i++) assert.equal(addCoin(s), false);
  assert.equal(s.coins, 99);
  assert.equal(addCoin(s), true);
  assert.equal(s.coins, 0);
  assert.equal(s.lives, GAME.startLives + 1);
});

test('loseLife decrements, returns the remainder and resets power', () => {
  const s = createSession();
  s.power = 'fire';
  assert.equal(loseLife(s), GAME.startLives - 1);
  assert.equal(s.power, 'small');
});

test('advanceLevel reports whether another level remains', () => {
  const s = createSession();
  assert.equal(advanceLevel(s, 3), true);
  assert.equal(advanceLevel(s, 3), true);
  assert.equal(advanceLevel(s, 3), false);
  assert.equal(s.levelIndex, 3);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL with `Cannot find module` for `playerState.js`, `camera.js`, `session.js`.

- [ ] **Step 3: Write the implementation**

`src/playerState.js`:

```js
// src/playerState.js
import { PLAYER, TILE } from './constants.js';
import { isSolid } from './tiles.js';

const EPS = 0.001;

export function sizeOf(power) {
  return PLAYER.sizes[power];
}

export function applyPowerUp(power, item) {
  if (item === 'fireflower') return 'fire';
  if (item === 'mushroom') return power === 'small' ? 'big' : power;
  throw new Error(`Unknown power-up: ${item}`);
}

export function applyHit(power) {
  return power === 'small' ? { power: 'dead', invincible: false } : { power: 'small', invincible: true };
}

export function resizeBody(body, size) {
  const bottom = body.y + body.h;
  body.w = size.w;
  body.h = size.h;
  body.y = bottom - size.h;
  body.py = body.y;
}

export function canResize(tiles, body, size) {
  const y = body.y + body.h - size.h;
  const c0 = Math.floor(body.x / TILE);
  const c1 = Math.floor((body.x + size.w - EPS) / TILE);
  const r0 = Math.floor(y / TILE);
  const r1 = Math.floor((y + size.h - EPS) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      if (isSolid(tiles.get(c, r))) return false;
    }
  }
  return true;
}
```

`src/camera.js`:

```js
// src/camera.js
import { VIEW_W, ENEMY } from './constants.js';

export function createCamera(levelWidth) {
  const maxX = Math.max(0, levelWidth - VIEW_W);
  const target = (centerX) => Math.min(maxX, Math.max(0, centerX - VIEW_W / 2));
  const cam = {
    x: 0,
    px: 0,
    maxX,
    update(centerX) {
      cam.px = cam.x;
      cam.x = target(centerX);
    },
    snapTo(centerX) {
      cam.x = cam.px = target(centerX);
    },
    renderX(alpha) {
      return cam.px + (cam.x - cam.px) * alpha;
    },
  };
  return cam;
}

export function inActiveRange(camera, body) {
  return body.x + body.w > camera.x - ENEMY.activeBehind && body.x < camera.x + VIEW_W + ENEMY.activeAhead;
}
```

`src/session.js`:

```js
// src/session.js
import { GAME } from './constants.js';

export function createSession() {
  return { score: 0, coins: 0, lives: GAME.startLives, power: 'small', levelIndex: 0 };
}

export function addScore(session, points) {
  session.score += points;
}

export function addCoin(session) {
  session.coins += 1;
  if (session.coins >= GAME.coinsForLife) {
    session.coins -= GAME.coinsForLife;
    session.lives += 1;
    return true;
  }
  return false;
}

export function loseLife(session) {
  session.lives -= 1;
  session.power = 'small';
  return session.lives;
}

export function advanceLevel(session, levelCount) {
  session.levelIndex += 1;
  return session.levelIndex < levelCount;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat: player power rules, camera, session state"
```

---

### Task 6: Pixel art, rendering, player entity, first playable build

**Files:**
- Create: `src/spriteData.js`, `src/sprites.js`, `src/render.js`, `src/entities/player.js`, `src/world.js`
- Modify: `src/main.js` (replace), `test/helpers.js` (append)
- Test: `test/spriteData.test.js`, `test/player.test.js`

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces:
  - `spriteData.js`: `PALETTE` (char -> CSS color), `SPRITES` (name -> array of equal-length strings; `.` is transparent). Sprite names: `small_idle small_run1 small_run2 small_jump big_idle big_run1 big_run2 big_jump goomba_a goomba_b goomba_flat koopa_a koopa_b koopa_shell mushroom fireflower coin_a coin_b fireball debris flag ground brick qblock used pipe oneway`. Art is drawn at half resolution and scaled x2 (small player 8x8 -> 16x16, big player 8x16 -> 16x32).
  - `sprites.js`: `FIRE_SWAP` (`{ r: 'w', u: 'r' }`), `getSprite(name, swap?) -> canvas`, `drawSprite(ctx, name, x, y, { flip?, flipY?, swap? })` (coordinates rounded to whole pixels). `sprites.js` only touches `document` inside `getSprite`, so importing it in Node is safe.
  - `render.js`: `drawBackground(ctx)`; `drawTiles(ctx, tiles, camX, bumpOffset? = (c, r) => 0)`; `drawBodySprite(ctx, camera, alpha, body, name, opts?)` (centers the sprite horizontally on the body, aligns the sprite bottom with the body bottom, interpolates with `alpha`, subtracts the camera).
  - `entities/player.js`: `class Player { constructor(x, bottomY, power = 'small'); kind: 'player'; body; motor; power: 'small'|'big'|'fire'; state: 'alive'|'dying'|'dead'; invincible: seconds; stompChain: number; ceilingHit: { col, row } | null; get vulnerable; update(dt, world, input); die(world); hurt(world) -> boolean; changePower(power, tiles) -> boolean; collect(item, world); render(ctx, camera, alpha) }`. A `world` here needs `{ tiles, session, audio }` and `audio` needs `play(name)`, `startMusic()`, `stopMusic()`.
  - `world.js`: `createWorld({ level, session, audio }) -> world` with `{ level, tiles, session, audio, camera, entities: [], bumps: [], player, spawn(entity) }`; `updateWorld(world, dt, input)`; `renderWorld(world, ctx, alpha)`.
  - `test/helpers.js` additions: `mockAudio() -> { calls: string[], play, startMusic, stopMusic }` (each call pushes its name; `startMusic`/`stopMusic` push `'startMusic'`/`'stopMusic'`); `idleInput` (`isDown` and `wasPressed` always false).

- [ ] **Step 1: Append the test helpers**

Append to `test/helpers.js`:

```js
export function mockAudio() {
  const calls = [];
  return {
    calls,
    play: (name) => calls.push(name),
    startMusic: () => calls.push('startMusic'),
    stopMusic: () => calls.push('stopMusic'),
  };
}

export const idleInput = { isDown: () => false, wasPressed: () => false };
```

- [ ] **Step 2: Write the failing tests**

`test/spriteData.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, SPRITES } from '../src/spriteData.js';

const REQUIRED = [
  'small_idle', 'small_run1', 'small_run2', 'small_jump',
  'big_idle', 'big_run1', 'big_run2', 'big_jump',
  'goomba_a', 'goomba_b', 'goomba_flat', 'koopa_a', 'koopa_b', 'koopa_shell',
  'mushroom', 'fireflower', 'coin_a', 'coin_b', 'fireball', 'debris', 'flag',
  'ground', 'brick', 'qblock', 'used', 'pipe', 'oneway',
];

test('every required sprite exists', () => {
  for (const name of REQUIRED) assert.ok(SPRITES[name], `missing sprite ${name}`);
});

test('every sprite is rectangular and uses only palette characters', () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    const width = rows[0].length;
    rows.forEach((row, i) => {
      assert.equal(row.length, width, `${name} row ${i} is ${row.length} wide, expected ${width}`);
      for (const ch of row) assert.ok(ch === '.' || ch in PALETTE, `${name} row ${i} uses unknown char '${ch}'`);
    });
  }
});

test('player sprites are 8 wide; small is 8 tall and big is 16 tall', () => {
  for (const pose of ['idle', 'run1', 'run2', 'jump']) {
    assert.equal(SPRITES[`small_${pose}`].length, 8);
    assert.equal(SPRITES[`big_${pose}`].length, 16);
    assert.equal(SPRITES[`small_${pose}`][0].length, 8);
  }
});

test('tile and creature sprites are 8x8', () => {
  for (const name of ['goomba_a', 'goomba_b', 'goomba_flat', 'koopa_a', 'koopa_b', 'koopa_shell', 'mushroom', 'fireflower', 'coin_a', 'coin_b', 'flag', 'ground', 'brick', 'qblock', 'used', 'pipe', 'oneway']) {
    assert.equal(SPRITES[name].length, 8, name);
    assert.equal(SPRITES[name][0].length, 8, name);
  }
});
```

`test/player.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/entities/player.js';
import { createSession } from '../src/session.js';
import { PLAYER, GAME, TILE } from '../src/constants.js';
import { makeMap, mockAudio, idleInput } from './helpers.js';

const DT = 1 / 60;
const open = () => makeMap(['..........', '..........', '..........', '##########']);
const tight = () => makeMap(['..........', '##########', '..........', '##########']);
const worldOn = (tiles) => ({ tiles, session: createSession(), audio: mockAudio() });
const playerAt = (power) => new Player(20, 3 * TILE, power);

test('a small player that is hurt dies and the music stops', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  assert.equal(p.hurt(world), true);
  assert.equal(p.state, 'dying');
  assert.deepEqual(world.audio.calls, ['stopMusic', 'death']);
});

test('a big player that is hurt shrinks, blinks, and cannot be hurt again at once', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  assert.equal(p.hurt(world), true);
  assert.equal(p.power, 'small');
  assert.equal(p.body.h, 15);
  assert.equal(p.body.y + p.body.h, 3 * TILE, 'feet stay put');
  assert.equal(p.invincible, PLAYER.invincibleTime);
  assert.equal(p.hurt(world), false);
  assert.equal(p.state, 'alive');
});

test('invincibility counts down while updating', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  p.hurt(world);
  for (let i = 0; i < 60 * PLAYER.invincibleTime + 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.invincible, 0);
  assert.equal(p.vulnerable, true);
});

test('a mushroom grows a small player and awards points', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.collect('mushroom', world);
  assert.equal(p.power, 'big');
  assert.equal(p.body.h, 31);
  assert.equal(world.session.score, GAME.scores.powerUp);
  assert.ok(world.audio.calls.includes('powerup'));
});

test('a fire flower makes the player fire; a mushroom as fire gives points only', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  p.collect('fireflower', world);
  assert.equal(p.power, 'fire');
  p.collect('mushroom', world);
  assert.equal(p.power, 'fire');
  assert.equal(world.session.score, GAME.scores.powerUp * 2);
});

test('with no room to grow the player stays small but still gets the points', () => {
  const world = worldOn(tight());
  const p = playerAt('small');
  p.collect('mushroom', world);
  assert.equal(p.power, 'small');
  assert.equal(p.body.h, 15);
  assert.equal(world.session.score, GAME.scores.powerUp);
});

test('falling below the level kills the player', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.body.y = world.tiles.rows * TILE + 40;
  p.update(DT, world, idleInput);
  assert.equal(p.state, 'dying');
});

test('the death animation ends with state dead after the configured time', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.die(world);
  for (let i = 0; i < 60 * PLAYER.deathTotal + 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.state, 'dead');
});

test('standing on the ground resets the stomp chain', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.stompChain = 3;
  for (let i = 0; i < 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.stompChain, 0);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL with `Cannot find module '../src/spriteData.js'` and `'../src/entities/player.js'`.

- [ ] **Step 4: Write the sprite data**

`src/spriteData.js` (art is 8 pixels wide; `.` is transparent):

```js
// src/spriteData.js
export const PALETTE = {
  k: '#000000', w: '#fcfcfc', r: '#d82800', u: '#0058f8', s: '#f8b878', b: '#8c4a00',
  y: '#f8b800', o: '#e45c10', g: '#00a800', G: '#58d854', d: '#7c3000', l: '#fcd8a8', Y: '#f8f878',
};

const BIG_TOP = [
  '..rrrr..',
  '.rrrrrr.',
  '.sssbbs.',
  '.ssssss.',
  '..ssss..',
  '..rrrr..',
  '.rrrrrr.',
  '.ruuuur.',
  '.uuyyuu.',
  '.uuuuuu.',
];

const LEGS = {
  idle: ['.uuuuuu.', '.uuuuuu.', '.uu..uu.', '.uu..uu.', '.bb..bb.', 'bbb..bbb'],
  run1: ['.uuuuuu.', '..uuuuu.', '.uu..uu.', 'uu...uub', 'bb...bbb', 'bbb.....'],
  run2: ['.uuuuuu.', '.uuuuu..', '.uu..uu.', 'buu...uu', 'bbb...bb', '.....bbb'],
  jump: ['.uuuuuu.', 'uuuuuuuu', 'uu....uu', 'bb....bb', 'bbb..bbb', '........'],
};

const big = (legs) => [...BIG_TOP, ...legs];

export const SPRITES = {
  small_idle: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '.uuuuuu.', '.uu..uu.', '.bb..bb.'],
  small_run1: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '..uuuuu.', '.uu..bb.', 'bb...bbb'],
  small_run2: ['..rrrr..', '.rrrrrr.', '.sssbbs.', '.ssssss.', '.ruuuur.', '.uuuuu..', '.bb..uu.', 'bbb...bb'],
  small_jump: ['.rrrrrr.', 'rrrrrrrr', '.sssbbs.', '.ssssss.', 'suuuuuus', '.uuuuuu.', '.uu..uu.', '.bb..bb.'],

  big_idle: big(LEGS.idle),
  big_run1: big(LEGS.run1),
  big_run2: big(LEGS.run2),
  big_jump: big(LEGS.jump),

  goomba_a: ['..bbbb..', '.bbbbbb.', 'bwkbbkwb', 'bwwbbwwb', 'bbbbbbbb', '.bllllb.', '..ll.ll.', '.bb..bb.'],
  goomba_b: ['..bbbb..', '.bbbbbb.', 'bwkbbkwb', 'bwwbbwwb', 'bbbbbbbb', '.bllllb.', '.ll..ll.', 'bb....bb'],
  goomba_flat: ['........', '........', '........', '........', '........', '.bbbbbb.', 'bwkbbkwb', 'bbbbbbbb'],

  koopa_a: ['..ssss..', '..sksss.', '...ss...', '.gggggg.', 'gGgGgGgg', 'gGgGgGgg', '.gggggg.', '.ss..ss.'],
  koopa_b: ['..ssss..', '..sksss.', '...ss...', '.gggggg.', 'gGgGgGgg', 'gGgGgGgg', '.gggggg.', 'ss....ss'],
  koopa_shell: ['........', '........', '..gggg..', '.gGgGgg.', 'gGgGgGgg', 'gggggggg', '.wwwwww.', '..wwww..'],

  mushroom: ['..rrrr..', '.rwrrwr.', 'rwwrrwwr', 'rrrrrrrr', '.wwwwww.', '.wkwwkw.', '.wwwwww.', '..wwww..'],
  fireflower: ['..rooor.', '.roYYor.', '.roYYor.', '..rooor.', '...g....', '.g.gg.g.', '..gggg..', '...gg...'],
  coin_a: ['..yyyy..', '.yYYYYy.', '.yYyyYy.', '.yYyyYy.', '.yYyyYy.', '.yYyyYy.', '.yYYYYy.', '..yyyy..'],
  coin_b: ['...yy...', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '..yYYy..', '...yy...'],
  fireball: ['.oo.', 'oyyo', 'oyyo', '.oo.'],
  debris: ['oobo', 'obbo', 'obbo', 'oobo'],
  flag: ['GGGGGGGG', 'GGGwwGGG', 'GGwwwwGG', '.GGwwGG.', '..GGGG..', '...GG...', '........', '........'],

  ground: ['GGGGGGGG', 'GGGGGGGG', 'dddddddd', 'dddodddd', 'dddddddd', 'ddddddod', 'dddddddd', 'dddddddd'],
  brick: ['oooooook', 'oooooook', 'oooooook', 'kkkkkkkk', 'ookooooo', 'ookooooo', 'ookooooo', 'kkkkkkkk'],
  qblock: ['yyyyyyyy', 'yowwwwoy', 'yowoowoy', 'yoooowoy', 'yooowooy', 'yooooooy', 'yooowooy', 'yyyyyyyy'],
  used: ['kkkkkkkk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kddddddk', 'kkkkkkkk'],
  pipe: ['kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk', 'kGGgggdk'],
  oneway: ['llllllll', 'dddddddd', '........', '........', '........', '........', '........', '........'],
};
```

- [ ] **Step 5: Write the renderer and the player**

`src/sprites.js`:

```js
// src/sprites.js
import { PALETTE, SPRITES } from './spriteData.js';

const SCALE = 2;
const cache = new Map();

// The only palette swap in the game; the cache key assumes it.
export const FIRE_SWAP = { r: 'w', u: 'r' };

export function getSprite(name, swap = null) {
  const key = swap ? `${name}*` : name;
  let canvas = cache.get(key);
  if (canvas) return canvas;
  const rows = SPRITES[name];
  if (!rows) throw new Error(`Unknown sprite: ${name}`);
  canvas = document.createElement('canvas');
  canvas.width = rows[0].length * SCALE;
  canvas.height = rows.length * SCALE;
  const g = canvas.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let ch = row[x];
      if (ch === '.') continue;
      if (swap && swap[ch]) ch = swap[ch];
      g.fillStyle = PALETTE[ch];
      g.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    }
  });
  cache.set(key, canvas);
  return canvas;
}

export function drawSprite(ctx, name, x, y, { flip = false, flipY = false, swap = null } = {}) {
  const img = getSprite(name, swap);
  const X = Math.round(x);
  const Y = Math.round(y);
  if (!flip && !flipY) {
    ctx.drawImage(img, X, Y);
    return;
  }
  ctx.save();
  ctx.translate(X + (flip ? img.width : 0), Y + (flipY ? img.height : 0));
  ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
```

`src/render.js`:

```js
// src/render.js
import { TILE, VIEW_W, VIEW_H } from './constants.js';
import { T } from './tiles.js';
import { drawSprite, getSprite } from './sprites.js';
import { renderPos } from './physics.js';

const TILE_SPRITES = {
  [T.GROUND]: 'ground', [T.BRICK]: 'brick', [T.QBLOCK]: 'qblock', [T.USED]: 'used', [T.PIPE]: 'pipe', [T.ONEWAY]: 'oneway',
};

export function drawBackground(ctx) {
  ctx.fillStyle = '#5c94fc';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawTiles(ctx, tiles, camX, bumpOffset = () => 0) {
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(tiles.cols - 1, Math.floor((camX + VIEW_W) / TILE));
  for (let r = 0; r < tiles.rows; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = tiles.get(c, r);
      if (t === T.EMPTY) continue;
      drawSprite(ctx, TILE_SPRITES[t], c * TILE - camX, r * TILE + bumpOffset(c, r));
    }
  }
}

export function drawBodySprite(ctx, camera, alpha, body, name, opts) {
  const img = getSprite(name, opts?.swap);
  const pos = renderPos(body, alpha);
  const x = pos.x + body.w / 2 - img.width / 2 - camera.renderX(alpha);
  const y = pos.y + body.h - img.height;
  drawSprite(ctx, name, x, y, opts);
}
```

`src/entities/player.js`:

```js
// src/entities/player.js
import { PLAYER, GAME, TILE } from '../constants.js';
import { createBody, applyGravity, moveBody } from '../physics.js';
import { createMotor, stepMotor } from '../movement.js';
import { sizeOf, applyPowerUp, applyHit, resizeBody, canResize } from '../playerState.js';
import { addScore } from '../session.js';
import { FIRE_SWAP } from '../sprites.js';
import { drawBodySprite } from '../render.js';

export class Player {
  constructor(x, bottomY, power = 'small') {
    const size = sizeOf(power);
    this.kind = 'player';
    this.body = createBody(x, bottomY - size.h, size.w, size.h);
    this.motor = createMotor();
    this.power = power;
    this.state = 'alive'; // 'alive' | 'dying' | 'dead'
    this.invincible = 0;
    this.stompChain = 0;
    this.animTime = 0;
    this.deathTimer = 0;
    this.hopped = false;
    this.ceilingHit = null;
  }

  get vulnerable() {
    return this.state === 'alive' && this.invincible <= 0;
  }

  update(dt, world, input) {
    if (this.state === 'dying') {
      this.updateDying(dt);
      return;
    }
    if (this.state !== 'alive') return;
    const b = this.body;
    const cmd = {
      left: input.isDown('left'),
      right: input.isDown('right'),
      run: input.isDown('run'),
      jumpHeld: input.isDown('jump'),
      jumpPressed: input.wasPressed('jump'),
    };
    const { jumped } = stepMotor(b, this.motor, cmd, dt);
    if (jumped) world.audio.play('jump');
    applyGravity(b, dt);
    this.ceilingHit = moveBody(b, world.tiles, dt).ceiling;
    if (b.onGround) this.stompChain = 0;
    this.invincible = Math.max(0, this.invincible - dt);
    this.animTime += (dt * Math.abs(b.vx)) / 40;
    if (b.y > world.tiles.rows * TILE + 16) this.die(world);
  }

  updateDying(dt) {
    const b = this.body;
    b.px = b.x;
    b.py = b.y;
    this.deathTimer += dt;
    if (this.deathTimer >= PLAYER.deathPause) {
      if (!this.hopped) {
        b.vy = -PLAYER.deathHopVel;
        this.hopped = true;
      }
      b.vy += PLAYER.deathGravity * dt;
      b.y += b.vy * dt;
    }
    if (this.deathTimer >= PLAYER.deathTotal) this.state = 'dead';
  }

  die(world) {
    if (this.state !== 'alive') return;
    this.state = 'dying';
    this.deathTimer = 0;
    this.hopped = false;
    this.body.vx = 0;
    this.body.vy = 0;
    world.audio.stopMusic();
    world.audio.play('death');
  }

  hurt(world) {
    if (!this.vulnerable) return false;
    const next = applyHit(this.power);
    if (next.power === 'dead') {
      this.die(world);
      return true;
    }
    this.changePower(next.power, world.tiles);
    this.invincible = PLAYER.invincibleTime;
    world.audio.play('shrink');
    return true;
  }

  changePower(power, tiles) {
    const size = sizeOf(power);
    if (size.h > this.body.h && !canResize(tiles, this.body, size)) return false;
    resizeBody(this.body, size);
    this.power = power;
    return true;
  }

  collect(item, world) {
    const next = applyPowerUp(this.power, item);
    if (next !== this.power) this.changePower(next, world.tiles);
    addScore(world.session, GAME.scores.powerUp);
    world.audio.play('powerup');
  }

  render(ctx, camera, alpha) {
    if (this.state === 'dead') return;
    if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2 === 1) return;
    const b = this.body;
    const dying = this.state === 'dying';
    const size = dying || this.power === 'small' ? 'small' : 'big';
    let pose = 'idle';
    if (dying || !b.onGround) pose = 'jump';
    else if (Math.abs(b.vx) > 4) pose = Math.floor(this.animTime * 3) % 2 ? 'run1' : 'run2';
    drawBodySprite(ctx, camera, alpha, b, `${size}_${pose}`, {
      flip: this.motor.facing < 0,
      swap: this.power === 'fire' && !dying ? FIRE_SWAP : null,
    });
  }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite, including `spriteData.test.js` and `player.test.js`.

- [ ] **Step 7: Write the world and a temporary boot file, then play it**

`src/world.js` (extended by Tasks 7-9, which show the full replacement for each function they change):

```js
// src/world.js
import { TILE } from './constants.js';
import { createCamera } from './camera.js';
import { Player } from './entities/player.js';
import { drawBackground, drawTiles } from './render.js';

export function createWorld({ level, session, audio }) {
  const world = {
    level,
    tiles: level.tiles,
    session,
    audio,
    camera: createCamera(level.cols * TILE),
    entities: [],
    bumps: [],
    player: null,
    spawn(entity) {
      world.entities.push(entity);
      return entity;
    },
  };
  world.player = new Player(level.start.col * TILE + 2, (level.start.row + 1) * TILE, session.power);
  world.camera.snapTo(world.player.body.x + world.player.body.w / 2);
  return world;
}

export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  player.update(dt, world, input);
  camera.update(player.body.x + player.body.w / 2);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  drawTiles(ctx, world.tiles, camX);
  world.player.render(ctx, world.camera, alpha);
}
```

`src/main.js` (replace the Task 1 file; Task 9 replaces this again with the state machine):

```js
// src/main.js
import { startLoop } from './loop.js';
import { createInput } from './input.js';
import { loadLevel } from './levels/index.js';
import { createSession } from './session.js';
import { createWorld, updateWorld, renderWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const input = createInput(window);
const audio = { play() {}, startMusic() {}, stopMusic() {} }; // replaced by the real synth in Task 10
const session = createSession();
let world = createWorld({ level: loadLevel(0), session, audio });

startLoop({
  update(dt) {
    updateWorld(world, dt, input);
    if (world.player.state === 'dead') world = createWorld({ level: loadLevel(0), session, audio });
    input.endFrame();
  },
  render(alpha) {
    renderWorld(world, ctx, alpha);
  },
});
```

Run: `python3 -m http.server 8000` (background), open http://localhost:8000.
Expected (by hand):
- Level 1 shows sky, ground, `?`/brick blocks, two pipes, a staircase; no enemies or flag yet.
- Arrow keys/A/D move, Shift runs faster, Space/W/Up jumps; holding the key jumps higher than a tap; you can jump just after walking off an edge.
- You cannot walk through pipes, bricks, or the screen's left edge; you can stand on top of pipes and stairs.
- The camera follows you and stops at both ends of the level.
- Walking into the first pit makes the player hop and fall, then the level restarts after about 2.5 s.
- The browser console shows no errors. Stop the server afterward.

- [ ] **Step 8: Commit**

```bash
git add src test
git commit -m "feat: pixel art, renderer, player entity, first playable level"
```

### Task 7: Enemies, coins, stomping and shells

**Files:**
- Create: `src/combat.js`, `src/interactions.js`, `src/entities/walker.js`, `src/entities/goomba.js`, `src/entities/koopa.js`, `src/entities/coin.js`, `src/entities/index.js`
- Modify: `src/world.js` (replace), `test/helpers.js` (imports + append)
- Test: `test/combat.test.js`, `test/world.test.js`

**Interfaces:**
- Consumes: `Player` (`body`, `motor`, `power`, `state`, `stompChain`, `hurt(world)`), `createWorld`, `inActiveRange`, session functions, `drawBodySprite`.
- Produces:
  - `combat.js`: `classifyContact(playerBody, enemyBody) -> 'stomp' | 'side'` (a stomp is: `playerBody.vy > 0` and the player's previous bottom `py + h` was at or above the enemy's vertical center); `stompScore(chain) -> number` (index into `GAME.scores.stomp`, clamped to the last entry); `stompEnemy(world, player, enemy)` (calls `enemy.stomp(world)`, sets `player.body.vy = -PHYS.bounceVel`, clears `player.motor.jumping`, adds `stompScore(player.stompChain)`, increments `player.stompChain`, plays `'stomp'`).
  - Entity protocol used by `interactions.js` and `world.js` (every entity has `kind`, `body`, `alive`, `update(dt, world)`, `render(ctx, camera, alpha)`), plus optional:
    - `isEnemy: true` with `killable` (getter), `touchPlayer(world, player)`, `stomp(world)`, `knock(dir)`; shells also expose `sliding` (getter) and `dir`.
    - `isPickup: true` with `canPickup` and `pickup(world, player)`.
    - `alwaysActive: true` to opt out of the active-range window.
  - `entities/walker.js`: `stepWalker(entity, dt, world) -> moveBody result` (sets `vx = dir * speed`, gravity, move, turns `dir` around on a wall hit, marks `alive = false` below the level); `stepKnocked(entity, dt)` (ballistic fall without collision, `alive = false` once far below the screen).
  - `entities/goomba.js`: `class Goomba(col, row)` with `state: 'walk'|'squashed'|'knocked'`.
  - `entities/koopa.js`: `class Koopa(col, row)` with `state: 'walk'|'shell'|'slide'|'knocked'`, `dir`, `kickCooldown`, `kick(dir)`.
  - `entities/coin.js`: `class Coin(col, row)`; `collectCoin(world)` (adds a coin and `GAME.scores.coin`, plays `'coin'`, or `'oneup'` when the 100th coin awards a life).
  - `entities/index.js`: `createFromSpawn({ type, col, row }) -> entity`; throws on an unknown type.
  - `interactions.js`: `isLive(world, entity) -> boolean` (alive and either `alwaysActive` or inside the camera's active range); `resolveInteractions(world)`.
  - `world.js`: `createWorld` now spawns `level.spawns`; `updateWorld` updates live entities, resolves interactions, and removes dead entities; `renderWorld` draws entities behind tiles.
  - `test/helpers.js`: `makeWorld({ edit?, power? = 'small', cols? = 40 }) -> world` built from `levelText` through the real `createWorld`.

- [ ] **Step 1: Extend the test helpers**

At the top of `test/helpers.js`, next to the existing import, add:

```js
import { parseLevel } from '../src/level.js';
import { createSession } from '../src/session.js';
import { createWorld } from '../src/world.js';
```

Append to `test/helpers.js`:

```js
export function makeWorld({ edit, power = 'small', cols = 40 } = {}) {
  const session = createSession();
  session.power = power;
  return createWorld({ level: parseLevel('test', levelText({ cols, edit })), session, audio: mockAudio() });
}
```

- [ ] **Step 2: Write the failing tests**

`test/combat.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyContact, stompScore, stompEnemy } from '../src/combat.js';
import { createBody } from '../src/physics.js';
import { createMotor } from '../src/movement.js';
import { createSession } from '../src/session.js';
import { PHYS, GAME } from '../src/constants.js';
import { mockAudio } from './helpers.js';

const enemy = () => createBody(100, 178, 14, 14); // vertical center at y = 185
const player = (y, py, vy) => {
  const b = createBody(100, y, 12, 15);
  b.py = py;
  b.vy = vy;
  return b;
};

test('falling onto an enemy from above is a stomp', () => {
  assert.equal(classifyContact(player(168, 160, 100), enemy()), 'stomp');
});

test('walking into an enemy is a side hit', () => {
  assert.equal(classifyContact(player(178, 178, 0), enemy()), 'side');
});

test('falling past the enemy from the side is a side hit', () => {
  assert.equal(classifyContact(player(176, 172, 100), enemy()), 'side');
});

test('rising into an enemy is a side hit', () => {
  assert.equal(classifyContact(player(168, 160, -100), enemy()), 'side');
});

test('stomp scores climb with the chain and stay at the cap', () => {
  assert.equal(stompScore(0), 100);
  assert.equal(stompScore(1), 200);
  assert.equal(stompScore(GAME.scores.stomp.length - 1), 8000);
  assert.equal(stompScore(50), 8000);
});

test('stompEnemy stomps, bounces the player, scores the chain and plays a sound', () => {
  let stomped = 0;
  const target = { stomp() { stomped++; } };
  const p = { body: createBody(0, 0, 12, 15), motor: createMotor(), stompChain: 0 };
  p.motor.jumping = true;
  const world = { session: createSession(), audio: mockAudio() };
  stompEnemy(world, p, target);
  stompEnemy(world, p, target);
  assert.equal(stomped, 2);
  assert.equal(p.body.vy, -PHYS.bounceVel);
  assert.equal(p.motor.jumping, false);
  assert.equal(world.session.score, 300);
  assert.equal(p.stompChain, 2);
  assert.deepEqual(world.audio.calls, ['stomp', 'stomp']);
});
```

`test/world.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateWorld } from '../src/world.js';
import { resolveInteractions } from '../src/interactions.js';
import { GAME } from '../src/constants.js';
import { makeWorld, idleInput } from './helpers.js';

const DT = 1 / 60;
const first = (world, kind) => world.entities.find((e) => e.kind === kind);
const run = (world, steps) => {
  for (let i = 0; i < steps; i++) updateWorld(world, DT, idleInput);
};

// The player is falling onto the enemy's head.
function dropOnto(world, enemy) {
  const p = world.player.body;
  p.x = enemy.body.x;
  p.y = enemy.body.y - p.h + 3;
  p.py = enemy.body.y - p.h - 4;
  p.vy = 100;
}

// The player is standing next to the enemy (not falling), dx pixels to its right.
function standBeside(world, enemy, dx = -8) {
  const p = world.player.body;
  p.x = enemy.body.x + dx;
  p.y = enemy.body.y + enemy.body.h - p.h;
  p.py = p.y;
  p.vy = 0;
}

test('createWorld spawns entities from the level', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; g[11][12] = 'K'; g[11][14] = 'C'; } });
  assert.deepEqual(world.entities.map((e) => e.kind).sort(), ['coin', 'goomba', 'koopa']);
});

test('stomping a goomba squashes it, bounces the player and scores', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  dropOnto(world, g);
  resolveInteractions(world);
  assert.equal(g.state, 'squashed');
  assert.ok(world.player.body.vy < 0);
  assert.equal(world.session.score, 100);
  assert.equal(world.player.stompChain, 1);
  assert.equal(world.player.state, 'alive');
  assert.ok(world.audio.calls.includes('stomp'));
});

test('consecutive stomps without landing score 100 then 200', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; g[11][12] = 'G'; } });
  const [g1, g2] = world.entities.filter((e) => e.kind === 'goomba');
  dropOnto(world, g1);
  resolveInteractions(world);
  dropOnto(world, g2);
  resolveInteractions(world);
  assert.equal(world.session.score, 300);
});

test('walking into a goomba kills a small player', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'dying');
  assert.equal(g.state, 'walk');
});

test('a big player hit from the side shrinks, blinks, and the goomba survives', () => {
  const world = makeWorld({ power: 'big', edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
  assert.equal(world.player.power, 'small');
  assert.ok(world.player.invincible > 0);
  assert.equal(g.state, 'walk');
});

test('an invincible player ignores enemy contact', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  world.player.invincible = 1;
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
});

test('enemies outside the active range are inert', () => {
  const world = makeWorld({ edit: (g) => { g[11][30] = 'G'; } });
  const g = first(world, 'goomba');
  standBeside(world, g);
  resolveInteractions(world);
  assert.equal(world.player.state, 'alive');
});

test('a stomped koopa becomes a shell that cannot be kicked or hurt you for a moment', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  dropOnto(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  standBeside(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  assert.equal(world.player.state, 'alive');
});

test('kicking a stationary shell sends it away from the player without hurting them', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'shell';
  standBeside(world, k, -8);
  resolveInteractions(world);
  assert.equal(k.state, 'slide');
  assert.equal(k.dir, 1);
  assert.equal(world.player.state, 'alive');
  assert.equal(world.player.power, 'small');
  resolveInteractions(world); // same contact on the next frame
  assert.equal(world.player.state, 'alive');
  k.kickCooldown = 0;
  resolveInteractions(world); // a sliding shell that comes back does hurt
  assert.equal(world.player.state, 'dying');
});

test('a shell kicked from its right side slides left', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'shell';
  standBeside(world, k, 8);
  resolveInteractions(world);
  assert.equal(k.dir, -1);
});

test('stomping a sliding shell stops it', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'K'; } });
  const k = first(world, 'koopa');
  k.state = 'slide';
  dropOnto(world, k);
  resolveInteractions(world);
  assert.equal(k.state, 'shell');
  assert.equal(world.player.state, 'alive');
});

test('a sliding shell knocks out other enemies and scores', () => {
  const world = makeWorld({ edit: (g) => { g[11][8] = 'K'; g[11][9] = 'G'; } });
  const k = first(world, 'koopa');
  const g = first(world, 'goomba');
  k.state = 'slide';
  k.dir = 1;
  k.body.x = g.body.x - 10;
  resolveInteractions(world);
  assert.equal(g.state, 'knocked');
  assert.equal(world.session.score, GAME.scores.shellKill);
});

test('walking over a coin collects it', () => {
  const world = makeWorld({ edit: (g) => { g[11][3] = 'C'; } });
  const c = first(world, 'coin');
  world.player.body.x = c.body.x - 2;
  resolveInteractions(world);
  assert.equal(c.alive, false);
  assert.equal(world.session.coins, 1);
  assert.equal(world.session.score, GAME.scores.coin);
  assert.ok(world.audio.calls.includes('coin'));
});

test('the 100th coin plays the extra-life sound and adds a life', () => {
  const world = makeWorld({ edit: (g) => { g[11][3] = 'C'; } });
  world.session.coins = 99;
  const c = first(world, 'coin');
  world.player.body.x = c.body.x - 2;
  resolveInteractions(world);
  assert.equal(world.session.lives, GAME.startLives + 1);
  assert.ok(world.audio.calls.includes('oneup'));
});

test('a goomba turns around when it hits a wall', () => {
  const world = makeWorld({ edit: (g) => { g[11][8] = '|'; g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  run(world, 90);
  assert.equal(g.dir, 1);
  assert.ok(g.body.x >= 9 * 16);
});

test('a goomba that walks into a pit falls out of the world and is removed', () => {
  const world = makeWorld({
    edit: (g) => {
      for (const c of [9, 10, 11]) { g[12][c] = '.'; g[13][c] = '.'; }
      g[11][10] = 'G';
    },
  });
  run(world, 120);
  assert.equal(first(world, 'goomba'), undefined);
});

test('a squashed goomba disappears after a moment', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  dropOnto(world, g);
  resolveInteractions(world);
  run(world, 45);
  assert.equal(first(world, 'goomba'), undefined);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL with `Cannot find module '../src/combat.js'` (and `interactions.js`, entity files).

- [ ] **Step 4: Write combat and the entities**

`src/combat.js`:

```js
// src/combat.js
import { PHYS, GAME } from './constants.js';
import { addScore } from './session.js';

export function classifyContact(playerBody, enemyBody) {
  const falling = playerBody.vy > 0;
  const wasAbove = playerBody.py + playerBody.h <= enemyBody.y + enemyBody.h / 2;
  return falling && wasAbove ? 'stomp' : 'side';
}

export function stompScore(chain) {
  const table = GAME.scores.stomp;
  return table[Math.min(chain, table.length - 1)];
}

export function stompEnemy(world, player, enemy) {
  enemy.stomp(world);
  player.body.vy = -PHYS.bounceVel;
  player.motor.jumping = false;
  addScore(world.session, stompScore(player.stompChain));
  player.stompChain += 1;
  world.audio.play('stomp');
}
```

`src/entities/walker.js`:

```js
// src/entities/walker.js
import { TILE, PHYS, VIEW_H } from '../constants.js';
import { applyGravity, moveBody } from '../physics.js';

export function stepWalker(entity, dt, world) {
  const b = entity.body;
  b.vx = entity.dir * entity.speed;
  applyGravity(b, dt);
  const hit = moveBody(b, world.tiles, dt);
  if (hit.wall) entity.dir = -hit.wall;
  if (b.y > world.tiles.rows * TILE + 32) entity.alive = false;
  return hit;
}

export function stepKnocked(entity, dt) {
  const b = entity.body;
  b.px = b.x;
  b.py = b.y;
  b.vy = Math.min(b.vy + PHYS.gravityFall * dt, PHYS.maxFall);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  if (b.y > VIEW_H + 64) entity.alive = false;
}
```

`src/entities/goomba.js`:

```js
// src/entities/goomba.js
import { TILE, ENEMY } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker, stepKnocked } from './walker.js';
import { classifyContact, stompEnemy } from '../combat.js';
import { drawBodySprite } from '../render.js';

export class Goomba {
  constructor(col, row) {
    this.kind = 'goomba';
    this.isEnemy = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.dir = -1;
    this.speed = ENEMY.walkSpeed;
    this.state = 'walk'; // 'walk' | 'squashed' | 'knocked'
    this.timer = 0;
    this.anim = 0;
  }

  get killable() {
    return this.state === 'walk';
  }

  update(dt, world) {
    if (this.state === 'knocked') {
      stepKnocked(this, dt);
      return;
    }
    if (this.state === 'squashed') {
      this.timer += dt;
      if (this.timer >= ENEMY.squashTime) this.alive = false;
      return;
    }
    this.anim += dt;
    stepWalker(this, dt, world);
  }

  stomp() {
    this.state = 'squashed';
    this.timer = 0;
    this.body.vx = 0;
  }

  knock(dir) {
    this.state = 'knocked';
    this.body.vx = dir * 60;
    this.body.vy = -ENEMY.knockVel;
  }

  touchPlayer(world, player) {
    if (this.state !== 'walk') return;
    if (classifyContact(player.body, this.body) === 'stomp') stompEnemy(world, player, this);
    else player.hurt(world);
  }

  render(ctx, camera, alpha) {
    const name = this.state === 'squashed' ? 'goomba_flat' : Math.floor(this.anim * 6) % 2 ? 'goomba_a' : 'goomba_b';
    drawBodySprite(ctx, camera, alpha, this.body, name, { flipY: this.state === 'knocked' });
  }
}
```

`src/entities/koopa.js`:

```js
// src/entities/koopa.js
import { TILE, ENEMY, PHYS } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker, stepKnocked } from './walker.js';
import { classifyContact, stompEnemy } from '../combat.js';
import { drawBodySprite } from '../render.js';

export class Koopa {
  constructor(col, row) {
    this.kind = 'koopa';
    this.isEnemy = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.dir = -1;
    this.speed = ENEMY.walkSpeed;
    this.state = 'walk'; // 'walk' | 'shell' | 'slide' | 'knocked'
    this.kickCooldown = 0;
    this.anim = 0;
  }

  get killable() {
    return this.state !== 'knocked';
  }

  get sliding() {
    return this.state === 'slide';
  }

  update(dt, world) {
    if (this.state === 'knocked') {
      stepKnocked(this, dt);
      return;
    }
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.anim += dt;
    this.speed = this.state === 'walk' ? ENEMY.walkSpeed : this.state === 'slide' ? ENEMY.shellSpeed : 0;
    stepWalker(this, dt, world);
  }

  stomp() {
    this.state = 'shell';
    this.body.vx = 0;
    this.kickCooldown = ENEMY.kickCooldown;
  }

  kick(dir) {
    this.state = 'slide';
    this.dir = dir;
    this.kickCooldown = ENEMY.kickCooldown;
  }

  knock(dir) {
    this.state = 'knocked';
    this.body.vx = dir * 60;
    this.body.vy = -ENEMY.knockVel;
  }

  touchPlayer(world, player) {
    if (this.state === 'knocked' || this.kickCooldown > 0) return;
    const kind = classifyContact(player.body, this.body);
    if (this.state === 'shell') {
      this.kick(player.body.x + player.body.w / 2 < this.body.x + this.body.w / 2 ? 1 : -1);
      if (kind === 'stomp') {
        player.body.vy = -PHYS.bounceVel;
        player.motor.jumping = false;
      }
      world.audio.play('kick');
      return;
    }
    if (kind === 'stomp') stompEnemy(world, player, this);
    else player.hurt(world);
  }

  render(ctx, camera, alpha) {
    const name = this.state === 'walk' ? (Math.floor(this.anim * 5) % 2 ? 'koopa_a' : 'koopa_b') : 'koopa_shell';
    drawBodySprite(ctx, camera, alpha, this.body, name, {
      flip: this.state === 'walk' && this.dir > 0,
      flipY: this.state === 'knocked',
    });
  }
}
```

`src/entities/coin.js`:

```js
// src/entities/coin.js
import { TILE, GAME } from '../constants.js';
import { createBody } from '../physics.js';
import { addCoin, addScore } from '../session.js';
import { drawBodySprite } from '../render.js';

export function collectCoin(world) {
  const extraLife = addCoin(world.session);
  addScore(world.session, GAME.scores.coin);
  world.audio.play(extraLife ? 'oneup' : 'coin');
}

export class Coin {
  constructor(col, row) {
    this.kind = 'coin';
    this.isPickup = true;
    this.canPickup = true;
    this.alive = true;
    this.body = createBody(col * TILE + 4, row * TILE + 2, 8, 12);
    this.anim = 0;
  }

  update(dt) {
    this.anim += dt;
  }

  pickup(world) {
    this.alive = false;
    collectCoin(world);
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, Math.floor(this.anim * 6) % 2 ? 'coin_a' : 'coin_b');
  }
}
```

`src/entities/index.js`:

```js
// src/entities/index.js
import { Goomba } from './goomba.js';
import { Koopa } from './koopa.js';
import { Coin } from './coin.js';

export function createFromSpawn(spawn) {
  switch (spawn.type) {
    case 'goomba': return new Goomba(spawn.col, spawn.row);
    case 'koopa': return new Koopa(spawn.col, spawn.row);
    case 'coin': return new Coin(spawn.col, spawn.row);
    default: throw new Error(`Unknown spawn type: ${spawn.type}`);
  }
}
```

`src/interactions.js`:

```js
// src/interactions.js
import { GAME } from './constants.js';
import { overlaps } from './physics.js';
import { inActiveRange } from './camera.js';
import { addScore } from './session.js';

export function isLive(world, entity) {
  return entity.alive && (entity.alwaysActive || inActiveRange(world.camera, entity.body));
}

export function resolveInteractions(world) {
  const { player } = world;
  const live = world.entities.filter((e) => isLive(world, e));
  const enemies = live.filter((e) => e.isEnemy);

  if (player.state === 'alive') {
    for (const e of live) {
      if (player.state !== 'alive') break;
      if (!e.alive || !overlaps(player.body, e.body)) continue;
      if (e.isEnemy) e.touchPlayer(world, player);
      else if (e.isPickup && e.canPickup) e.pickup(world, player);
    }
  }

  for (const shell of enemies) {
    if (!shell.alive || !shell.sliding) continue;
    for (const other of enemies) {
      if (other === shell || !other.alive || !other.killable || !overlaps(shell.body, other.body)) continue;
      other.knock(shell.dir);
      addScore(world.session, GAME.scores.shellKill);
      world.audio.play('kick');
    }
  }
}
```

- [ ] **Step 5: Replace the world**

`src/world.js` (full replacement):

```js
// src/world.js
import { TILE } from './constants.js';
import { createCamera } from './camera.js';
import { Player } from './entities/player.js';
import { createFromSpawn } from './entities/index.js';
import { drawBackground, drawTiles } from './render.js';
import { resolveInteractions, isLive } from './interactions.js';
import { inActiveRange } from './camera.js';

export function createWorld({ level, session, audio }) {
  const world = {
    level,
    tiles: level.tiles,
    session,
    audio,
    camera: createCamera(level.cols * TILE),
    entities: [],
    bumps: [],
    player: null,
    spawn(entity) {
      world.entities.push(entity);
      return entity;
    },
  };
  world.player = new Player(level.start.col * TILE + 2, (level.start.row + 1) * TILE, session.power);
  world.camera.snapTo(world.player.body.x + world.player.body.w / 2);
  for (const spawn of level.spawns) world.spawn(createFromSpawn(spawn));
  return world;
}

export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  if (player.state === 'dying') {
    player.update(dt, world, input);
    return;
  }
  player.update(dt, world, input);
  camera.update(player.body.x + player.body.w / 2);
  for (const e of world.entities) if (isLive(world, e)) e.update(dt, world);
  resolveInteractions(world);
  world.entities = world.entities.filter((e) => e.alive);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  for (const e of world.entities) if (inActiveRange(world.camera, e.body)) e.render(ctx, world.camera, alpha);
  drawTiles(ctx, world.tiles, camX);
  world.player.render(ctx, world.camera, alpha);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 7: Check it in the browser**

Run: `python3 -m http.server 8000` (background), open http://localhost:8000.
Expected: goombas and koopas patrol level 1 and turn at pipes; coins spin and are collected (no HUD yet, so check by their disappearing); landing on a goomba squashes it and bounces you; touching one from the side restarts the level; stomping a koopa leaves a shell you can kick, and a kicked shell knocks out goombas it hits; enemies fall into pits and vanish. No console errors. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src test
git commit -m "feat: goombas, koopas, coins, stomping, shell kicks"
```

---

### Task 8: Blocks, power-ups, fireballs

**Files:**
- Create: `src/blocks.js`, `src/entities/powerup.js`, `src/entities/fireball.js`, `src/entities/coinpop.js`, `src/entities/debris.js`
- Modify: `src/entities/player.js` (shooting), `src/interactions.js` (fireballs), `src/world.js` (blocks, bumps), `test/world.test.js` (append)
- Test: `test/blocks.test.js`

**Interfaces:**
- Consumes: Task 7 entity protocol (`isPickup`, `canPickup`, `pickup`, `alwaysActive`), `collectCoin`, `Player.collect`, `stepWalker`.
- Produces:
  - `blocks.js`: `hitBlock(world, col, row, player)`: BRICK -> small player bumps it, big/fire player breaks it (tile becomes EMPTY, `+GAME.scores.brick`, four `Debris` entities, sound `'brick'`); QBLOCK -> contents taken from the tile map (`'coin'` by default or `'mushroom'`), tile becomes USED, bump, a coin block calls `collectCoin` and spawns a `CoinPop`, a mushroom block spawns a `Powerup` (`'mushroom'` for a small player, `'fireflower'` otherwise) and plays `'sprout'`; USED -> bump and `'bump'`. `updateBumps(world, dt)`; `bumpOffset(world, col, row) -> pixels` (0, or up to -4 while bumping). `world.bumps` is `[{ col, row, t }]`.
  - `entities/powerup.js`: `class Powerup(type, col, row)` where `type` is `'mushroom'` or `'fireflower'`; rises out of the block over `ITEM.riseTime` (`rising`, `canPickup` is false meanwhile), then a mushroom walks right and a flower stays put. `kind` equals `type`.
  - `entities/fireball.js`: `class Fireball(x, y, dir)` with `isFireball: true`, `alwaysActive: true`; bounces on the ground, dies on a wall, ceiling or when it leaves the view.
  - `entities/coinpop.js`: `class CoinPop(col, row)` (visual only, `kind: 'coinpop'`, `alwaysActive`). `entities/debris.js`: `class Debris(x, y, vx, vy)` (`kind: 'debris'`, `alwaysActive`); `spawnDebris(world, col, row)`.
  - `Player.shoot(world)`: spawns a `Fireball` when fewer than `PLAYER.maxFireballs` are alive, plays `'fireball'`.
  - `interactions.js`: fireballs knock out killable enemies on contact (`+GAME.scores.fireballKill`, the fireball is consumed).

- [ ] **Step 1: Write the failing tests**

`test/blocks.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitBlock, updateBumps, bumpOffset } from '../src/blocks.js';
import { updateWorld } from '../src/world.js';
import { resolveInteractions } from '../src/interactions.js';
import { T } from '../src/tiles.js';
import { GAME, ITEM } from '../src/constants.js';
import { makeWorld, idleInput } from './helpers.js';

const DT = 1 / 60;
const blocks = (g) => { g[8][5] = 'B'; g[8][6] = '?'; g[8][7] = 'M'; };
const kinds = (world) => world.entities.map((e) => e.kind);

test('a small player only bumps a brick', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 5, 8, world.player);
  assert.equal(world.tiles.get(5, 8), T.BRICK);
  assert.equal(world.bumps.length, 1);
  assert.equal(world.session.score, 0);
  assert.ok(world.audio.calls.includes('bump'));
});

test('a big player breaks a brick into debris and scores', () => {
  const world = makeWorld({ power: 'big', edit: blocks });
  hitBlock(world, 5, 8, world.player);
  assert.equal(world.tiles.get(5, 8), T.EMPTY);
  assert.equal(world.session.score, GAME.scores.brick);
  assert.equal(kinds(world).filter((k) => k === 'debris').length, 4);
  assert.ok(world.audio.calls.includes('brick'));
});

test('a coin block pays one coin, becomes used, and pays nothing more', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 6, 8, world.player);
  assert.equal(world.tiles.get(6, 8), T.USED);
  assert.equal(world.session.coins, 1);
  assert.equal(world.session.score, GAME.scores.coin);
  assert.ok(kinds(world).includes('coinpop'));
  hitBlock(world, 6, 8, world.player);
  assert.equal(world.session.coins, 1);
});

test('a mushroom block gives a mushroom to a small player and a fire flower to a big one', () => {
  const small = makeWorld({ edit: blocks });
  hitBlock(small, 7, 8, small.player);
  assert.ok(kinds(small).includes('mushroom'));
  assert.equal(small.tiles.get(7, 8), T.USED);
  assert.ok(small.audio.calls.includes('sprout'));

  const big = makeWorld({ power: 'big', edit: blocks });
  hitBlock(big, 7, 8, big.player);
  assert.ok(kinds(big).includes('fireflower'));
});

test('a bump animates up and back, then clears', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 5, 8, world.player);
  updateBumps(world, ITEM.bumpTime / 2);
  assert.equal(bumpOffset(world, 5, 8), -4);
  updateBumps(world, 1);
  assert.equal(bumpOffset(world, 5, 8), 0);
  assert.equal(world.bumps.length, 0);
});

test('a power-up rises out of the block before it can be picked up, then a mushroom walks', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 7, 8, world.player);
  const m = world.entities.find((e) => e.kind === 'mushroom');
  assert.equal(m.canPickup, false);
  for (let i = 0; i < Math.ceil((ITEM.riseTime + 0.1) / DT); i++) updateWorld(world, DT, idleInput);
  assert.equal(m.canPickup, true);
  const x0 = m.body.x;
  for (let i = 0; i < 20; i++) updateWorld(world, DT, idleInput);
  assert.ok(m.body.x > x0);
});

test('picking up a risen mushroom grows the player and removes the item', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 7, 8, world.player);
  const m = world.entities.find((e) => e.kind === 'mushroom');
  m.rising = false;
  m.body.x = world.player.body.x;
  m.body.y = world.player.body.y;
  resolveInteractions(world);
  assert.equal(world.player.power, 'big');
  assert.equal(m.alive, false);
});

test('jumping into a ? block from below releases its power-up', () => {
  const world = makeWorld({ edit: (g) => { g[8][5] = 'M'; } });
  world.player.body.x = 5 * 16 + 2;
  world.player.body.px = world.player.body.x;
  let n = 0;
  const input = { isDown: (a) => a === 'jump', wasPressed: (a) => a === 'jump' && n === 0 };
  for (n = 0; n < 60; n++) updateWorld(world, DT, input);
  assert.equal(world.tiles.get(5, 8), T.USED);
  assert.ok(kinds(world).includes('mushroom'));
});
```

Append to `test/world.test.js`:

```js
import { Fireball } from '../src/entities/fireball.js';

const fireInput = { isDown: () => false, wasPressed: (a) => a === 'fire' };

test('a fire player shoots at most two fireballs at a time', () => {
  const world = makeWorld({ power: 'fire' });
  for (let i = 0; i < 3; i++) updateWorld(world, DT, fireInput);
  assert.equal(world.entities.filter((e) => e.isFireball).length, 2);
  assert.ok(world.audio.calls.includes('fireball'));
});

test('only a fire player can shoot', () => {
  const world = makeWorld({ power: 'big' });
  updateWorld(world, DT, fireInput);
  assert.equal(world.entities.filter((e) => e.isFireball).length, 0);
});

test('a fireball knocks out an enemy and is consumed', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  const fb = world.spawn(new Fireball(g.body.x, g.body.y, 1));
  resolveInteractions(world);
  assert.equal(g.state, 'knocked');
  assert.equal(fb.alive, false);
  assert.equal(world.session.score, GAME.scores.fireballKill);
});

test('a fireball bounces along the ground and dies on a wall', () => {
  const world = makeWorld({ edit: (g) => { for (let r = 6; r <= 11; r++) g[r][12] = '#'; } });
  const fb = world.spawn(new Fireball(100, 160, 1));
  let bounced = false;
  let landedOnce = false;
  for (let i = 0; i < 180 && fb.alive; i++) {
    updateWorld(world, DT, idleInput);
    if (fb.body.onGround) landedOnce = true;
    if (landedOnce && fb.body.vy < 0) bounced = true;
  }
  assert.equal(bounced, true);
  assert.equal(fb.alive, false);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL with `Cannot find module '../src/blocks.js'` / `'../src/entities/fireball.js'`.

- [ ] **Step 3: Write the new entities**

`src/entities/powerup.js`:

```js
// src/entities/powerup.js
import { TILE, ITEM } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker } from './walker.js';
import { drawBodySprite } from '../render.js';

export class Powerup {
  constructor(type, col, row) {
    this.kind = type;
    this.type = type; // 'mushroom' | 'fireflower'
    this.isPickup = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, row * TILE + 2, 14, 14);
    this.startY = row * TILE + 2;
    this.endY = row * TILE - 14;
    this.t = 0;
    this.rising = true;
    this.dir = 1;
    this.speed = ITEM.mushroomSpeed;
  }

  get canPickup() {
    return !this.rising;
  }

  update(dt, world) {
    const b = this.body;
    if (this.rising) {
      this.t += dt;
      const k = Math.min(1, this.t / ITEM.riseTime);
      b.px = b.x;
      b.py = b.y;
      b.y = this.startY + (this.endY - this.startY) * k;
      if (k >= 1) this.rising = false;
      return;
    }
    if (this.type === 'mushroom') stepWalker(this, dt, world);
  }

  pickup(world, player) {
    player.collect(this.type, world);
    this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, this.type);
  }
}
```

`src/entities/fireball.js`:

```js
// src/entities/fireball.js
import { TILE, VIEW_W, ITEM } from '../constants.js';
import { createBody, applyGravity, moveBody } from '../physics.js';
import { drawBodySprite } from '../render.js';

export class Fireball {
  constructor(x, y, dir) {
    this.kind = 'fireball';
    this.isFireball = true;
    this.alwaysActive = true;
    this.alive = true;
    this.body = createBody(x, y, 8, 8);
    this.body.vx = dir * ITEM.fireballSpeed;
  }

  update(dt, world) {
    const b = this.body;
    applyGravity(b, dt, ITEM.fireballGravity, ITEM.fireballGravity);
    const hit = moveBody(b, world.tiles, dt);
    if (hit.landed) b.vy = -ITEM.fireballBounce;
    if (hit.wall || hit.ceiling) this.alive = false;
    const cam = world.camera;
    if (b.x < cam.x - 16 || b.x > cam.x + VIEW_W + 16 || b.y > world.tiles.rows * TILE + 16) this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, 'fireball');
  }
}
```

`src/entities/coinpop.js`:

```js
// src/entities/coinpop.js
import { TILE, ITEM } from '../constants.js';
import { createBody } from '../physics.js';
import { drawBodySprite } from '../render.js';

export class CoinPop {
  constructor(col, row) {
    this.kind = 'coinpop';
    this.alwaysActive = true;
    this.alive = true;
    this.baseY = row * TILE - 4;
    this.body = createBody(col * TILE + 4, this.baseY, 8, 12);
    this.t = 0;
  }

  update(dt) {
    const b = this.body;
    this.t += dt;
    const k = Math.min(1, this.t / ITEM.coinPopTime);
    b.px = b.x;
    b.py = b.y;
    b.y = this.baseY - 40 * Math.sin(Math.PI * k);
    if (k >= 1) this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, Math.floor(this.t * 14) % 2 ? 'coin_a' : 'coin_b');
  }
}
```

`src/entities/debris.js`:

```js
// src/entities/debris.js
import { TILE, VIEW_H, PHYS } from '../constants.js';
import { createBody } from '../physics.js';
import { drawBodySprite } from '../render.js';

export class Debris {
  constructor(x, y, vx, vy) {
    this.kind = 'debris';
    this.alwaysActive = true;
    this.alive = true;
    this.body = createBody(x, y, 8, 8);
    this.body.vx = vx;
    this.body.vy = vy;
  }

  update(dt) {
    const b = this.body;
    b.px = b.x;
    b.py = b.y;
    b.vy += PHYS.gravityFall * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.y > VIEW_H + 16) this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, 'debris');
  }
}

export function spawnDebris(world, col, row) {
  const x = col * TILE + 4;
  const y = row * TILE + 4;
  for (const [vx, vy] of [[-60, -220], [60, -220], [-40, -150], [40, -150]]) world.spawn(new Debris(x, y, vx, vy));
}
```

- [ ] **Step 4: Write the block logic**

`src/blocks.js`:

```js
// src/blocks.js
import { T } from './tiles.js';
import { GAME, ITEM } from './constants.js';
import { addScore } from './session.js';
import { collectCoin } from './entities/coin.js';
import { Powerup } from './entities/powerup.js';
import { CoinPop } from './entities/coinpop.js';
import { spawnDebris } from './entities/debris.js';

function bump(world, col, row) {
  world.bumps.push({ col, row, t: 0 });
}

export function hitBlock(world, col, row, player) {
  const { tiles } = world;
  const tile = tiles.get(col, row);
  if (tile === T.BRICK) {
    if (player.power === 'small') {
      bump(world, col, row);
      world.audio.play('bump');
      return;
    }
    tiles.set(col, row, T.EMPTY);
    addScore(world.session, GAME.scores.brick);
    world.audio.play('brick');
    spawnDebris(world, col, row);
  } else if (tile === T.QBLOCK) {
    const contents = tiles.takeContents(col, row) ?? 'coin';
    tiles.set(col, row, T.USED);
    bump(world, col, row);
    if (contents === 'coin') {
      collectCoin(world);
      world.spawn(new CoinPop(col, row));
    } else {
      world.spawn(new Powerup(player.power === 'small' ? 'mushroom' : 'fireflower', col, row));
      world.audio.play('sprout');
    }
  } else if (tile === T.USED) {
    bump(world, col, row);
    world.audio.play('bump');
  }
}

export function updateBumps(world, dt) {
  for (const b of world.bumps) b.t += dt;
  world.bumps = world.bumps.filter((b) => b.t < ITEM.bumpTime);
}

export function bumpOffset(world, col, row) {
  const b = world.bumps.find((x) => x.col === col && x.row === row);
  return b ? 0 - Math.round(4 * Math.sin((Math.PI * b.t) / ITEM.bumpTime)) : 0;
}
```

- [ ] **Step 5: Wire shooting, fireballs and blocks into the player, interactions and world**

In `src/entities/player.js`, add the import next to the others:

```js
import { Fireball } from './fireball.js';
```

Replace the line `this.ceilingHit = moveBody(b, world.tiles, dt).ceiling;` in `update` with:

```js
    this.ceilingHit = moveBody(b, world.tiles, dt).ceiling;
    if (this.power === 'fire' && input.wasPressed('fire')) this.shoot(world);
```

Add this method to the `Player` class (after `collect`):

```js
  shoot(world) {
    const live = world.entities.filter((e) => e.isFireball && e.alive).length;
    if (live >= PLAYER.maxFireballs) return;
    const b = this.body;
    const dir = this.motor.facing;
    world.spawn(new Fireball(dir > 0 ? b.x + b.w : b.x - 8, b.y + 10, dir));
    world.audio.play('fireball');
  }
```

In `src/interactions.js`, add a fireball pass at the end of `resolveInteractions` (after the shell loop):

```js
  for (const fb of live) {
    if (!fb.isFireball || !fb.alive) continue;
    for (const e of enemies) {
      if (!e.alive || !e.killable || !overlaps(fb.body, e.body)) continue;
      e.knock(Math.sign(fb.body.vx) || 1);
      fb.alive = false;
      addScore(world.session, GAME.scores.fireballKill);
      world.audio.play('kick');
      break;
    }
  }
```

Replace `updateWorld` and `renderWorld` in `src/world.js`, and add the `blocks.js` import at the top (`import { hitBlock, updateBumps, bumpOffset } from './blocks.js';`):

```js
export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  if (player.state === 'dying') {
    player.update(dt, world, input);
    return;
  }
  player.update(dt, world, input);
  if (player.ceilingHit) {
    hitBlock(world, player.ceilingHit.col, player.ceilingHit.row, player);
    player.ceilingHit = null;
  }
  camera.update(player.body.x + player.body.w / 2);
  for (const e of world.entities) if (isLive(world, e)) e.update(dt, world);
  resolveInteractions(world);
  world.entities = world.entities.filter((e) => e.alive);
  updateBumps(world, dt);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  for (const e of world.entities) if (inActiveRange(world.camera, e.body)) e.render(ctx, world.camera, alpha);
  drawTiles(ctx, world.tiles, camX, (c, r) => bumpOffset(world, c, r));
  world.player.render(ctx, world.camera, alpha);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 7: Check it in the browser**

Run: `python3 -m http.server 8000` (background), open http://localhost:8000.
Expected: jumping into a `?` block bumps it, pops a coin (or a mushroom that rises out of the block and walks); the block turns dark. Touching the mushroom makes the player two tiles tall; a big player breaks bricks into four flying pieces while a small player only bumps them. Level 1 has two `M` blocks: the first (in `?BMB?`) gives a mushroom to a small player, and the second (in `BMB`, further right) gives a fire flower once you are big. With the flower, X shoots at most two bouncing fireballs that knock out enemies. Getting hit while big shrinks you and blinks instead of dying. No console errors. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src test
git commit -m "feat: ? blocks, bricks, mushroom, fire flower, fireballs"
```

---

### Task 9: Goal flag, level timer, level completion

**Files:**
- Modify: `src/entities/player.js`, `src/world.js`, `src/render.js`, `test/world.test.js` (append)

**Interfaces:**
- Consumes: `level.flag`, `overlaps`, `GAME.levelTime`, `PLAYER` flag constants.
- Produces:
  - `world.pole = { x, y, w, h }` (x = `flag.col * TILE + 7`, y = `(flag.row - 9) * TILE`, w = 2, h = `10 * TILE`); `world.time` (seconds left, starts at `GAME.levelTime`); `world.flagY` (top of the pennant, slides down while the player slides).
  - `Player` states `'flag'` (sliding down the pole), `'walkout'` (walking right), `'done'` (sequence over); `Player.grabFlag(world, pole)`. The walk-out ends after `PLAYER.walkOutDistance` pixels or `PLAYER.walkOutTimeout` seconds, whichever comes first, so a wall right after the flag cannot trap the player.
  - `updateWorld`: counts `world.time` down only while the player is alive and kills the player at 0; grabs the flag on contact.
  - `render.js`: `drawFlag(ctx, world, camX)`.

- [ ] **Step 1: Write the failing tests**

Append to `test/world.test.js`:

```js
import { PLAYER, TILE } from '../src/constants.js';

function touchPole(world) {
  const pole = world.pole;
  Object.assign(world.player.body, { x: pole.x - 5, y: 120, py: 120, vy: 0 });
  updateWorld(world, DT, idleInput);
}

test('the goal pole spans nine tiles above the flag cell and the flag cell itself', () => {
  const world = makeWorld();
  assert.deepEqual(world.pole, { x: 37 * TILE + 7, y: 2 * TILE, w: 2, h: 10 * TILE });
});

test('touching the pole starts the flag sequence and stops the music', () => {
  const world = makeWorld();
  touchPole(world);
  assert.equal(world.player.state, 'flag');
  assert.ok(world.audio.calls.includes('stopMusic'));
  assert.ok(world.audio.calls.includes('flag'));
});

test('the flag sequence ends in done even when a wall blocks the walk-out', () => {
  const world = makeWorld();
  touchPole(world);
  const flagY0 = world.flagY;
  let steps = 0;
  while (world.player.state !== 'done' && steps < 60 * 8) {
    updateWorld(world, DT, idleInput);
    steps++;
  }
  assert.equal(world.player.state, 'done');
  assert.ok(world.flagY > flagY0, 'the pennant slid down');
  assert.ok(steps / 60 <= PLAYER.walkOutTimeout + 3, `took ${steps} steps`);
});

test('the level timer counts down while playing', () => {
  const world = makeWorld();
  const t0 = world.time;
  run(world, 60);
  assert.ok(Math.abs(world.time - (t0 - 1)) < 1e-6);
});

test('running out of time kills the player', () => {
  const world = makeWorld();
  world.time = 0.01;
  run(world, 3);
  assert.equal(world.time, 0);
  assert.equal(world.player.state, 'dying');
});

test('the timer stops once the flag is grabbed', () => {
  const world = makeWorld();
  touchPole(world);
  const t = world.time;
  run(world, 30);
  assert.equal(world.time, t);
});

test('the world freezes while the player is dying', () => {
  const world = makeWorld({ edit: (g) => { g[11][10] = 'G'; } });
  const g = first(world, 'goomba');
  world.player.die(world);
  const x0 = g.body.x;
  run(world, 30);
  assert.equal(g.body.x, x0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/world.test.js`
Expected: FAIL. `world.pole` is undefined and `player.grabFlag` is not a function.

- [ ] **Step 3: Write the player's flag sequence**

In `src/entities/player.js`:

Update the state comment in the constructor to `// 'alive' | 'dying' | 'dead' | 'flag' | 'walkout' | 'done'` and add these fields at the end of the constructor:

```js
    this.flagBottom = 0;
    this.flagTimer = 0;
    this.walkStartX = 0;
```

In `update`, add the flag branch between the dying branch and the `!== 'alive'` guard:

```js
    if (this.state === 'dying') {
      this.updateDying(dt);
      return;
    }
    if (this.state === 'flag' || this.state === 'walkout') {
      this.updateFlag(dt, world);
      return;
    }
    if (this.state !== 'alive') return;
```

Add these methods after `die(world)`:

```js
  grabFlag(world, pole) {
    if (this.state !== 'alive') return;
    const b = this.body;
    this.state = 'flag';
    b.vx = 0;
    b.vy = 0;
    b.x = pole.x + pole.w / 2 - b.w / 2;
    b.px = b.x;
    this.flagBottom = pole.y + pole.h;
    this.flagTimer = 0;
    world.audio.stopMusic();
    world.audio.play('flag');
  }

  updateFlag(dt, world) {
    const b = this.body;
    this.flagTimer += dt;
    if (this.state === 'flag') {
      b.px = b.x;
      b.py = b.y;
      b.y = Math.min(b.y + PLAYER.flagSlideSpeed * dt, this.flagBottom - b.h);
      if (b.y + b.h >= this.flagBottom) {
        this.state = 'walkout';
        this.flagTimer = 0;
        this.walkStartX = b.x;
        this.motor.facing = 1;
      }
      return;
    }
    b.vx = PLAYER.walkOutSpeed;
    applyGravity(b, dt);
    moveBody(b, world.tiles, dt);
    this.animTime += (dt * Math.abs(b.vx)) / 40;
    if (b.x - this.walkStartX >= PLAYER.walkOutDistance || this.flagTimer >= PLAYER.walkOutTimeout) this.state = 'done';
  }
```

In `render`, replace the pose lines so the slide uses the idle pose:

```js
    let pose = 'idle';
    if (dying) pose = 'jump';
    else if (this.state === 'flag') pose = 'idle';
    else if (!b.onGround) pose = 'jump';
    else if (Math.abs(b.vx) > 4) pose = Math.floor(this.animTime * 3) % 2 ? 'run1' : 'run2';
```

- [ ] **Step 4: Write the flag renderer and world changes**

Add to `src/render.js` (and add `drawSprite` to the existing `./sprites.js` import list if it is not there already; it is):

```js
export function drawFlag(ctx, world, camX) {
  const { pole, flagY } = world;
  const x = Math.round(pole.x - camX);
  ctx.fillStyle = '#58d854';
  ctx.fillRect(x, pole.y, pole.w, pole.h);
  ctx.fillStyle = '#f8b800';
  ctx.fillRect(x - 1, pole.y - 4, 4, 4);
  drawSprite(ctx, 'flag', pole.x - camX - 14, flagY);
}
```

`src/world.js` (full replacement; final version):

```js
// src/world.js
import { TILE, GAME, PLAYER } from './constants.js';
import { createCamera, inActiveRange } from './camera.js';
import { overlaps } from './physics.js';
import { Player } from './entities/player.js';
import { createFromSpawn } from './entities/index.js';
import { drawBackground, drawTiles, drawFlag } from './render.js';
import { resolveInteractions, isLive } from './interactions.js';
import { hitBlock, updateBumps, bumpOffset } from './blocks.js';

export function createWorld({ level, session, audio }) {
  const pole = { x: level.flag.col * TILE + 7, y: (level.flag.row - 9) * TILE, w: 2, h: 10 * TILE };
  const world = {
    level,
    tiles: level.tiles,
    session,
    audio,
    camera: createCamera(level.cols * TILE),
    entities: [],
    bumps: [],
    player: null,
    time: GAME.levelTime,
    pole,
    flagY: pole.y + 4,
    spawn(entity) {
      world.entities.push(entity);
      return entity;
    },
  };
  world.player = new Player(level.start.col * TILE + 2, (level.start.row + 1) * TILE, session.power);
  world.camera.snapTo(world.player.body.x + world.player.body.w / 2);
  for (const spawn of level.spawns) world.spawn(createFromSpawn(spawn));
  return world;
}

export function updateWorld(world, dt, input) {
  const { player, camera } = world;
  if (player.state === 'dying') {
    player.update(dt, world, input);
    return;
  }
  if (player.state === 'alive') {
    world.time = Math.max(0, world.time - dt);
    if (world.time === 0) player.die(world);
  }
  player.update(dt, world, input);
  if (player.ceilingHit) {
    hitBlock(world, player.ceilingHit.col, player.ceilingHit.row, player);
    player.ceilingHit = null;
  }
  if (player.state === 'alive' && overlaps(player.body, world.pole)) player.grabFlag(world, world.pole);
  if (player.state === 'flag') {
    world.flagY = Math.min(world.flagY + PLAYER.flagSlideSpeed * dt, world.pole.y + world.pole.h - 16);
  }
  camera.update(player.body.x + player.body.w / 2);
  for (const e of world.entities) if (isLive(world, e)) e.update(dt, world);
  resolveInteractions(world);
  world.entities = world.entities.filter((e) => e.alive);
  updateBumps(world, dt);
}

export function renderWorld(world, ctx, alpha) {
  const camX = world.camera.renderX(alpha);
  drawBackground(ctx);
  drawFlag(ctx, world, camX);
  for (const e of world.entities) if (inActiveRange(world.camera, e.body)) e.render(ctx, world.camera, alpha);
  drawTiles(ctx, world.tiles, camX, (c, r) => bumpOffset(world, c, r));
  world.player.render(ctx, world.camera, alpha);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 6: Check it in the browser**

Run: `python3 -m http.server 8000` (background), open http://localhost:8000 and run to the end of level 1.
Expected: a green pole with a pennant stands at the end; touching it makes the player slide down while the pennant drops, then walk right and stop. Nothing happens after that yet, because the temporary `main.js` ignores the `done` state; Task 11 adds the level-clear screen. No console errors. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "feat: goal flag sequence and level timer"
```

### Task 10: Audio synth and safe storage

**Files:**
- Create: `src/audio.js`, `src/storage.js`
- Test: `test/audio.test.js`, `test/storage.test.js`

**Interfaces:**
- Produces:
  - `storage.js`: `createStore(storage?, prefix = 'pixel-plumber.') -> { get(key, fallback), set(key, value) }`. Values are JSON; `get` returns `fallback` when the key is missing, the JSON is corrupt, the stored type differs from the fallback's type, storage is `null`, or storage throws. `set` never throws.
  - `audio.js`: `noteFreq(midi) -> Hz`; `SFX` (name -> array of `{ wave, from, to, dur, vol, delay }`); `LEAD`, `BASS` (arrays of `[midiNoteOrNull, beats]`); `createAudio({ AudioContextClass?, store? }) -> { unlock(), play(name), startMusic(), stopMusic(), toggleMute() -> boolean, isMuted() -> boolean, setSuspended(boolean) }`. Without a usable `AudioContextClass`, every method is a safe no-op (`toggleMute`/`isMuted` still track the flag). The mute flag is read from and saved to `store` under `'muted'`. `unlock()` must be called from a user gesture; `startMusic()` called before `unlock()` starts the music once unlocked.
  - SFX names the game uses: `jump coin oneup stomp kick powerup sprout fireball brick bump shrink death flag gameover`.

- [ ] **Step 1: Write the failing tests**

`test/storage.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/storage.js';

const memory = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

test('returns the fallback for a missing key and round-trips a value', () => {
  const store = createStore(memory());
  assert.equal(store.get('hiscore', 0), 0);
  store.set('hiscore', 4200);
  assert.equal(store.get('hiscore', 0), 4200);
});

test('returns the fallback when the stored JSON is corrupt', () => {
  const store = createStore(memory({ 'pixel-plumber.muted': '{not json' }));
  assert.equal(store.get('muted', false), false);
});

test('returns the fallback when the stored type does not match', () => {
  const store = createStore(memory({ 'pixel-plumber.hiscore': '"lots"' }));
  assert.equal(store.get('hiscore', 0), 0);
});

test('never throws when storage throws', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const store = createStore(broken);
  assert.equal(store.get('x', 7), 7);
  assert.doesNotThrow(() => store.set('x', 8));
});

test('works with no storage at all', () => {
  const store = createStore(null);
  assert.equal(store.get('x', 'fallback'), 'fallback');
  assert.doesNotThrow(() => store.set('x', 1));
});
```

`test/audio.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, noteFreq, SFX, LEAD, BASS } from '../src/audio.js';
import { createStore } from '../src/storage.js';

const REQUIRED_SFX = ['jump', 'coin', 'oneup', 'stomp', 'kick', 'powerup', 'sprout', 'fireball', 'brick', 'bump', 'shrink', 'death', 'flag', 'gameover'];
const WAVES = new Set(['square', 'triangle', 'sine', 'sawtooth', 'noise']);

const memory = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

class FakeAudioContext {
  static oscillators = 0;
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }
  createGain() {
    return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n) => n };
  }
  createOscillator() {
    FakeAudioContext.oscillators++;
    return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n) => n, start() {}, stop() {} };
  }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return { buffer: null, connect: (n) => n, start() {}, stop() {} };
  }
  resume() {}
  suspend() {}
}

test('noteFreq follows equal temperament', () => {
  assert.equal(noteFreq(69), 440);
  assert.ok(Math.abs(noteFreq(81) - 880) < 1e-9);
  assert.ok(Math.abs(noteFreq(57) - 220) < 1e-9);
});

test('every sound effect the game uses is defined and well-formed', () => {
  for (const name of REQUIRED_SFX) {
    const parts = SFX[name];
    assert.ok(Array.isArray(parts) && parts.length > 0, `missing SFX ${name}`);
    for (const p of parts) {
      assert.ok(WAVES.has(p.wave), `${name}: bad wave ${p.wave}`);
      assert.ok(p.dur > 0, `${name}: dur`);
      assert.ok(p.vol > 0 && p.vol <= 1, `${name}: vol`);
      assert.ok(p.delay >= 0, `${name}: delay`);
      assert.ok(Number.isFinite(p.from) && Number.isFinite(p.to), `${name}: frequencies`);
    }
  }
});

test('music tracks are well-formed and the lead and bass loop to the same length', () => {
  const beats = (track) => track.reduce((sum, [, b]) => sum + b, 0);
  for (const track of [LEAD, BASS]) {
    for (const [note, b] of track) {
      assert.ok(note === null || Number.isInteger(note), 'note is a MIDI integer or null');
      assert.ok(b > 0);
    }
  }
  assert.equal(beats(LEAD), beats(BASS));
});

test('without WebAudio every method is a safe no-op', () => {
  const audio = createAudio({ AudioContextClass: null });
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play('jump');
    audio.startMusic();
    audio.stopMusic();
    audio.setSuspended(true);
  });
  assert.equal(audio.toggleMute(), true);
  assert.equal(audio.isMuted(), true);
  assert.equal(audio.toggleMute(), false);
});

test('a context that throws on construction does not break the game', () => {
  const Throwing = class { constructor() { throw new Error('blocked'); } };
  const audio = createAudio({ AudioContextClass: Throwing });
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play('coin');
    audio.startMusic();
  });
});

test('nothing sounds before unlock; after unlock a sound creates its tones', () => {
  FakeAudioContext.oscillators = 0;
  const audio = createAudio({ AudioContextClass: FakeAudioContext });
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 0);
  audio.unlock();
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 1);
  audio.play('coin');
  assert.equal(FakeAudioContext.oscillators, 3);
});

test('mute silences sounds and is saved to the store', () => {
  FakeAudioContext.oscillators = 0;
  const store = createStore(memory());
  const audio = createAudio({ AudioContextClass: FakeAudioContext, store });
  audio.unlock();
  assert.equal(audio.toggleMute(), true);
  assert.equal(store.get('muted', false), true);
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 0);
  assert.equal(audio.toggleMute(), false);
  audio.play('jump');
  assert.equal(FakeAudioContext.oscillators, 1);
});

test('the saved mute setting is loaded on startup', () => {
  const store = createStore(memory({ 'pixel-plumber.muted': 'true' }));
  const audio = createAudio({ AudioContextClass: FakeAudioContext, store });
  assert.equal(audio.isMuted(), true);
});

test('music requested before unlock starts once unlocked', () => {
  FakeAudioContext.oscillators = 0;
  const audio = createAudio({ AudioContextClass: FakeAudioContext });
  try {
    audio.startMusic();
    assert.equal(FakeAudioContext.oscillators, 0);
    audio.unlock();
    assert.ok(FakeAudioContext.oscillators >= 3);
  } finally {
    audio.stopMusic();
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/audio.test.js test/storage.test.js`
Expected: FAIL with `Cannot find module '../src/audio.js'` / `'../src/storage.js'`.

- [ ] **Step 3: Write the implementation**

`src/storage.js`:

```js
// src/storage.js
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createStore(storage = defaultStorage(), prefix = 'pixel-plumber.') {
  return {
    get(key, fallback) {
      try {
        const raw = storage.getItem(prefix + key);
        if (raw === null) return fallback;
        const value = JSON.parse(raw);
        return typeof value === typeof fallback ? value : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        storage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // Storage is unavailable or full; the game works without it.
      }
    },
  };
}
```

`src/audio.js`:

```js
// src/audio.js
const MASTER_VOLUME = 0.5;
export const BEAT = 60 / 140;

export function noteFreq(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

const tone = (wave, from, to, dur, vol = 0.12, delay = 0) => ({ wave, from, to, dur, vol, delay });
const arp = (freqs, step, dur, vol = 0.12) => freqs.map((f, i) => tone('square', f, f, dur, vol, i * step));

export const SFX = {
  jump: [tone('square', 260, 620, 0.16)],
  coin: [tone('square', 988, 988, 0.07), tone('square', 1319, 1319, 0.22, 0.12, 0.07)],
  oneup: arp([659, 784, 1319, 1047, 1175, 1568], 0.1, 0.1),
  stomp: [tone('square', 320, 90, 0.1, 0.15)],
  kick: [tone('square', 220, 120, 0.08, 0.15)],
  powerup: arp([523, 659, 784, 1047, 1319, 1568], 0.07, 0.08),
  sprout: [tone('triangle', 200, 700, 0.25, 0.2)],
  fireball: [tone('square', 800, 300, 0.1, 0.1)],
  brick: [tone('noise', 0, 0, 0.14, 0.18)],
  bump: [tone('triangle', 130, 80, 0.09, 0.25)],
  shrink: [tone('square', 700, 200, 0.4)],
  death: [
    tone('square', 500, 500, 0.12, 0.14),
    tone('square', 420, 420, 0.12, 0.14, 0.14),
    tone('square', 350, 350, 0.12, 0.14, 0.28),
    tone('square', 260, 120, 0.5, 0.14, 0.42),
  ],
  flag: arp([784, 988, 1175, 1568, 1976], 0.1, 0.12),
  gameover: [
    tone('triangle', 392, 392, 0.2, 0.2),
    tone('triangle', 330, 330, 0.2, 0.2, 0.22),
    tone('triangle', 262, 262, 0.2, 0.2, 0.44),
    tone('triangle', 196, 98, 0.6, 0.2, 0.66),
  ],
};

// An original four-bar loop in C major: [MIDI note or null for a rest, beats].
export const LEAD = [
  [76, 0.5], [79, 0.5], [81, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 1],
  [74, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [69, 1],
  [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5], [81, 0.5], [79, 0.5], [76, 1],
  [74, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [72, 2],
];
export const BASS = [
  [48, 1], [55, 1], [48, 1], [55, 1],
  [45, 1], [52, 1], [45, 1], [52, 1],
  [41, 1], [48, 1], [41, 1], [48, 1],
  [43, 1], [50, 1], [48, 2],
];

function makeNoiseBuffer(ctx) {
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createAudio({ AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext, store = null } = {}) {
  const supported = typeof AudioContextClass === 'function';
  let muted = store ? store.get('muted', false) : false;
  let ctx = null;
  let master = null;
  let noise = null;
  let timer = null;
  let wantMusic = false;
  const lead = { i: 0, t: 0 };
  const bass = { i: 0, t: 0 };

  function playTone(start, { wave, from, to, dur, vol }) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    gain.connect(master);
    if (wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.connect(gain);
      src.start(start);
      src.stop(start + dur);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + dur);
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + dur);
  }

  function scheduleTrack(track, state, wave, vol) {
    while (state.t < ctx.currentTime + 0.4) {
      const [note, beats] = track[state.i];
      const dur = beats * BEAT;
      if (note !== null) {
        const f = noteFreq(note);
        playTone(state.t, { wave, from: f, to: f, dur: dur * 0.9, vol });
      }
      state.t += dur;
      state.i = (state.i + 1) % track.length;
    }
  }

  function stopTimer() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function beginMusic() {
    stopTimer();
    lead.i = 0;
    bass.i = 0;
    lead.t = bass.t = ctx.currentTime + 0.05;
    const tick = () => {
      scheduleTrack(LEAD, lead, 'square', 0.05);
      scheduleTrack(BASS, bass, 'triangle', 0.1);
    };
    tick();
    timer = setInterval(tick, 100);
  }

  return {
    unlock() {
      if (!supported) return;
      if (!ctx) {
        try {
          ctx = new AudioContextClass();
          master = ctx.createGain();
          master.gain.value = muted ? 0 : MASTER_VOLUME;
          master.connect(ctx.destination);
          noise = makeNoiseBuffer(ctx);
        } catch {
          ctx = null;
          return;
        }
        if (wantMusic) beginMusic();
      }
      if (ctx.state === 'suspended') ctx.resume();
    },

    play(name) {
      if (!ctx || muted) return;
      const parts = SFX[name];
      if (!parts) return;
      const now = ctx.currentTime;
      for (const p of parts) playTone(now + p.delay, p);
    },

    startMusic() {
      wantMusic = true;
      if (ctx) beginMusic();
    },

    stopMusic() {
      wantMusic = false;
      stopTimer();
    },

    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
      if (store) store.set('muted', muted);
      return muted;
    },

    isMuted: () => muted,

    setSuspended(on) {
      if (!ctx) return;
      if (on) ctx.suspend();
      else ctx.resume();
    },
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite. (If the test process does not exit, a test left music running; every music test must call `stopMusic()` in a `finally`.)

- [ ] **Step 5: Commit**

```bash
git add src test
git commit -m "feat: WebAudio synth for effects and music, safe storage wrapper"
```

---

### Task 11: HUD, state machine, game flow, pause, and the real `main.js`

**Files:**
- Create: `src/hud.js`, `src/stateMachine.js`, `src/states.js`
- Modify: `src/main.js` (replace)
- Test: `test/hud.test.js`, `test/stateMachine.test.js`, `test/states.test.js`

**Interfaces:**
- Consumes: `createWorld/updateWorld/renderWorld`, `loadLevel`, `LEVELS`, session functions, `createStore`, `createAudio`, `GAME`.
- Produces:
  - `hud.js`: `formatScore(n, digits = 6)`, `formatTime(seconds) -> 3-digit string (rounded up, never negative)`, `hudItems(session, time, levelName) -> [{ x, label, value }]`, `drawHud(ctx, session, time, levelName)`.
  - `stateMachine.js`: `createMachine(states) -> { name, go(next, payload?), update(dt), render(ctx, alpha) }`. `go` calls the old state's `exit()`, then the new state's `enter(payload)`; an unknown name throws. States are plain objects with optional `enter, exit, update, render`; a state may call `go` from inside `enter` or `update`.
  - `states.js`: `createStates({ input, audio, store, go, levelCount = LEVELS.length, load = loadLevel }) -> { title, playing, levelClear, gameOver, win, error }`. Flow: `title` -(start)-> `playing`; `playing` -(player `dead`, lives left)-> `playing` (same level, fresh world); `playing` -(player `dead`, no lives)-> `gameOver`; `playing` -(player `done`)-> `levelClear` `{ timeLeft }` -> `playing` (next level) or `win`; `gameOver` and `win` -(start)-> `title`; a level that fails to load -> `error { message }`. The time bonus is `ceil(timeLeft) * GAME.timeBonusPerSecond`. The high score is saved (`'hiscore'`) when the game ends or is won.
  - `main.js`: wires input, store, audio, machine; unlocks audio on the first keypress; `M` toggles mute; pauses (and suspends audio) on window blur or when the tab is hidden, resuming on focus.

- [ ] **Step 1: Write the failing tests**

`test/hud.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, formatTime, hudItems } from '../src/hud.js';

test('formatScore pads to six digits, clamps negatives, never truncates', () => {
  assert.equal(formatScore(100), '000100');
  assert.equal(formatScore(-5), '000000');
  assert.equal(formatScore(1234567), '1234567');
});

test('formatTime rounds up to three digits and never goes negative', () => {
  assert.equal(formatTime(299.2), '300');
  assert.equal(formatTime(0), '000');
  assert.equal(formatTime(-1), '000');
});

test('hudItems lists score, coins, lives, world and time', () => {
  const items = hudItems({ score: 1500, coins: 7, lives: 3 }, 123.4, '1-1');
  assert.deepEqual(items.map((i) => [i.label, i.value]), [
    ['SCORE', '001500'], ['COINS', 'x07'], ['LIVES', 'x3'], ['WORLD', '1-1'], ['TIME', '124'],
  ]);
});
```

`test/stateMachine.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachine } from '../src/stateMachine.js';

test('go calls exit on the old state then enter on the new one with the payload', () => {
  const log = [];
  const m = createMachine({
    a: { enter: () => log.push('enter a'), exit: () => log.push('exit a') },
    b: { enter: (p) => log.push(`enter b ${p.x}`) },
  });
  m.go('a');
  m.go('b', { x: 7 });
  assert.deepEqual(log, ['enter a', 'exit a', 'enter b 7']);
  assert.equal(m.name, 'b');
});

test('update and render go to the current state', () => {
  const log = [];
  const m = createMachine({ a: { update: (dt) => log.push(`u${dt}`), render: (ctx, alpha) => log.push(`r${ctx}${alpha}`) } });
  m.update(1);
  m.go('a');
  m.update(2);
  m.render('C', 0.5);
  assert.deepEqual(log, ['u2', 'rC0.5']);
});

test('an unknown state throws', () => {
  assert.throws(() => createMachine({}).go('nope'), /Unknown state: nope/);
});

test('a state can switch to another state from inside enter', () => {
  const m = createMachine({
    a: { enter: () => m.go('b') },
    b: {},
  });
  m.go('a');
  assert.equal(m.name, 'b');
});
```

`test/states.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStates } from '../src/states.js';
import { createStore } from '../src/storage.js';
import { parseLevel, LevelError } from '../src/level.js';
import { GAME, PLAYER } from '../src/constants.js';
import { levelText, mockAudio, idleInput } from './helpers.js';

const DT = 1 / 60;

const memory = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

// The player starts over a nine-tile pit, so every life ends quickly.
const pitLevel = () => parseLevel('pit', levelText({ edit: (g) => { for (let c = 0; c <= 8; c++) { g[12][c] = '.'; g[13][c] = '.'; } } }));

function setup(overrides = {}) {
  const calls = [];
  const audio = mockAudio();
  const store = createStore(memory());
  const states = createStates({
    input: idleInput, audio, store, go: (name, payload) => calls.push([name, payload]), levelCount: 1, load: pitLevel, ...overrides,
  });
  return { states, calls, audio, store };
}

test('pressing start on the title screen begins the game', () => {
  const { states, calls } = setup({ input: { isDown: () => false, wasPressed: (a) => a === 'start' } });
  states.title.update(DT);
  assert.deepEqual(calls, [['playing', undefined]]);
});

test('three deaths end the game; the first two restart the level', () => {
  const { states, calls } = setup();
  states.title.enter();
  for (let life = 0; life < GAME.startLives; life++) {
    states.playing.enter();
    for (let i = 0; i < 60 * (PLAYER.deathTotal + 4) && calls.length === life; i++) states.playing.update(DT);
  }
  assert.deepEqual(calls.map((c) => c[0]), ['playing', 'playing', 'gameOver']);
});

test('a level that fails to load shows the error state with its message', () => {
  const { states, calls } = setup({ load: () => { throw new LevelError('bad level: row 3, col 5'); } });
  states.playing.enter();
  assert.deepEqual(calls, [['error', { message: 'bad level: row 3, col 5' }]]);
});

test('clearing the last level pays the time bonus, goes to win, and saves the high score', () => {
  const { states, calls, store } = setup({ levelCount: 1 });
  states.title.enter();
  states.playing.enter();
  states.levelClear.enter({ timeLeft: 100.2 });
  for (let i = 0; i < 60 * (GAME.clearScreenTime + 1) && calls.length === 0; i++) states.levelClear.update(DT);
  assert.equal(calls[0][0], 'win');
  states.win.enter();
  assert.equal(store.get('hiscore', 0), 101 * GAME.timeBonusPerSecond);
});

test('clearing a level that is not the last goes to the next level', () => {
  const { states, calls } = setup({ levelCount: 2 });
  states.title.enter();
  states.playing.enter();
  states.levelClear.enter({ timeLeft: 10 });
  for (let i = 0; i < 60 * (GAME.clearScreenTime + 1) && calls.length === 0; i++) states.levelClear.update(DT);
  assert.equal(calls[0][0], 'playing');
});

test('game over waits a moment, then start returns to the title', () => {
  const { states, calls } = setup({ input: { isDown: () => false, wasPressed: (a) => a === 'start' } });
  states.gameOver.enter();
  states.gameOver.update(DT);
  assert.equal(calls.length, 0);
  for (let i = 0; i < 70; i++) states.gameOver.update(DT);
  assert.equal(calls[0][0], 'title');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test`
Expected: FAIL with `Cannot find module '../src/hud.js'` (and `stateMachine.js`, `states.js`).

- [ ] **Step 3: Write the HUD and the state machine**

`src/hud.js`:

```js
// src/hud.js
export const formatScore = (n, digits = 6) => String(Math.max(0, Math.floor(n))).padStart(digits, '0');
export const formatTime = (seconds) => String(Math.max(0, Math.ceil(seconds))).padStart(3, '0');

export function hudItems(session, time, levelName) {
  return [
    { x: 8, label: 'SCORE', value: formatScore(session.score) },
    { x: 72, label: 'COINS', value: `x${String(session.coins).padStart(2, '0')}` },
    { x: 120, label: 'LIVES', value: `x${session.lives}` },
    { x: 168, label: 'WORLD', value: levelName },
    { x: 216, label: 'TIME', value: formatTime(time) },
  ];
}

export function drawHud(ctx, session, time, levelName) {
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  for (const item of hudItems(session, time, levelName)) {
    ctx.fillText(item.label, item.x, 12);
    ctx.fillText(item.value, item.x, 22);
  }
}
```

`src/stateMachine.js`:

```js
// src/stateMachine.js
export function createMachine(states) {
  let current = null;
  let name = null;
  return {
    get name() {
      return name;
    },
    go(next, payload) {
      if (!states[next]) throw new Error(`Unknown state: ${next}`);
      current?.exit?.();
      name = next;
      current = states[next];
      current.enter?.(payload);
    },
    update(dt) {
      current?.update?.(dt);
    },
    render(ctx, alpha) {
      current?.render?.(ctx, alpha);
    },
  };
}
```

- [ ] **Step 4: Write the game states**

`src/states.js`:

```js
// src/states.js
import { VIEW_W, VIEW_H, GAME } from './constants.js';
import { LEVELS, loadLevel } from './levels/index.js';
import { createSession, addScore, loseLife, advanceLevel } from './session.js';
import { createWorld, updateWorld, renderWorld } from './world.js';
import { drawBackground } from './render.js';
import { drawSprite } from './sprites.js';
import { drawHud, formatScore } from './hud.js';

function text(ctx, str, x, y, { align = 'center', color = '#fff', size = 8 } = {}) {
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function drawGroundStrip(ctx) {
  for (let c = 0; c < VIEW_W / 16; c++) {
    drawSprite(ctx, 'ground', c * 16, VIEW_H - 32);
    drawSprite(ctx, 'ground', c * 16, VIEW_H - 16);
  }
}

function wrap(str, width) {
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createStates({ input, audio, store, go, levelCount = LEVELS.length, load = loadLevel }) {
  let session = createSession();
  let world = null;
  let hiScore = store.get('hiscore', 0);
  let timer = 0;
  let bonus = 0;
  let message = '';

  const saveHiScore = () => {
    if (session.score > hiScore) {
      hiScore = session.score;
      store.set('hiscore', hiScore);
    }
  };

  return {
    title: {
      enter() {
        session = createSession();
        audio.stopMusic();
      },
      update() {
        if (input.wasPressed('start')) go('playing');
      },
      render(ctx) {
        drawBackground(ctx);
        drawGroundStrip(ctx);
        drawSprite(ctx, 'big_idle', 120, VIEW_H - 64);
        text(ctx, 'PIXEL PLUMBER', VIEW_W / 2, 64, { size: 16 });
        text(ctx, 'PRESS ENTER OR SPACE', VIEW_W / 2, 96);
        text(ctx, 'ARROWS/AD MOVE   SPACE JUMP', VIEW_W / 2, 120);
        text(ctx, 'SHIFT RUN   X FIRE   M MUTE', VIEW_W / 2, 132);
        text(ctx, `HI ${formatScore(hiScore)}`, VIEW_W / 2, 156);
      },
    },

    playing: {
      enter() {
        try {
          world = createWorld({ level: load(session.levelIndex), session, audio });
        } catch (e) {
          go('error', { message: e.message });
          return;
        }
        audio.startMusic();
      },
      update(dt) {
        updateWorld(world, dt, input);
        const p = world.player;
        if (p.state === 'dead') {
          if (loseLife(session) <= 0) go('gameOver');
          else go('playing');
        } else if (p.state === 'done') {
          session.power = p.power;
          go('levelClear', { timeLeft: world.time });
        }
      },
      render(ctx, alpha) {
        renderWorld(world, ctx, alpha);
        drawHud(ctx, session, world.time, world.level.name);
      },
    },

    levelClear: {
      enter({ timeLeft }) {
        timer = 0;
        bonus = Math.ceil(timeLeft) * GAME.timeBonusPerSecond;
        addScore(session, bonus);
      },
      update(dt) {
        timer += dt;
        if (timer < GAME.clearScreenTime) return;
        if (advanceLevel(session, levelCount)) go('playing');
        else go('win');
      },
      render(ctx, alpha) {
        renderWorld(world, ctx, alpha);
        drawHud(ctx, session, 0, world.level.name);
        text(ctx, 'COURSE CLEAR!', VIEW_W / 2, 90, { size: 16 });
        text(ctx, `TIME BONUS ${bonus}`, VIEW_W / 2, 110);
      },
    },

    gameOver: {
      enter() {
        timer = 0;
        audio.stopMusic();
        saveHiScore();
        audio.play('gameover');
      },
      update(dt) {
        timer += dt;
        if (timer > 1 && input.wasPressed('start')) go('title');
      },
      render(ctx) {
        drawBackground(ctx);
        text(ctx, 'GAME OVER', VIEW_W / 2, 90, { size: 16 });
        text(ctx, `SCORE ${formatScore(session.score)}`, VIEW_W / 2, 116);
        text(ctx, `HI ${formatScore(hiScore)}`, VIEW_W / 2, 130);
        text(ctx, 'PRESS ENTER OR SPACE', VIEW_W / 2, 156);
      },
    },

    win: {
      enter() {
        timer = 0;
        audio.stopMusic();
        saveHiScore();
        audio.play('oneup');
      },
      update(dt) {
        timer += dt;
        if (timer > 1 && input.wasPressed('start')) go('title');
      },
      render(ctx) {
        drawBackground(ctx);
        drawGroundStrip(ctx);
        text(ctx, 'YOU WIN!', VIEW_W / 2, 80, { size: 16 });
        text(ctx, `SCORE ${formatScore(session.score)}`, VIEW_W / 2, 110);
        text(ctx, `HI ${formatScore(hiScore)}`, VIEW_W / 2, 124);
        text(ctx, 'PRESS ENTER OR SPACE', VIEW_W / 2, 150);
      },
    },

    error: {
      enter(payload) {
        message = payload?.message ?? 'Unknown error';
        audio.stopMusic();
      },
      update() {
        if (input.wasPressed('start')) go('title');
      },
      render(ctx) {
        ctx.fillStyle = '#400';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        text(ctx, 'LEVEL ERROR', VIEW_W / 2, 40, { size: 16, color: '#f88' });
        wrap(message, 48).forEach((line, i) => text(ctx, line, VIEW_W / 2, 70 + i * 12, { color: '#fcc' }));
      },
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite.

- [ ] **Step 6: Write the real `main.js` and play the whole game**

`src/main.js` (full replacement):

```js
// src/main.js
import { VIEW_W, VIEW_H } from './constants.js';
import { startLoop } from './loop.js';
import { createInput } from './input.js';
import { createMachine } from './stateMachine.js';
import { createStates } from './states.js';
import { createStore } from './storage.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const input = createInput(window);
const store = createStore();
const audio = createAudio({ store });
const machine = createMachine(
  createStates({ input, audio, store, go: (name, payload) => machine.go(name, payload) }),
);

let paused = false;
function setPaused(value) {
  if (paused === value) return;
  paused = value;
  audio.setSuspended(value);
  if (!value) loop.resetClock();
}
window.addEventListener('blur', () => setPaused(true));
window.addEventListener('focus', () => setPaused(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
});
window.addEventListener('keydown', () => audio.unlock());

const loop = startLoop({
  update(dt) {
    if (paused) return;
    if (input.wasPressed('mute')) audio.toggleMute();
    machine.update(dt);
    input.endFrame();
  },
  render(alpha) {
    machine.render(ctx, alpha);
    if (paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    }
  },
});

machine.go('title');
```

Run: `python3 -m http.server 8000` (background), open http://localhost:8000.
Expected (by hand, with sound on):
- The title screen shows the name, controls, and `HI 000000`; Enter or Space starts level 1 with music playing.
- The HUD shows score, coins, lives, world `1-1` and a counting-down time; coins, stomps and blocks update the score; the 100th coin (or a debug edit of `session.coins` in `createSession`, then reverted) gives a life with a jingle.
- Jump, coin, stomp, kick, power-up, block, fireball, shrink and death sounds all play; `M` mutes and unmutes and the choice survives a page reload.
- Dying shows the hop animation and restarts the level; three deaths show GAME OVER, and Enter returns to the title with the high score kept after a reload.
- Reaching the flag plays the jingle, then `COURSE CLEAR!` with a time bonus, then `YOU WIN!` (only level 1 exists until Task 12).
- Switching to another tab or window shows PAUSED and silences the music, and play resumes on return without a time jump.
- To see the error screen, temporarily add a stray `X` to `src/levels/level1.js`, reload, press Enter: the message names `1-1`, a row and a column. Revert the edit.
- The browser console shows no errors. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add src test
git commit -m "feat: HUD, state machine, title/win/game-over screens, audio wiring, pause on blur"
```

---

### Task 12: Levels 2 and 3, level sanity tests, final verification

**Files:**
- Create: `src/levels/level2.js`, `src/levels/level3.js`, `test/levels.test.js`
- Modify: `src/levels/index.js`

**Interfaces:**
- Consumes: `LEVELS`, `loadLevel`, `isSolid`, `T`.
- Produces: `LEVELS` with three entries named `'1-1'`, `'1-2'`, `'1-3'`.

- [ ] **Step 1: Write the failing tests**

`test/levels.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, loadLevel } from '../src/levels/index.js';
import { T, isSolid } from '../src/tiles.js';

const levels = () => LEVELS.map((_, i) => loadLevel(i));

test('there are three levels, named 1-1, 1-2 and 1-3', () => {
  assert.deepEqual(LEVELS.map((l) => l.name), ['1-1', '1-2', '1-3']);
});

test('the player start and the flag both stand on solid ground', () => {
  for (const level of levels()) {
    assert.equal(isSolid(level.tiles.get(level.start.col, level.start.row + 1)), true, `${level.name} start`);
    assert.equal(isSolid(level.tiles.get(level.flag.col, level.flag.row + 1)), true, `${level.name} flag`);
  }
});

test('ground gaps are at most three tiles wide (jumpable)', () => {
  for (const level of levels()) {
    let run = 0;
    for (let c = 0; c < level.cols; c++) {
      const pit = !isSolid(level.tiles.get(c, 12)) && !isSolid(level.tiles.get(c, 13));
      run = pit ? run + 1 : 0;
      assert.ok(run <= 3, `${level.name}: pit of ${run} tiles ending at column ${c + 1}`);
    }
  }
});

test('pipes are at most three tiles tall (jumpable)', () => {
  for (const level of levels()) {
    for (let c = 0; c < level.cols; c++) {
      let height = 0;
      for (let r = 0; r < level.rows; r++) {
        height = level.tiles.get(c, r) === T.PIPE ? height + 1 : 0;
        assert.ok(height <= 3, `${level.name}: pipe taller than 3 at column ${c + 1}`);
      }
    }
  }
});

test('enemies start on solid ground', () => {
  for (const level of levels()) {
    for (const s of level.spawns.filter((x) => x.type !== 'coin')) {
      assert.equal(isSolid(level.tiles.get(s.col, s.row + 1)), true, `${level.name}: ${s.type} at col ${s.col + 1}`);
    }
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test/levels.test.js`
Expected: FAIL on "there are three levels" (only `1-1` exists); the other tests pass for level 1.

- [ ] **Step 3: Add the levels**

`src/levels/level2.js` (72 columns x 14 rows):

```js
// src/levels/level2.js
export default `
........................................................................
........................................................................
........................................................................
........................................................................
........................................CCCC............................
........................................BBBB............................
........................................................................
........................................................................
......B?M?B.............BBMBB.........BB...........................#....
...................................................-........||....##....
....................||........---...........................||...###....
..P.......G.........||K...G.........K.......G.K.........G...||..####F...
##############...#############...#################...###################
##############...#############...#################...###################
`;
```

`src/levels/level3.js` (96 columns x 14 rows):

```js
// src/levels/level3.js
export default `
................................................................................................
................................................................................................
................................................................................................
................................................................................................
................................................................................................
................................................................................................
................................................................................................
..........................................................................................#.....
......?M?.....................BMB?B......................................................##.....
............CCC...........CCC.................||........---.....||......CCC.............###.....
..................||....................---...||................||.....................####.....
..P.....G.......K.||..GG............G.K.......||..G.K.G.......G.||..K.G.........G...K.#####.F...
############...###########...###########...#############...#############...#####################
############...###########...###########...#############...#############...#####################
`;
```

`src/levels/index.js` (replace):

```js
// src/levels/index.js
import { parseLevel } from '../level.js';
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';

export const LEVELS = [
  { name: '1-1', text: level1 },
  { name: '1-2', text: level2 },
  { name: '1-3', text: level3 },
];

export function loadLevel(index) {
  const { name, text } = LEVELS[index];
  return parseLevel(name, text);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test`
Expected: PASS for the whole suite, including `every registered level parses` for all three levels.

- [ ] **Step 5: Verify the finished game**

Use the `superpowers:verification-before-completion` skill: run each command and read its output before claiming success.

1. Run `node --test`. Expected: every test passes, zero failures, and the process exits.
2. Run `git status`. Expected: a clean working tree apart from files you intend to commit.
3. Run `python3 -m http.server 8000` (background) and play the manual checklist from the spec in a browser:
   title screen -> level 1 -> collect a mushroom and a fire flower -> shoot a fireball -> stomp a goomba and a koopa -> die and lose a life -> reach the flag -> play level 2 and level 3 -> win screen -> mute toggle.
   Also confirm: the one-way platforms in levels 2 and 3 can be jumped up through and landed on; every pit is jumpable; the `COURSE CLEAR!` screen leads to the next level; the high score and mute setting survive a reload; the console shows no errors. Stop the server.
4. Report in plain words which checklist items you saw working and which you could not check (for example, audio you could not hear).

- [ ] **Step 6: Commit**

```bash
git add src test
git commit -m "feat: levels 1-2 and 1-3 with sanity tests"
```
