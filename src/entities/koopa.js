// src/entities/koopa.js
import { TILE, ENEMY, PHYS } from '../constants.js';
import { createBody } from '../physics.js';
import { stepWalker, stepKnocked } from './walker.js';
import { classifyContact, stompEnemy } from '../combat.js';
import { drawBodySprite } from '../render.js';

export class Koopa {
  constructor(col, row) {
    this.kind = 'koopa';
    this.isEnemy = true;
    this.alive = true;
    this.body = createBody(col * TILE + 1, (row + 1) * TILE - 14, 14, 14);
    this.dir = -1;
    this.speed = ENEMY.walkSpeed;
    this.state = 'walk'; // 'walk' | 'shell' | 'slide' | 'knocked'
    this.kickCooldown = 0;
    this.anim = 0;
  }

  get killable() {
    return this.state !== 'knocked';
  }

  get sliding() {
    return this.state === 'slide';
  }

  update(dt, world) {
    if (this.state === 'knocked') {
      stepKnocked(this, dt);
      return;
    }
    this.kickCooldown = Math.max(0, this.kickCooldown - dt);
    this.anim += dt;
    this.speed = this.state === 'walk' ? ENEMY.walkSpeed : this.state === 'slide' ? ENEMY.shellSpeed : 0;
    stepWalker(this, dt, world);
  }

  stomp() {
    this.state = 'shell';
    this.body.vx = 0;
    this.kickCooldown = ENEMY.kickCooldown;
  }

  kick(dir) {
    this.state = 'slide';
    this.dir = dir;
    this.kickCooldown = ENEMY.kickCooldown;
  }

  knock(dir) {
    this.state = 'knocked';
    this.body.vx = dir * ENEMY.knockSpeed;
    this.body.vy = -ENEMY.knockVel;
  }

  touchPlayer(world, player, vy = player.body.vy) {
    if (this.state === 'knocked' || this.kickCooldown > 0) return;
    const kind = classifyContact(player.body, this.body, vy);
    if (this.state === 'shell') {
      this.kick(player.body.x + player.body.w / 2 < this.body.x + this.body.w / 2 ? 1 : -1);
      if (kind === 'stomp') {
        player.body.vy = -PHYS.bounceVel;
        player.motor.jumping = false;
      }
      world.audio.play('kick');
      return;
    }
    if (kind === 'stomp') stompEnemy(world, player, this);
    else player.hurt(world);
  }

  render(ctx, camera, alpha) {
    const name = this.state === 'walk' ? (Math.floor(this.anim * 5) % 2 ? 'koopa_a' : 'koopa_b') : 'koopa_shell';
    drawBodySprite(ctx, camera, alpha, this.body, name, {
      flip: this.state === 'walk' && this.dir > 0,
      flipY: this.state === 'knocked',
    });
  }
}
