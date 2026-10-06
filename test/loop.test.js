import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepper } from '../src/loop.js';

const STEP = 1 / 60;

test('runs one update per STEP of elapsed time', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(STEP + 0.0001, () => n++);
  assert.equal(n, 1);
});

test('carries leftover time into the next frame', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(0.01, () => n++);
  assert.equal(n, 0);
  s.advance(0.01, () => n++);
  assert.equal(n, 1);
});

test('clamps a huge frame delta', () => {
  const s = createStepper(STEP, 0.25);
  let n = 0;
  s.advance(10, () => n++);
  assert.ok(n >= 14 && n <= 15, `ran ${n} updates`);
});

test('returns the interpolation alpha in [0, 1)', () => {
  const s = createStepper(STEP, 0.25);
  const alpha = s.advance(STEP / 2, () => {});
  assert.ok(Math.abs(alpha - 0.5) < 1e-9);
});

test('passes STEP to the update callback', () => {
  const s = createStepper(STEP, 0.25);
  const seen = [];
  s.advance(STEP * 2.5, (dt) => seen.push(dt));
  assert.deepEqual(seen, [STEP, STEP]);
});

test('reset drops accumulated time', () => {
  const s = createStepper(STEP, 0.25);
  s.advance(0.01, () => {});
  s.reset();
  let n = 0;
  s.advance(0.01, () => n++);
  assert.equal(n, 0);
});
