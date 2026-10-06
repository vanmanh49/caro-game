// src/movement.js
import { PHYS } from './constants.js';

export function createMotor() {
  return { coyote: 0, buffer: 0, facing: 1, jumping: false, skidding: false };
}

export function stepMotor(body, motor, cmd, dt) {
  motor.coyote = body.onGround ? PHYS.coyote : Math.max(0, motor.coyote - dt);
  motor.buffer = cmd.jumpPressed ? PHYS.buffer : Math.max(0, motor.buffer - dt);
  if (body.onGround) motor.jumping = false;

  const dir = (cmd.right ? 1 : 0) - (cmd.left ? 1 : 0);
  const max = cmd.run ? PHYS.runMax : PHYS.walkMax;
  motor.skidding = false;

  if (dir !== 0) {
    motor.facing = dir;
    if (body.onGround && body.vx * dir < 0) {
      body.vx += dir * PHYS.skidDecel * dt;
      motor.skidding = true;
    } else if (body.vx * dir < max) {
      body.vx += dir * (body.onGround ? PHYS.accel : PHYS.airAccel) * dt;
      if (body.vx * dir > max) body.vx = dir * max;
    } else {
      body.vx -= dir * Math.min(PHYS.friction * dt, body.vx * dir - max);
    }
  } else if (body.onGround) {
    const drop = Math.min(Math.abs(body.vx), PHYS.friction * dt);
    body.vx -= Math.sign(body.vx) * drop;
  }

  let jumped = false;
  if (motor.buffer > 0 && motor.coyote > 0) {
    body.vy = -PHYS.jumpVel;
    motor.coyote = 0;
    motor.buffer = 0;
    motor.jumping = true;
    jumped = true;
  }
  if (motor.jumping && !cmd.jumpHeld && body.vy < -PHYS.jumpCutVel) body.vy = -PHYS.jumpCutVel;

  return { jumped };
}
