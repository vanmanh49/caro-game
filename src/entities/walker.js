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
