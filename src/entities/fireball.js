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
