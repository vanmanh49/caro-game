import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';

const key = (type, code) => Object.assign(new Event(type, { cancelable: true }), { code });

function setup() {
  const target = new EventTarget();
  const input = createInput(target);
  return { target, input };
}

test('keydown sets isDown and wasPressed', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'KeyA'));
  assert.equal(input.isDown('left'), true);
  assert.equal(input.wasPressed('left'), true);
});

test('endFrame clears the press edge but not the held state', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'Space'));
  input.endFrame();
  assert.equal(input.wasPressed('jump'), false);
  assert.equal(input.isDown('jump'), true);
});

test('keyup clears the held state', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ArrowRight'));
  target.dispatchEvent(key('keyup', 'ArrowRight'));
  assert.equal(input.isDown('right'), false);
});

test('key auto-repeat does not produce a new press edge', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'Space'));
  input.endFrame();
  target.dispatchEvent(key('keydown', 'Space'));
  assert.equal(input.wasPressed('jump'), false);
});

test('any bound key triggers its action', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ShiftRight'));
  assert.equal(input.isDown('run'), true);
});

test('arrow keys and space have their default prevented', () => {
  const { target } = setup();
  const e = key('keydown', 'ArrowUp');
  target.dispatchEvent(e);
  assert.equal(e.defaultPrevented, true);
});

test('blur releases every held key (no stuck movement)', () => {
  const { target, input } = setup();
  target.dispatchEvent(key('keydown', 'ArrowRight'));
  target.dispatchEvent(key('keydown', 'ShiftLeft'));
  target.dispatchEvent(new Event('blur'));
  assert.equal(input.isDown('right'), false);
  assert.equal(input.isDown('run'), false);
  assert.equal(input.wasPressed('right'), false);
});

test('dispose stops listening', () => {
  const { target, input } = setup();
  input.dispose();
  target.dispatchEvent(key('keydown', 'KeyA'));
  assert.equal(input.isDown('left'), false);
});
