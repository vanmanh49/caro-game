// src/entities/player.js
import { PLAYER, GAME, TILE } from '../constants.js';
import { createBody, applyGravity, moveBody } from '../physics.js';
import { createMotor, stepMotor } from '../movement.js';
import { sizeOf, applyPowerUp, applyHit, resizeBody, canResize } from '../playerState.js';
import { addScore } from '../session.js';
import { FIRE_SWAP } from '../sprites.js';
import { drawBodySprite } from '../render.js';

export class Player {
  constructor(x, bottomY, power = 'small') {
    const size = sizeOf(power);
    this.kind = 'player';
    this.body = createBody(x, bottomY - size.h, size.w, size.h);
    this.motor = createMotor();
    this.power = power;
    this.state = 'alive'; // 'alive' | 'dying' | 'dead'
    this.invincible = 0;
    this.stompChain = 0;
    this.animTime = 0;
    this.deathTimer = 0;
    this.hopped = false;
    this.ceilingHit = null;
  }

  get vulnerable() {
    return this.state === 'alive' && this.invincible <= 0;
  }

  update(dt, world, input) {
    if (this.state === 'dying') {
      this.updateDying(dt);
      return;
    }
    if (this.state !== 'alive') return;
    const b = this.body;
    const cmd = {
      left: input.isDown('left'),
      right: input.isDown('right'),
      run: input.isDown('run'),
      jumpHeld: input.isDown('jump'),
      jumpPressed: input.wasPressed('jump'),
    };
    const { jumped } = stepMotor(b, this.motor, cmd, dt);
    if (jumped) world.audio.play('jump');
    applyGravity(b, dt);
    this.ceilingHit = moveBody(b, world.tiles, dt).ceiling;
    if (b.onGround) this.stompChain = 0;
    this.invincible = Math.max(0, this.invincible - dt);
    this.animTime += (dt * Math.abs(b.vx)) / 40;
    if (b.y > world.tiles.rows * TILE + 16) this.die(world);
  }

  updateDying(dt) {
    const b = this.body;
    b.px = b.x;
    b.py = b.y;
    this.deathTimer += dt;
    if (this.deathTimer >= PLAYER.deathPause) {
      if (!this.hopped) {
        b.vy = -PLAYER.deathHopVel;
        this.hopped = true;
      }
      b.vy += PLAYER.deathGravity * dt;
      b.y += b.vy * dt;
    }
    if (this.deathTimer >= PLAYER.deathTotal) this.state = 'dead';
  }

  die(world) {
    if (this.state !== 'alive') return;
    this.state = 'dying';
    this.invincible = 0; // a frozen blink phase would hide the death animation
    this.deathTimer = 0;
    this.hopped = false;
    this.body.vx = 0;
    this.body.vy = 0;
    world.audio.stopMusic();
    world.audio.play('death');
  }

  hurt(world) {
    if (!this.vulnerable) return false;
    const next = applyHit(this.power);
    if (next.power === 'dead') {
      this.die(world);
      return true;
    }
    this.changePower(next.power, world.tiles);
    this.invincible = PLAYER.invincibleTime;
    world.audio.play('shrink');
    return true;
  }

  changePower(power, tiles) {
    const size = sizeOf(power);
    if (size.h > this.body.h && !canResize(tiles, this.body, size)) return false;
    resizeBody(this.body, size);
    this.power = power;
    return true;
  }

  collect(item, world) {
    const next = applyPowerUp(this.power, item);
    if (next !== this.power) this.changePower(next, world.tiles);
    addScore(world.session, GAME.scores.powerUp);
    world.audio.play('powerup');
  }

  render(ctx, camera, alpha) {
    if (this.state === 'dead') return;
    if (this.invincible > 0 && Math.floor(this.invincible * 20) % 2 === 1) return;
    const b = this.body;
    const dying = this.state === 'dying';
    const size = dying || this.power === 'small' ? 'small' : 'big';
    let pose = 'idle';
    if (dying || !b.onGround) pose = 'jump';
    else if (Math.abs(b.vx) > 4) pose = Math.floor(this.animTime * 3) % 2 ? 'run1' : 'run2';
    drawBodySprite(ctx, camera, alpha, b, `${size}_${pose}`, {
      flip: this.motor.facing < 0,
      swap: this.power === 'fire' && !dying ? FIRE_SWAP : null,
    });
  }
}
