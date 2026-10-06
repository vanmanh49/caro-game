import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, addScore, addCoin, loseLife, advanceLevel } from '../src/session.js';
import { GAME } from '../src/constants.js';

test('a new session starts with the configured lives and no score', () => {
  const s = createSession();
  assert.deepEqual(s, { score: 0, coins: 0, lives: GAME.startLives, power: 'small', levelIndex: 0 });
});

test('addScore accumulates', () => {
  const s = createSession();
  addScore(s, 100);
  addScore(s, 250);
  assert.equal(s.score, 350);
});

test('the 100th coin awards a life and wraps the counter', () => {
  const s = createSession();
  for (let i = 0; i < 99; i++) assert.equal(addCoin(s), false);
  assert.equal(s.coins, 99);
  assert.equal(addCoin(s), true);
  assert.equal(s.coins, 0);
  assert.equal(s.lives, GAME.startLives + 1);
});

test('loseLife decrements, returns the remainder and resets power', () => {
  const s = createSession();
  s.power = 'fire';
  assert.equal(loseLife(s), GAME.startLives - 1);
  assert.equal(s.power, 'small');
});

test('advanceLevel reports whether another level remains', () => {
  const s = createSession();
  assert.equal(advanceLevel(s, 3), true);
  assert.equal(advanceLevel(s, 3), true);
  assert.equal(advanceLevel(s, 3), false);
  assert.equal(s.levelIndex, 3);
});
