// src/entities/powerup.js
import { TILE, ITEM } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker } from './walker.js';
import { drawBodySprite } from '../render.js';

export class Powerup {
  constructor(type, col, row) {
    this.kind = type;
    this.type = type; // 'mushroom' | 'fireflower'
    this.isPickup = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, row * TILE + 2, 14, 14);
    this.startY = row * TILE + 2;
    this.endY = row * TILE - 14;
    this.t = 0;
    this.rising = true;
    this.dir = 1;
    this.speed = ITEM.mushroomSpeed;
  }

  get canPickup() {
    return !this.rising;
  }

  update(dt, world) {
    const b = this.body;
    if (this.rising) {
      this.t += dt;
      const k = Math.min(1, this.t / ITEM.riseTime);
      b.px = b.x;
      b.py = b.y;
      b.y = this.startY + (this.endY - this.startY) * k;
      if (k >= 1) this.rising = false;
      return;
    }
    if (this.type === 'mushroom') stepWalker(this, dt, world);
  }

  pickup(world, player) {
    player.collect(this.type, world);
    this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, this.type);
  }
}
