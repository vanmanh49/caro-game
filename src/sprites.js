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
