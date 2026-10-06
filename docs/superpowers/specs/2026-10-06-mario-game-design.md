# Mario-Style Platformer: Design

Date: 2026-10-06

## 1. Goal and scope

An original Mario-style platformer that runs in the browser, with no build step and no external assets.

**In scope**
- Run and jump with variable jump height; stomping enemies; coins
- ? blocks that release power-ups: mushroom (big) and fire flower (fireballs)
- Multiple levels (3) with a goal flag and automatic progression
- Sound effects and background music generated in code with WebAudio
- Pixel-art sprites defined in code and rendered to canvas
- HUD: score, coins, lives, world, timer

**Out of scope**
- Touch and mobile controls
- Nintendo characters, names, music, and assets (this is an original game with Mario-like mechanics)
- Image or audio files

**Success criteria**
Open the game in a browser, play through three levels with tight controls, collect power-ups, lose and gain lives, reach the end, and see a win screen.

## 2. Architecture

Vanilla JavaScript with ES modules. No dependencies and no build tooling. ES modules need an HTTP origin, so the game is served with `python3 -m http.server 8000`.

```
index.html            canvas + <script type="module" src="src/main.js">
package.json          only "type": "module" and the test script
README.md             how to run and play
src/
  main.js             boot; owns the state machine (title -> playing -> level-clear -> game-over -> win)
  loop.js             fixed-timestep loop (60 Hz update, render every frame)
  constants.js        all tuning values (gravity, speeds, jump, timers)
  input.js            keyboard state: held keys + "pressed this frame" edges
  physics.js          gravity, movement integration, tile collision (axis-separated)
  camera.js           horizontal follow, clamped to level bounds
  level.js            parses text grids into a tile map + entity spawn list; validates
  levels/
    index.js          ordered list of levels
    level1.js level2.js level3.js    each exports a text grid
  entities/           player, goomba, koopa, coin, mushroom, fireflower, fireball
  sprites.js          pixel-art definitions, pre-rendered to offscreen canvases
  audio.js            WebAudio synth: SFX + looping chiptune track
  hud.js              score, coins, lives, world, timer
test/                 node --test suites for the pure-logic modules
```

**Principles**
- Each module has one job and depends only on modules "below" it. `physics.js` knows nothing about the player; `audio.js` knows nothing about entities.
- Entities share one interface: `update(dt, world)`, `render(ctx, camera)`, and a bounding box. The world is the tile map plus the entity list; entities reach each other only through it.
- Entities trigger sounds through event-style calls such as `audio.play('jump')`.
- Logic modules (`physics`, `level`, player state, scoring) do not touch the DOM so they can be unit-tested in Node.

**Game loop**
Fixed timestep (60 Hz) so physics is identical on any display refresh rate; rendering interpolates between updates. The frame delta is clamped to a maximum. Each frame `main.js` calls the current state's `update(dt)` and `render(ctx)`; only the `playing` state runs physics and entities.

## 3. Player movement and controls

| Action | Keys |
|---|---|
| Move | Arrow keys or A/D |
| Jump | Space, W, or Up |
| Run | Shift |
| Fireball | X (fire state only) |
| Mute | M |

- Horizontal movement uses acceleration and friction, not instant speed. Holding Shift raises the speed cap. Reversing direction causes a short skid.
- Jump height is variable: releasing the jump key early cuts upward velocity. Gravity is stronger when falling than when rising.
- **Coyote time:** a jump is still allowed for about 100 ms after leaving a ledge.
- **Jump buffering:** a jump pressed about 100 ms before landing fires on landing.
- All tuning values live in `constants.js`.

## 4. Collision

- Collision is resolved against the tile grid, X axis first, then Y axis, to avoid snagging on tile seams.
- Tile types: solid ground, breakable brick, ? block (coin or power-up), used (empty) block, pipe, one-way platform.
- Hitting a block from below bumps it. A big or fire player breaks bricks; a small player only bumps them.
- Entity-vs-entity uses AABB overlap. Contact with an enemy while moving downward and above its center is a **stomp**. Any other contact hurts the player.

## 5. Level format

Levels are text grids, one character per tile:

```
export default `
..........................................
.....?B?.................C..............F.
.......................G.........K.......
P.....................#####..........|...
##########....########################...
`;
```

| Char | Meaning |
|---|---|
| `.` | empty |
| `#` | solid ground |
| `B` | brick |
| `?` | ? block with a coin |
| `M` | ? block with a mushroom (becomes a fire flower when the player is already big) |
| `C` | coin |
| `G` | goomba |
| `K` | koopa |
| `P` | player start |
| `F` | goal flag |
| `\|` | pipe |
| `-` | one-way platform (solid only when landing on it from above) |

All levels are exactly 14 rows tall (the camera scrolls horizontally only). `level.js` parses the grid into a tile map and a spawn list. A validator requires exactly one `P` and one `F`, 14 rows, equal row lengths, and no unknown characters; errors name the level, row (1-based), and column (1-based). Levels are listed in `levels/index.js`; clearing one advances to the next, and the last leads to the win screen.

## 6. Player state and entities

**Player states**

| State | Size | Abilities | When hit |
|---|---|---|---|
| `small` | 1 tile | run, jump | dies |
| `big` | 2 tiles | breaks bricks | becomes `small`, about 2 s invincibility (blinking) |
| `fire` | 2 tiles | fireballs (max 2 on screen) | becomes `small`, about 2 s invincibility |

- Mushroom: `small` -> `big`. Fire flower: `small` or `big` -> `fire`. A mushroom picked up in `fire` state gives points only.
- Growing and shrinking keep the feet position fixed. If there is no room to grow, the player stays small.
- Death plays a pop-up animation, freezes the world, then loses a life. Zero lives means game over. Falling below the level is death.

**Enemies and items**
- **Goomba:** walks, turns at walls, squashed by a stomp.
- **Koopa:** a stomp turns it into a shell; kicking the shell sends it sliding and it kills enemies it hits; another stomp stops it.
- **Fireball:** bounces on the ground, kills enemies, disappears on walls.
- **Mushroom:** emerges from a ? block and walks. **Fire flower:** emerges and stays put.
- **Coins:** counted on pickup; 100 coins give an extra life. Consecutive stomps give increasing points.
- **Flag:** input stops, the player slides down with a jingle, a time bonus is added, and the next level loads.

## 7. Audio

- `audio.js` builds all sound with WebAudio oscillators and noise bursts: jump, coin, stomp, power-up, fireball, brick break, death, flag, game over.
- Music is a short looping chiptune melody on square and triangle waves, scheduled ahead of time to stay in tempo.
- The audio context is created on the first keypress at the title screen (browser autoplay policy).
- `M` toggles mute; the choice is saved in `localStorage`.

## 8. Error handling

- A malformed level shows its validation message on screen instead of failing silently.
- If WebAudio is unavailable or blocked, every audio call is a no-op and the game plays silently.
- The game pauses on tab blur, and the loop clamps the maximum frame delta.
- `localStorage` access (mute, high score) is wrapped in try/catch with defaults.

## 9. Testing

Unit tests use Node's built-in runner (`node --test`), with no dependencies:
- `physics`: gravity, variable jump height, coyote time, jump buffering, collision on all sides, no snagging at tile seams.
- `level`: parsing, spawn extraction, validator errors on bad grids.
- Player state transitions: small/big/fire, damage and invincibility, no growth when there is no room.
- Stomp vs. side-hit detection and koopa shell behavior.
- Scoring: coin counting, 100-coin extra life, stomp chains.

Rendering, audio, and game feel are checked manually in a browser with this checklist: title screen -> level 1 -> collect a mushroom and a fire flower -> shoot a fireball -> stomp a goomba and a koopa -> die and lose a life -> reach the flag -> play level 3 -> win screen -> mute toggle.

## 10. Delivery and milestones

Everything lives in the project root. `README.md` documents:

```
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no `npm install` and no build step.

Implementation milestones, each leaving the game playable:
1. Loop, input, and a player on flat ground
2. Physics, tiles, and the camera
3. Level loader and the first level
4. Enemies and stomping
5. ? blocks and power-ups
6. Flag, level progression, and HUD
7. Audio and polish
