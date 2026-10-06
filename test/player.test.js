import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/entities/player.js';
import { createSession } from '../src/session.js';
import { PLAYER, GAME, TILE } from '../src/constants.js';
import { makeMap, mockAudio, idleInput } from './helpers.js';

const DT = 1 / 60;
const open = () => makeMap(['..........', '..........', '..........', '##########']);
const tight = () => makeMap(['..........', '##########', '..........', '##########']);
const worldOn = (tiles) => ({ tiles, session: createSession(), audio: mockAudio() });
const playerAt = (power) => new Player(20, 3 * TILE, power);

test('a small player that is hurt dies and the music stops', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  assert.equal(p.hurt(world), true);
  assert.equal(p.state, 'dying');
  assert.deepEqual(world.audio.calls, ['stopMusic', 'death']);
});

test('a big player that is hurt shrinks, blinks, and cannot be hurt again at once', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  assert.equal(p.hurt(world), true);
  assert.equal(p.power, 'small');
  assert.equal(p.body.h, 15);
  assert.equal(p.body.y + p.body.h, 3 * TILE, 'feet stay put');
  assert.equal(p.invincible, PLAYER.invincibleTime);
  assert.equal(p.hurt(world), false);
  assert.equal(p.state, 'alive');
});

test('invincibility counts down while updating', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  p.hurt(world);
  for (let i = 0; i < 60 * PLAYER.invincibleTime + 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.invincible, 0);
  assert.equal(p.vulnerable, true);
});

test('a mushroom grows a small player and awards points', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.collect('mushroom', world);
  assert.equal(p.power, 'big');
  assert.equal(p.body.h, 31);
  assert.equal(world.session.score, GAME.scores.powerUp);
  assert.ok(world.audio.calls.includes('powerup'));
});

test('a fire flower makes the player fire; a mushroom as fire gives points only', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  p.collect('fireflower', world);
  assert.equal(p.power, 'fire');
  p.collect('mushroom', world);
  assert.equal(p.power, 'fire');
  assert.equal(world.session.score, GAME.scores.powerUp * 2);
});

test('with no room to grow the player stays small but still gets the points', () => {
  const world = worldOn(tight());
  const p = playerAt('small');
  p.collect('mushroom', world);
  assert.equal(p.power, 'small');
  assert.equal(p.body.h, 15);
  assert.equal(world.session.score, GAME.scores.powerUp);
});

test('falling below the level kills the player', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.body.y = world.tiles.rows * TILE + 40;
  p.update(DT, world, idleInput);
  assert.equal(p.state, 'dying');
});

test('the death animation ends with state dead after the configured time', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.die(world);
  for (let i = 0; i < 60 * PLAYER.deathTotal + 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.state, 'dead');
});

test('standing on the ground resets the stomp chain', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.stompChain = 3;
  for (let i = 0; i < 5; i++) p.update(DT, world, idleInput);
  assert.equal(p.stompChain, 0);
});

test('dying clears invincibility so the death animation is visible', () => {
  const world = worldOn(open());
  const p = playerAt('big');
  p.hurt(world);
  assert.ok(p.invincible > 0);
  p.die(world);
  assert.equal(p.state, 'dying');
  assert.equal(p.invincible, 0);
});

test('die is idempotent', () => {
  const world = worldOn(open());
  const p = playerAt('small');
  p.die(world);
  p.die(world);
  assert.deepEqual(world.audio.calls, ['stopMusic', 'death']);
  assert.equal(p.state, 'dying');
});
