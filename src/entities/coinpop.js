// src/entities/coinpop.js
import { TILE, ITEM } from '../constants.js';
import { createBody } from '../physics.js';
import { drawBodySprite } from '../render.js';

export class CoinPop {
  constructor(col, row) {
    this.kind = 'coinpop';
    this.alwaysActive = true;
    this.alive = true;
    this.baseY = row * TILE - 4;
    this.body = createBody(col * TILE + 4, this.baseY, 8, 12);
    this.t = 0;
  }

  update(dt) {
    const b = this.body;
    this.t += dt;
    const k = Math.min(1, this.t / ITEM.coinPopTime);
    b.px = b.x;
    b.py = b.y;
    b.y = this.baseY - 40 * Math.sin(Math.PI * k);
    if (k >= 1) this.alive = false;
  }

  render(ctx, camera, alpha) {
    drawBodySprite(ctx, camera, alpha, this.body, Math.floor(this.t * 14) % 2 ? 'coin_a' : 'coin_b');
  }
}
