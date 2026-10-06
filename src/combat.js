// src/combat.js
import { PHYS, GAME } from './constants.js';
import { addScore } from './session.js';

export function classifyContact(playerBody, enemyBody, vy = playerBody.vy) {
  const falling = vy > 0;
  const wasAbove = playerBody.py + playerBody.h <= enemyBody.y + enemyBody.h / 2;
  return falling && wasAbove ? 'stomp' : 'side';
}

export function stompScore(chain) {
  const table = GAME.scores.stomp;
  return table[Math.min(chain, table.length - 1)];
}

export function stompEnemy(world, player, enemy) {
  enemy.stomp(world);
  player.body.vy = -PHYS.bounceVel;
  player.motor.jumping = false;
  addScore(world.session, stompScore(player.stompChain));
  player.stompChain += 1;
  world.audio.play('stomp');
}
