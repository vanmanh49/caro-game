import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, loadLevel } from '../src/levels/index.js';
import { T, isSolid } from '../src/tiles.js';

const levels = () => LEVELS.map((_, i) => loadLevel(i));

test('there are three levels, named 1-1, 1-2 and 1-3', () => {
  assert.deepEqual(LEVELS.map((l) => l.name), ['1-1', '1-2', '1-3']);
});

test('the player start and the flag both stand on solid ground', () => {
  for (const level of levels()) {
    assert.equal(isSolid(level.tiles.get(level.start.col, level.start.row + 1)), true, `${level.name} start`);
    assert.equal(isSolid(level.tiles.get(level.flag.col, level.flag.row + 1)), true, `${level.name} flag`);
  }
});

test('ground gaps are at most three tiles wide (jumpable)', () => {
  for (const level of levels()) {
    let run = 0;
    for (let c = 0; c < level.cols; c++) {
      const pit = !isSolid(level.tiles.get(c, 12)) && !isSolid(level.tiles.get(c, 13));
      run = pit ? run + 1 : 0;
      assert.ok(run <= 3, `${level.name}: pit of ${run} tiles ending at column ${c + 1}`);
    }
  }
});

test('pipes are at most three tiles tall (jumpable)', () => {
  for (const level of levels()) {
    for (let c = 0; c < level.cols; c++) {
      let height = 0;
      for (let r = 0; r < level.rows; r++) {
        height = level.tiles.get(c, r) === T.PIPE ? height + 1 : 0;
        assert.ok(height <= 3, `${level.name}: pipe taller than 3 at column ${c + 1}`);
      }
    }
  }
});

test('enemies start on solid ground', () => {
  for (const level of levels()) {
    for (const s of level.spawns.filter((x) => x.type !== 'coin')) {
      assert.equal(isSolid(level.tiles.get(s.col, s.row + 1)), true, `${level.name}: ${s.type} at col ${s.col + 1}`);
    }
  }
});
