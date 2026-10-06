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
