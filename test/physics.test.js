import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBody, applyGravity, moveBody, overlaps, renderPos } from '../src/physics.js';
import { TILE, PHYS } from '../src/constants.js';
import { makeMap } from './helpers.js';

const DT = 1 / 60;
const step = (body, tiles) => {
  applyGravity(body, DT);
  return moveBody(body, tiles, DT);
};

test('a falling body lands on the ground and stays there', () => {
  const tiles = makeMap(['..........', '..........', '..........', '##########']);
  const b = createBody(20, 0, 12, 15);
  for (let i = 0; i < 120; i++) step(b, tiles);
  assert.equal(b.y, 3 * TILE - 15);
  assert.equal(b.onGround, true);
  assert.equal(b.vy, 0);
});

test('gravity is stronger falling than rising and is capped', () => {
  const rising = createBody(0, 0, 12, 15); rising.vy = -100;
  const falling = createBody(0, 0, 12, 15); falling.vy = 100;
  applyGravity(rising, DT);
  applyGravity(falling, DT);
  assert.ok(rising.vy - -100 < falling.vy - 100);
  const fast = createBody(0, 0, 12, 15); fast.vy = 1000;
  applyGravity(fast, DT);
  assert.equal(fast.vy, PHYS.maxFall);
});

test('walking into a wall stops at the wall and reports it', () => {
  const tiles = makeMap(['..........', '..........', '.....#....', '##########']);
  const b = createBody(20, 3 * TILE - 15, 12, 15);
  let hit = null;
  for (let i = 0; i < 120 && !hit; i++) {
    b.vx = 100;
    const r = step(b, tiles);
    if (r.wall) hit = r;
  }
  assert.equal(hit.wall, 1);
  assert.equal(b.x, 5 * TILE - 12);
  assert.equal(b.vx, 0);
});

test('walking across many ground tiles never snags on a seam', () => {
  const tiles = makeMap(['.'.repeat(40), '.'.repeat(40), '.'.repeat(40), '#'.repeat(40)]);
  const b = createBody(4, 3 * TILE - 15, 12, 15);
  for (let i = 0; i < 200; i++) {
    b.vx = 100;
    const r = step(b, tiles);
    assert.equal(r.wall, 0);
    assert.equal(b.y, 3 * TILE - 15);
  }
  assert.ok(b.x > 300);
});

test('the map edges act as walls', () => {
  const tiles = makeMap(['..........', '..........', '..........', '##########']);
  const left = createBody(0, 3 * TILE - 15, 12, 15);
  left.vx = -100;
  assert.equal(step(left, tiles).wall, -1);
  assert.equal(left.x, 0);
  const right = createBody(10 * TILE - 12, 3 * TILE - 15, 12, 15);
  right.vx = 100;
  assert.equal(step(right, tiles).wall, 1);
  assert.equal(right.x, 10 * TILE - 12);
});

test('hitting a block from below reports it and stops upward motion', () => {
  const tiles = makeMap(['..........', '..B.......', '..........', '..........', '..........', '##########']);
  const b = createBody(34, 5 * TILE - 15, 12, 15);
  b.vy = -300;
  let ceiling = null;
  for (let i = 0; i < 60 && !ceiling; i++) ceiling = step(b, tiles).ceiling;
  assert.deepEqual(ceiling, { col: 2, row: 1 });
  assert.equal(b.y, 2 * TILE);
  assert.equal(b.vy, 0);
});

test('a head straddling two blocks hits only the one it overlaps most', () => {
  const tiles = makeMap(['..........', '...BB.....', '..........', '..........', '..........', '##########']);
  const b = createBody(60, 5 * TILE - 15, 12, 15); // spans x 60..72: 4px over col 3, 8px over col 4
  b.vy = -300;
  let ceiling = null;
  for (let i = 0; i < 60 && !ceiling; i++) ceiling = step(b, tiles).ceiling;
  assert.deepEqual(ceiling, { col: 4, row: 1 });
});

test('one-way platforms let a body rise through and land on top', () => {
  const tiles = makeMap(['..........', '..........', '...---....', '..........', '..........', '##########']);
  const b = createBody(50, 5 * TILE - 15, 12, 15);
  b.vy = -300;
  for (let i = 0; i < 200; i++) {
    const r = step(b, tiles);
    assert.equal(r.ceiling, null);
  }
  assert.equal(b.onGround, true);
  assert.equal(b.y, 2 * TILE - 15);
});

test('moving above the top of the map is allowed (no ceiling there)', () => {
  const tiles = makeMap(['..........', '..........', '##########']);
  const b = createBody(20, -20, 12, 15);
  b.vy = -100;
  const r = moveBody(b, tiles, DT);
  assert.equal(r.ceiling, null);
  assert.ok(b.y < -20);
});

test('a body with no floor keeps falling and is never grounded', () => {
  const tiles = makeMap(['..........', '..........', '..........']);
  const b = createBody(20, 0, 12, 15);
  for (let i = 0; i < 120; i++) step(b, tiles);
  assert.ok(b.y > 3 * TILE);
  assert.equal(b.onGround, false);
});

test('overlaps: touching edges do not overlap, intersecting boxes do', () => {
  const a = createBody(0, 0, 10, 10);
  assert.equal(overlaps(a, createBody(10, 0, 10, 10)), false);
  assert.equal(overlaps(a, createBody(9, 9, 10, 10)), true);
});

test('renderPos interpolates between the previous and current position', () => {
  const b = createBody(0, 0, 10, 10);
  b.x = 10; b.y = 20;
  assert.deepEqual(renderPos(b, 0.5), { x: 5, y: 10 });
  assert.deepEqual(renderPos(b, 1), { x: 10, y: 20 });
});
