import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStepper, startLoop } from '../src/loop.js';

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

// A fake raf that stores the pending callback, and a fake clock that advances one step per call.
function fakeLoop(opts) {
  let pending = null;
  let t = 0;
  const handle = startLoop({
    raf: (f) => { pending = f; },
    now: () => (t += 17),
    ...opts,
  });
  return {
    handle,
    hasPending: () => pending !== null,
    tick() {
      const f = pending;
      pending = null;
      f();
    },
  };
}

test('an update that throws calls onError and the next frame is still scheduled', () => {
  const boom = new Error('boom');
  const errors = [];
  const loop = fakeLoop({ update: () => { throw boom; }, render: () => {}, onError: (e) => errors.push(e) });
  loop.tick();
  assert.deepEqual(errors, [boom]);
  assert.ok(loop.hasPending());
});

test('without onError a throwing frame is logged and the loop keeps going', () => {
  const logged = [];
  const orig = console.error;
  console.error = (e) => logged.push(e);
  try {
    const boom = new Error('boom');
    const loop = fakeLoop({ update: () => { throw boom; }, render: () => {} });
    loop.tick();
    assert.ok(loop.hasPending());
    assert.deepEqual(logged, [boom]);
  } finally {
    console.error = orig;
  }
});

test('a throwing onError does not stop the loop or recurse', () => {
  const orig = console.error;
  const logged = [];
  console.error = (e) => logged.push(e);
  try {
    let calls = 0;
    const loop = fakeLoop({
      update: () => { throw new Error('boom'); },
      render: () => {},
      onError: () => { calls++; throw new Error('handler failed'); },
    });
    loop.tick();
    loop.tick();
    assert.equal(calls, 2);
    assert.equal(logged.length, 2);
    assert.ok(loop.hasPending());
  } finally {
    console.error = orig;
  }
});

test('after stop() no further frame is scheduled', () => {
  const loop = fakeLoop({ update: () => {}, render: () => {} });
  loop.tick();
  assert.ok(loop.hasPending());
  loop.handle.stop();
  loop.tick();
  assert.equal(loop.hasPending(), false);
});

test('stop() called from inside a frame prevents the next frame', () => {
  let loop;
  loop = fakeLoop({ update: () => loop.handle.stop(), render: () => {} });
  loop.tick();
  assert.equal(loop.hasPending(), false);
});
