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
