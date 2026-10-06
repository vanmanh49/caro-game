import { test } from 'node:test';
import assert from 'node:assert/strict';
import { T, isSolid } from '../src/tiles.js';
import { makeMap } from './helpers.js';

test('isSolid: ground, brick, ? block, used block and pipe are solid', () => {
  for (const t of [T.GROUND, T.BRICK, T.QBLOCK, T.USED, T.PIPE]) assert.equal(isSolid(t), true);
});

test('isSolid: empty and one-way are not solid', () => {
  assert.equal(isSolid(T.EMPTY), false);
  assert.equal(isSolid(T.ONEWAY), false);
});

test('get reads tiles and set writes them', () => {
  const m = makeMap(['..', '#.']);
  assert.equal(m.get(0, 1), T.GROUND);
  m.set(1, 0, T.BRICK);
  assert.equal(m.get(1, 0), T.BRICK);
});

test('left and right of the map are solid walls; above and below are empty', () => {
  const m = makeMap(['..', '..']);
  assert.equal(m.get(-1, 0), T.GROUND);
  assert.equal(m.get(2, 0), T.GROUND);
  assert.equal(m.get(0, -1), T.EMPTY);
  assert.equal(m.get(0, 2), T.EMPTY);
});

test('takeContents returns the contents once, peekContents does not consume', () => {
  const m = makeMap(['?'], { '0,0': 'mushroom' });
  assert.equal(m.peekContents(0, 0), 'mushroom');
  assert.equal(m.takeContents(0, 0), 'mushroom');
  assert.equal(m.takeContents(0, 0), null);
});
