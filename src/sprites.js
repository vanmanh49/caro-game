// src/sprites.js
import { PALETTE, SPRITES } from './spriteData.js';
import { view } from './viewport.js';

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

const snap = (v, scale) => Math.round(v * scale) / scale;

export function drawSprite(ctx, name, x, y, { flip = false, flipY = false, swap = null } = {}) {
  const img = getSprite(name, swap);
  // Snap both edges to device pixels so neighbouring tiles meet without seams at any scale.
  const X = snap(Math.round(x), view.sx);
  const Y = snap(Math.round(y), view.sy);
  const w = snap(Math.round(x) + img.width, view.sx) - X;
  const h = snap(Math.round(y) + img.height, view.sy) - Y;
  if (!flip && !flipY) {
    ctx.drawImage(img, X, Y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(X + (flip ? w : 0), Y + (flipY ? h : 0));
  ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}
