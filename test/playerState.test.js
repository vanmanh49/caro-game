import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeOf, applyPowerUp, applyHit, resizeBody, canResize } from '../src/playerState.js';
import { createBody } from '../src/physics.js';
import { TILE } from '../src/constants.js';
import { makeMap } from './helpers.js';

test('sizes: small is one tile, big and fire are two', () => {
  assert.equal(sizeOf('small').h, 15);
  assert.equal(sizeOf('big').h, 31);
  assert.equal(sizeOf('fire').h, 31);
});

test('power-ups: mushroom grows, fire flower gives fire, mushroom never downgrades fire', () => {
  assert.equal(applyPowerUp('small', 'mushroom'), 'big');
  assert.equal(applyPowerUp('big', 'mushroom'), 'big');
  assert.equal(applyPowerUp('fire', 'mushroom'), 'fire');
  assert.equal(applyPowerUp('small', 'fireflower'), 'fire');
  assert.equal(applyPowerUp('big', 'fireflower'), 'fire');
  assert.throws(() => applyPowerUp('small', 'banana'));
});

test('hits: small dies; big and fire shrink to small with invincibility', () => {
  assert.deepEqual(applyHit('small'), { power: 'dead', invincible: false });
  assert.deepEqual(applyHit('big'), { power: 'small', invincible: true });
  assert.deepEqual(applyHit('fire'), { power: 'small', invincible: true });
});

test('resizeBody keeps the feet where they were', () => {
  const b = createBody(10, 50, 12, 15);
  resizeBody(b, sizeOf('big'));
  assert.equal(b.y + b.h, 65);
  assert.equal(b.h, 31);
  assert.equal(b.py, b.y);
  resizeBody(b, sizeOf('small'));
  assert.equal(b.y + b.h, 65);
  assert.equal(b.h, 15);
});

test('canResize: true in open space, false under a one-tile-high ceiling', () => {
  const open = makeMap(['..........', '..........', '..........', '##########']);
  const small = createBody(20, 3 * TILE - 15, 12, 15);
  assert.equal(canResize(open, small, sizeOf('big')), true);

  const tight = makeMap(['..........', '##########', '..........', '##########']);
  const small2 = createBody(20, 3 * TILE - 15, 12, 15);
  assert.equal(canResize(tight, small2, sizeOf('big')), false);
  assert.equal(canResize(tight, small2, sizeOf('small')), true);
});
