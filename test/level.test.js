import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, LevelError } from '../src/level.js';
import { T } from '../src/tiles.js';
import { LEVELS, loadLevel } from '../src/levels/index.js';
import { levelText } from './helpers.js';

const bad = (text, pattern) =>
  assert.throws(() => parseLevel('lvl', text), (e) => e instanceof LevelError && pattern.test(e.message));

test('parses tiles, block contents, spawns, start and flag', () => {
  const text = levelText({
    edit: (g) => {
      g[8][5] = '?'; g[8][6] = 'M'; g[8][7] = 'B';
      g[10][9] = 'C'; g[11][12] = 'G'; g[11][14] = 'K';
      g[10][20] = '-'; g[11][22] = '|';
    },
  });
  const level = parseLevel('t', text);
  assert.equal(level.name, 't');
  assert.equal(level.cols, 40);
  assert.equal(level.rows, 14);
  assert.equal(level.tiles.get(5, 8), T.QBLOCK);
  assert.equal(level.tiles.peekContents(5, 8), 'coin');
  assert.equal(level.tiles.get(6, 8), T.QBLOCK);
  assert.equal(level.tiles.peekContents(6, 8), 'mushroom');
  assert.equal(level.tiles.get(7, 8), T.BRICK);
  assert.equal(level.tiles.get(20, 10), T.ONEWAY);
  assert.equal(level.tiles.get(22, 11), T.PIPE);
  assert.equal(level.tiles.get(0, 12), T.GROUND);
  assert.deepEqual(level.spawns, [
    { type: 'coin', col: 9, row: 10 },
    { type: 'goomba', col: 12, row: 11 },
    { type: 'koopa', col: 14, row: 11 },
  ]);
  assert.deepEqual(level.start, { col: 2, row: 11 });
  assert.deepEqual(level.flag, { col: 37, row: 11 });
  assert.equal(level.tiles.get(12, 11), T.EMPTY, 'spawn cells are empty tiles');
  assert.equal(level.tiles.get(2, 11), T.EMPTY, 'start cell is an empty tile');
});

test('unknown character error names the level, row and column (1-based)', () => {
  bad(levelText({ edit: (g) => { g[2][4] = 'X'; } }), /lvl.*'X'.*row 3, col 5/);
});

test('requires exactly one P', () => {
  bad(levelText({ edit: (g) => { g[11][2] = '.'; } }), /exactly one 'P', found 0/);
  bad(levelText({ edit: (g) => { g[11][4] = 'P'; } }), /exactly one 'P', found 2/);
});

test('requires exactly one F', () => {
  bad(levelText({ edit: (g) => { g[11][5] = 'F'; } }), /exactly one 'F', found 2/);
});

test('rejects a ragged row', () => {
  const lines = levelText().split('\n');
  lines[3] = lines[3].slice(1);
  bad(lines.join('\n'), /row 3 has 39 columns, expected 40/);
});

test('rejects a level that is not 14 rows tall', () => {
  const lines = levelText().split('\n');
  lines.splice(1, 1);
  bad(lines.join('\n'), /must be 14 rows tall, found 13/);
});

test('accepts Windows line endings and trailing spaces', () => {
  const crlf = levelText().replace(/\n/g, '\r\n');
  assert.equal(parseLevel('crlf', crlf).cols, 40);
  const spaced = levelText().replace(/\n/g, '   \n');
  assert.equal(parseLevel('spaced', spaced).cols, 40);
});

test('every registered level parses', () => {
  assert.ok(LEVELS.length >= 1);
  LEVELS.forEach((_, i) => assert.doesNotThrow(() => loadLevel(i)));
});
