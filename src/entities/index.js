// src/entities/index.js
import { Goomba } from './goomba.js';
import { Koopa } from './koopa.js';
import { Coin } from './coin.js';

export function createFromSpawn(spawn) {
  switch (spawn.type) {
    case 'goomba': return new Goomba(spawn.col, spawn.row);
    case 'koopa': return new Koopa(spawn.col, spawn.row);
    case 'coin': return new Coin(spawn.col, spawn.row);
    default: throw new Error(`Unknown spawn type: ${spawn.type}`);
  }
}
