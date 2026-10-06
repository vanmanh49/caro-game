// src/entities/coin.js
import { TILE, GAME } from '../constants.js';
import { createBody } from '../physics.js';
import { addCoin, addScore } from '../session.js';
import { drawBodySprite } from '../render.js';

export function collectCoin(world) {
  const extraLife = addCoin(world.session);
  addScore(world.session, GAME.scores.coin);
  world.audio.play(extraLife ? 'oneup' : 'coin');
}

export class Coin {
  constructor(col, row) {
    this.kind = 'coin';
    this.isPickup = true;
    this.canPickup = true;
    this.alive = true;
    this.body = createBody(col * TILE + 4, row * TILE + 2, 8, 12);
    this.anim = 0;
  }

  update(dt) {
    this.anim += dt;
  }

  pickup(world) {
    this.alive = false;
    collectCoin(world);
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, Math.floor(this.anim * 6) % 2 ? 'coin_a' : 'coin_b');
  }
}
