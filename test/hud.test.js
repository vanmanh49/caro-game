import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, formatTime, hudItems } from '../src/hud.js';

test('formatScore pads to six digits, clamps negatives, never truncates', () => {
  assert.equal(formatScore(100), '000100');
  assert.equal(formatScore(-5), '000000');
  assert.equal(formatScore(1234567), '1234567');
});

test('formatTime rounds up to three digits and never goes negative', () => {
  assert.equal(formatTime(299.2), '300');
  assert.equal(formatTime(0), '000');
  assert.equal(formatTime(-1), '000');
});

test('hudItems lists score, coins, lives, world and time', () => {
  const items = hudItems({ score: 1500, coins: 7, lives: 3 }, 123.4, '1-1');
  assert.deepEqual(items.map((i) => [i.label, i.value]), [
    ['SCORE', '001500'], ['COINS', 'x07'], ['LIVES', 'x3'], ['WORLD', '1-1'], ['TIME', '124'],
  ]);
});
