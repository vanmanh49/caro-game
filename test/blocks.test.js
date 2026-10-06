import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitBlock, updateBumps, bumpOffset } from '../src/blocks.js';
import { updateWorld } from '../src/world.js';
import { resolveInteractions } from '../src/interactions.js';
import { T } from '../src/tiles.js';
import { GAME, ITEM } from '../src/constants.js';
import { makeWorld, idleInput } from './helpers.js';

const DT = 1 / 60;
const blocks = (g) => { g[8][5] = 'B'; g[8][6] = '?'; g[8][7] = 'M'; };
const kinds = (world) => world.entities.map((e) => e.kind);

test('a small player only bumps a brick', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 5, 8, world.player);
  assert.equal(world.tiles.get(5, 8), T.BRICK);
  assert.equal(world.bumps.length, 1);
  assert.equal(world.session.score, 0);
  assert.ok(world.audio.calls.includes('bump'));
});

test('a big player breaks a brick into debris and scores', () => {
  const world = makeWorld({ power: 'big', edit: blocks });
  hitBlock(world, 5, 8, world.player);
  assert.equal(world.tiles.get(5, 8), T.EMPTY);
  assert.equal(world.session.score, GAME.scores.brick);
  assert.equal(kinds(world).filter((k) => k === 'debris').length, 4);
  assert.ok(world.audio.calls.includes('brick'));
});

test('a coin block pays one coin, becomes used, and pays nothing more', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 6, 8, world.player);
  assert.equal(world.tiles.get(6, 8), T.USED);
  assert.equal(world.session.coins, 1);
  assert.equal(world.session.score, GAME.scores.coin);
  assert.ok(kinds(world).includes('coinpop'));
  hitBlock(world, 6, 8, world.player);
  assert.equal(world.session.coins, 1);
});

test('a mushroom block gives a mushroom to a small player and a fire flower to a big one', () => {
  const small = makeWorld({ edit: blocks });
  hitBlock(small, 7, 8, small.player);
  assert.ok(kinds(small).includes('mushroom'));
  assert.equal(small.tiles.get(7, 8), T.USED);
  assert.ok(small.audio.calls.includes('sprout'));

  const big = makeWorld({ power: 'big', edit: blocks });
  hitBlock(big, 7, 8, big.player);
  assert.ok(kinds(big).includes('fireflower'));
});

test('a bump animates up and back, then clears', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 5, 8, world.player);
  updateBumps(world, ITEM.bumpTime / 2);
  assert.equal(bumpOffset(world, 5, 8), -4);
  updateBumps(world, 1);
  assert.equal(bumpOffset(world, 5, 8), 0);
  assert.equal(world.bumps.length, 0);
});

test('a power-up rises out of the block before it can be picked up, then a mushroom walks', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 7, 8, world.player);
  const m = world.entities.find((e) => e.kind === 'mushroom');
  assert.equal(m.canPickup, false);
  for (let i = 0; i < Math.ceil((ITEM.riseTime + 0.1) / DT); i++) updateWorld(world, DT, idleInput);
  assert.equal(m.canPickup, true);
  const x0 = m.body.x;
  for (let i = 0; i < 20; i++) updateWorld(world, DT, idleInput);
  assert.ok(m.body.x > x0);
});

test('picking up a risen mushroom grows the player and removes the item', () => {
  const world = makeWorld({ edit: blocks });
  hitBlock(world, 7, 8, world.player);
  const m = world.entities.find((e) => e.kind === 'mushroom');
  m.rising = false;
  m.body.x = world.player.body.x;
  m.body.y = world.player.body.y;
  resolveInteractions(world);
  assert.equal(world.player.power, 'big');
  assert.equal(m.alive, false);
});

test('jumping into a ? block from below releases its power-up', () => {
  const world = makeWorld({ edit: (g) => { g[8][5] = 'M'; } });
  world.player.body.x = 5 * 16 + 2;
  world.player.body.px = world.player.body.x;
  let n = 0;
  const input = { isDown: (a) => a === 'jump', wasPressed: (a) => a === 'jump' && n === 0 };
  for (n = 0; n < 60; n++) updateWorld(world, DT, input);
  assert.equal(world.tiles.get(5, 8), T.USED);
  assert.ok(kinds(world).includes('mushroom'));
});
