import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStates } from '../src/states.js';
import { createStore } from '../src/storage.js';
import { parseLevel, LevelError } from '../src/level.js';
import { GAME, PLAYER } from '../src/constants.js';
import { levelText, mockAudio, idleInput } from './helpers.js';

const DT = 1 / 60;

const memory = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)) };
};

// The player starts over a nine-tile pit, so every life ends quickly.
const pitLevel = () => parseLevel('pit', levelText({ edit: (g) => { for (let c = 0; c <= 8; c++) { g[12][c] = '.'; g[13][c] = '.'; } } }));

function setup(overrides = {}) {
  const calls = [];
  const audio = mockAudio();
  const store = createStore(memory());
  const states = createStates({
    input: idleInput, audio, store, go: (name, payload) => calls.push([name, payload]), levelCount: 1, load: pitLevel, ...overrides,
  });
  return { states, calls, audio, store };
}

test('pressing start on the title screen begins the game', () => {
  const { states, calls } = setup({ input: { isDown: () => false, wasPressed: (a) => a === 'start' } });
  states.title.update(DT);
  assert.deepEqual(calls, [['playing', undefined]]);
});

test('three deaths end the game; the first two restart the level', () => {
  const { states, calls } = setup();
  states.title.enter();
  for (let life = 0; life < GAME.startLives; life++) {
    states.playing.enter();
    for (let i = 0; i < 60 * (PLAYER.deathTotal + 4) && calls.length === life; i++) states.playing.update(DT);
  }
  assert.deepEqual(calls.map((c) => c[0]), ['playing', 'playing', 'gameOver']);
});

test('a level that fails to load shows the error state with its message', () => {
  const { states, calls } = setup({ load: () => { throw new LevelError('bad level: row 3, col 5'); } });
  const logged = [];
  const orig = console.error;
  console.error = (e) => logged.push(e);
  try {
    states.playing.enter();
  } finally {
    console.error = orig;
  }
  assert.deepEqual(calls, [['error', { message: 'bad level: row 3, col 5' }]]);
  assert.equal(logged.length, 1, 'the error is logged to the console');
  assert.ok(logged[0] instanceof LevelError);
});

test('clearing the last level pays the time bonus, goes to win, and saves the high score', () => {
  const { states, calls, store } = setup({ levelCount: 1 });
  states.title.enter();
  states.playing.enter();
  states.levelClear.enter({ timeLeft: 100.2 });
  for (let i = 0; i < 60 * (GAME.clearScreenTime + 1) && calls.length === 0; i++) states.levelClear.update(DT);
  assert.equal(calls[0][0], 'win');
  states.win.enter();
  assert.equal(store.get('hiscore', 0), 101 * GAME.timeBonusPerSecond);
});

test('clearing a level that is not the last goes to the next level', () => {
  const { states, calls } = setup({ levelCount: 2 });
  states.title.enter();
  states.playing.enter();
  states.levelClear.enter({ timeLeft: 10 });
  for (let i = 0; i < 60 * (GAME.clearScreenTime + 1) && calls.length === 0; i++) states.levelClear.update(DT);
  assert.equal(calls[0][0], 'playing');
});

test('game over waits a moment, then start returns to the title', () => {
  const { states, calls } = setup({ input: { isDown: () => false, wasPressed: (a) => a === 'start' } });
  states.gameOver.enter();
  states.gameOver.update(DT);
  assert.equal(calls.length, 0);
  for (let i = 0; i < 70; i++) states.gameOver.update(DT);
  assert.equal(calls[0][0], 'title');
});
