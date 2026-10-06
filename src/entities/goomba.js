// src/entities/goomba.js
import { TILE, ENEMY } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker, stepKnocked } from './walker.js';
import { classifyContact, stompEnemy } from '../combat.js';
import { drawBodySprite } from '../render.js';

export class Goomba {
  constructor(col, row) {
    this.kind = 'goomba';
    this.isEnemy = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.dir = -1;
    this.speed = ENEMY.walkSpeed;
    this.state = 'walk'; // 'walk' | 'squashed' | 'knocked'
    this.timer = 0;
    this.anim = 0;
  }

  get killable() {
    return this.state === 'walk';
  }

  update(dt, world) {
    if (this.state === 'knocked') {
      stepKnocked(this, dt);
      return;
    }
    if (this.state === 'squashed') {
      this.timer += dt;
      if (this.timer >= ENEMY.squashTime) this.alive = false;
      return;
    }
    this.anim += dt;
    stepWalker(this, dt, world);
  }

  stomp() {
    this.state = 'squashed';
    this.timer = 0;
    this.body.vx = 0;
  }

  knock(dir) {
    this.state = 'knocked';
    this.body.vx = dir * 60;
    this.body.vy = -ENEMY.knockVel;
  }

  touchPlayer(world, player, vy = player.body.vy) {
    if (this.state !== 'walk') return;
    if (classifyContact(player.body, this.body, vy) === 'stomp') stompEnemy(world, player, this);
    else player.hurt(world);
  }

  render(ctx, camera, alpha) {
    const name = this.state === 'squashed' ? 'goomba_flat' : Math.floor(this.anim * 6) % 2 ? 'goomba_a' : 'goomba_b';
    drawBodySprite(ctx, camera, alpha, this.body, name, { flipY: this.state === 'knocked' });
  }
}
