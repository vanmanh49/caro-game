// src/blocks.js
import { T } from './tiles.js';
import { GAME, ITEM } from './constants.js';
import { addScore } from './session.js';
import { collectCoin } from './entities/coin.js';
import { Powerup } from './entities/powerup.js';
import { CoinPop } from './entities/coinpop.js';
import { spawnDebris } from './entities/debris.js';

function bump(world, col, row) {
  world.bumps.push({ col, row, t: 0 });
}

export function hitBlock(world, col, row, player) {
  const { tiles } = world;
  const tile = tiles.get(col, row);
  if (tile === T.BRICK) {
    if (player.power === 'small') {
      bump(world, col, row);
      world.audio.play('bump');
      return;
    }
    tiles.set(col, row, T.EMPTY);
    addScore(world.session, GAME.scores.brick);
    world.audio.play('brick');
    spawnDebris(world, col, row);
  } else if (tile === T.QBLOCK) {
    const contents = tiles.takeContents(col, row) ?? 'coin';
    tiles.set(col, row, T.USED);
    bump(world, col, row);
    if (contents === 'coin') {
      collectCoin(world);
      world.spawn(new CoinPop(col, row));
    } else {
      world.spawn(new Powerup(player.power === 'small' ? 'mushroom' : 'fireflower', col, row));
      world.audio.play('sprout');
    }
  } else if (tile === T.USED) {
    bump(world, col, row);
    world.audio.play('bump');
  }
}

export function updateBumps(world, dt) {
  for (const b of world.bumps) b.t += dt;
  world.bumps = world.bumps.filter((b) => b.t < ITEM.bumpTime);
}

export function bumpOffset(world, col, row) {
  const b = world.bumps.find((x) => x.col === col && x.row === row);
  return b ? 0 - Math.round(4 * Math.sin((Math.PI * b.t) / ITEM.bumpTime)) : 0;
}
