import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMachine } from '../src/stateMachine.js';

test('go calls exit on the old state then enter on the new one with the payload', () => {
  const log = [];
  const m = createMachine({
    a: { enter: () => log.push('enter a'), exit: () => log.push('exit a') },
    b: { enter: (p) => log.push(`enter b ${p.x}`) },
  });
  m.go('a');
  m.go('b', { x: 7 });
  assert.deepEqual(log, ['enter a', 'exit a', 'enter b 7']);
  assert.equal(m.name, 'b');
});

test('update and render go to the current state', () => {
  const log = [];
  const m = createMachine({ a: { update: (dt) => log.push(`u${dt}`), render: (ctx, alpha) => log.push(`r${ctx}${alpha}`) } });
  m.update(1);
  m.go('a');
  m.update(2);
  m.render('C', 0.5);
  assert.deepEqual(log, ['u2', 'rC0.5']);
});

test('an unknown state throws', () => {
  assert.throws(() => createMachine({}).go('nope'), /Unknown state: nope/);
});

test('a state can switch to another state from inside enter', () => {
  const m = createMachine({
    a: { enter: () => m.go('b') },
    b: {},
  });
  m.go('a');
  assert.equal(m.name, 'b');
});
