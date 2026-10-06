// test/helpers.js
import { TileMap, T } from '../src/tiles.js';

const CHAR_TO_TILE = {
  '.': T.EMPTY, '#': T.GROUND, B: T.BRICK, '?': T.QBLOCK, M: T.QBLOCK, U: T.USED, '-': T.ONEWAY, '|': T.PIPE,
};

export function makeMap(rows, contents = {}) {
  const cols = rows[0].length;
  const data = new Uint8Array(cols * rows.length);
  rows.forEach((row, r) => [...row].forEach((ch, c) => { data[r * cols + c] = CHAR_TO_TILE[ch]; }));
  return new TileMap(cols, rows.length, data, new Map(Object.entries(contents)));
}

export function levelText({ cols = 40, edit } = {}) {
  const grid = Array.from({ length: 14 }, () => Array(cols).fill('.'));
  for (let c = 0; c < cols; c++) { grid[12][c] = '#'; grid[13][c] = '#'; }
  grid[11][2] = 'P';
  grid[11][cols - 3] = 'F';
  if (edit) edit(grid);
  return '\n' + grid.map((r) => r.join('')).join('\n') + '\n';
}

export function mockAudio() {
  const calls = [];
  return {
    calls,
    play: (name) => calls.push(name),
    startMusic: () => calls.push('startMusic'),
    stopMusic: () => calls.push('stopMusic'),
  };
}

export const idleInput = { isDown: () => false, wasPressed: () => false };
