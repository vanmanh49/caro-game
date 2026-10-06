import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBody, applyGravity, moveBody } from '../src/physics.js';
import { createMotor, stepMotor } from '../src/movement.js';
import { PHYS, TILE } from '../src/constants.js';
import { makeMap } from './helpers.js';

const DT = 1 / 60;
const GROUND_ROW = 8;
const flat = () => makeMap([...Array(GROUND_ROW).fill('.'.repeat(60)), '#'.repeat(60)]);
const standing = () => createBody(16, GROUND_ROW * TILE - 15, 12, 15);
const idle = { left: false, right: false, run: false, jumpHeld: false, jumpPressed: false };

function tick(body, motor, tiles, cmd = {}) {
  const r = stepMotor(body, motor, { ...idle, ...cmd }, DT);
  applyGravity(body, DT);
  const m = moveBody(body, tiles, DT);
  return { ...r, ...m };
}

test('accelerates to the walk cap and no further', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  for (let i = 0; i < 120; i++) tick(b, m, tiles, { right: true });
  assert.ok(Math.abs(b.vx - PHYS.walkMax) < 1e-9);
});

test('holding run raises the cap, releasing run slows back to walk speed', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  for (let i = 0; i < 180; i++) tick(b, m, tiles, { right: true, run: true });
  assert.ok(Math.abs(b.vx - PHYS.runMax) < 1e-9);
  for (let i = 0; i < 60; i++) tick(b, m, tiles, { right: true });
  assert.ok(Math.abs(b.vx - PHYS.walkMax) < 1e-9);
});

test('friction brings the player to a stop on the ground', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  b.vx = PHYS.walkMax;
  for (let i = 0; i < 60; i++) tick(b, m, tiles);
  assert.equal(b.vx, 0);
});

test('reversing on the ground skids with extra deceleration', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  b.vx = 80;
  tick(b, m, tiles, { left: true });
  assert.equal(m.skidding, true);
  assert.ok(Math.abs(b.vx - (80 - PHYS.skidDecel * DT)) < 1e-9);
  assert.equal(m.facing, -1);
});

function peakRise(holdFrames) {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  const startY = b.y;
  let minY = b.y;
  for (let i = 0; i < 90; i++) {
    tick(b, m, tiles, { jumpPressed: i === 0, jumpHeld: i < holdFrames });
    minY = Math.min(minY, b.y);
  }
  return startY - minY;
}

test('jump height is variable: a held jump goes much higher than a tap', () => {
  const full = peakRise(90);
  const tap = peakRise(1);
  assert.ok(full > 3 * TILE && full < 5 * TILE, `full jump rose ${full}px`);
  assert.ok(tap > 0 && tap < full * 0.6, `tap rose ${tap}px, full ${full}px`);
});

test('coyote time: a jump just after leaving a ledge still works, a late one does not', () => {
  const b = createBody(0, 0, 12, 15), m = createMotor();
  b.onGround = true;
  stepMotor(b, m, idle, DT);
  b.onGround = false;
  for (let i = 0; i < 3; i++) stepMotor(b, m, idle, DT);
  const early = stepMotor(b, m, { ...idle, jumpPressed: true, jumpHeld: true }, DT);
  assert.equal(early.jumped, true);
  assert.ok(b.vy < 0);

  const b2 = createBody(0, 0, 12, 15), m2 = createMotor();
  b2.onGround = true;
  stepMotor(b2, m2, idle, DT);
  b2.onGround = false;
  for (let i = 0; i < 12; i++) stepMotor(b2, m2, idle, DT);
  const late = stepMotor(b2, m2, { ...idle, jumpPressed: true, jumpHeld: true }, DT);
  assert.equal(late.jumped, false);
});

test('jump buffering: pressed shortly before landing fires on landing, pressed too early does not', () => {
  const press = { ...idle, jumpPressed: true, jumpHeld: true };
  const hold = { ...idle, jumpHeld: true };

  const b = createBody(0, 0, 12, 15), m = createMotor();
  b.onGround = false;
  stepMotor(b, m, press, DT);
  for (let i = 0; i < 2; i++) stepMotor(b, m, hold, DT);
  b.onGround = true;
  const r = stepMotor(b, m, hold, DT);
  assert.equal(r.jumped, true);
  assert.ok(b.vy < 0);

  const b2 = createBody(0, 0, 12, 15), m2 = createMotor();
  b2.onGround = false;
  stepMotor(b2, m2, press, DT);
  for (let i = 0; i < 10; i++) stepMotor(b2, m2, hold, DT);
  b2.onGround = true;
  assert.equal(stepMotor(b2, m2, hold, DT).jumped, false);
});

test('holding jump after landing does not jump again; only a new press does', () => {
  const tiles = flat(), b = standing(), m = createMotor();
  tick(b, m, tiles);
  const groundY = b.y;
  for (let i = 0; i < 30; i++) {
    const r = tick(b, m, tiles, { jumpHeld: true });
    assert.equal(r.jumped, false);
    assert.equal(b.y, groundY);
  }
  const r = tick(b, m, tiles, { jumpHeld: true, jumpPressed: true });
  assert.equal(r.jumped, true);
});

test('air control is weaker than ground control', () => {
  const ground = createBody(0, 0, 12, 15); ground.onGround = true;
  const air = createBody(0, 0, 12, 15); air.onGround = false;
  stepMotor(ground, createMotor(), { ...idle, right: true }, DT);
  stepMotor(air, createMotor(), { ...idle, right: true }, DT);
  assert.ok(air.vx < ground.vx);
});
