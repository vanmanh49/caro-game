import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, SPRITES } from '../src/spriteData.js';

const REQUIRED = [
  'small_idle', 'small_run1', 'small_run2', 'small_jump',
  'big_idle', 'big_run1', 'big_run2', 'big_jump',
  'goomba_a', 'goomba_b', 'goomba_flat', 'koopa_a', 'koopa_b', 'koopa_shell',
  'mushroom', 'fireflower', 'coin_a', 'coin_b', 'fireball', 'debris', 'flag',
  'ground', 'brick', 'qblock', 'used', 'pipe', 'oneway',
];

test('every required sprite exists', () => {
  for (const name of REQUIRED) assert.ok(SPRITES[name], `missing sprite ${name}`);
});

test('every sprite is rectangular and uses only palette characters', () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    const width = rows[0].length;
    rows.forEach((row, i) => {
      assert.equal(row.length, width, `${name} row ${i} is ${row.length} wide, expected ${width}`);
      for (const ch of row) assert.ok(ch === '.' || ch in PALETTE, `${name} row ${i} uses unknown char '${ch}'`);
    });
  }
});

test('player sprites are 8 wide; small is 8 tall and big is 16 tall', () => {
  for (const pose of ['idle', 'run1', 'run2', 'jump']) {
    assert.equal(SPRITES[`small_${pose}`].length, 8);
    assert.equal(SPRITES[`big_${pose}`].length, 16);
    assert.equal(SPRITES[`small_${pose}`][0].length, 8);
  }
});

test('tile and creature sprites are 8x8', () => {
  for (const name of ['goomba_a', 'goomba_b', 'goomba_flat', 'koopa_a', 'koopa_b', 'koopa_shell', 'mushroom', 'fireflower', 'coin_a', 'coin_b', 'flag', 'ground', 'brick', 'qblock', 'used', 'pipe', 'oneway']) {
    assert.equal(SPRITES[name].length, 8, name);
    assert.equal(SPRITES[name][0].length, 8, name);
  }
});
