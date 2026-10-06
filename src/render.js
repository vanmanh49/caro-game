// src/render.js
import { TILE, VIEW_H } from './constants.js';
import { view } from './viewport.js';
import { T } from './tiles.js';
import { drawSprite, getSprite } from './sprites.js';
import { renderPos } from './physics.js';

const TILE_SPRITES = {
  [T.GROUND]: 'ground', [T.BRICK]: 'brick', [T.QBLOCK]: 'qblock', [T.USED]: 'used', [T.PIPE]: 'pipe', [T.ONEWAY]: 'oneway',
};

export function drawBackground(ctx) {
  ctx.fillStyle = '#5c94fc';
  ctx.fillRect(0, 0, view.w, VIEW_H);
}

export function drawTiles(ctx, tiles, camX, bumpOffset = () => 0) {
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(tiles.cols - 1, Math.floor((camX + view.w) / TILE));
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

export function drawFlag(ctx, world, camX) {
  const { pole, flagY } = world;
  const x = Math.round(pole.x - camX);
  ctx.fillStyle = '#58d854';
  ctx.fillRect(x, pole.y, pole.w, pole.h);
  ctx.fillStyle = '#f8b800';
  ctx.fillRect(x - 1, pole.y - 4, 4, 4);
  drawSprite(ctx, 'flag', pole.x - camX - 14, flagY);
}
