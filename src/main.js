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
