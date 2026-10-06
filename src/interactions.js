// src/interactions.js
import { GAME } from './constants.js';
import { overlaps } from './physics.js';
import { inActiveRange } from './camera.js';
import { addScore } from './session.js';

export function isLive(world, entity) {
  return entity.alive && (entity.alwaysActive || inActiveRange(world.camera, entity.body));
}

export function resolveInteractions(world) {
  const { player } = world;
  const live = world.entities.filter((e) => isLive(world, e));
  const enemies = live.filter((e) => e.isEnemy);

  if (player.state === 'alive') {
    const vy = player.body.vy; // a stomp bounce must not turn later contacts this pass into side hits
    for (const e of live) {
      if (player.state !== 'alive') break;
      if (!e.alive || !overlaps(player.body, e.body)) continue;
      if (e.isEnemy) e.touchPlayer(world, player, vy);
      else if (e.isPickup && e.canPickup) e.pickup(world, player);
    }
  }

  for (const shell of enemies) {
    if (!shell.alive || !shell.sliding) continue;
    for (const other of enemies) {
      if (other === shell || !other.alive || !other.killable || !overlaps(shell.body, other.body)) continue;
      other.knock(shell.dir);
      addScore(world.session, GAME.scores.shellKill);
      world.audio.play('kick');
    }
  }
}
