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
