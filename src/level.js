// src/level.js
import { LEVEL_ROWS } from './constants.js';
import { T, TileMap } from './tiles.js';

export class LevelError extends Error {}

const TILE_CHARS = { '.': T.EMPTY, '#': T.GROUND, B: T.BRICK, '?': T.QBLOCK, M: T.QBLOCK, '-': T.ONEWAY, '|': T.PIPE };
const CONTENTS = { '?': 'coin', M: 'mushroom' };
const SPAWN_CHARS = { C: 'coin', G: 'goomba', K: 'koopa' };

export function parseLevel(name, text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd());
  if (lines.length && lines[0] === '') lines.shift();
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  if (lines.length !== LEVEL_ROWS) {
    throw new LevelError(`${name}: must be ${LEVEL_ROWS} rows tall, found ${lines.length}`);
  }
  const cols = lines[0].length;
  lines.forEach((line, r) => {
    if (line.length !== cols) throw new LevelError(`${name}: row ${r + 1} has ${line.length} columns, expected ${cols}`);
  });

  const data = new Uint8Array(cols * LEVEL_ROWS);
  const contents = new Map();
  const spawns = [];
  const starts = [];
  const flags = [];

  for (let r = 0; r < LEVEL_ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = lines[r][c];
      if (ch in TILE_CHARS) {
        data[r * cols + c] = TILE_CHARS[ch];
        if (ch in CONTENTS) contents.set(`${c},${r}`, CONTENTS[ch]);
      } else if (ch in SPAWN_CHARS) {
        spawns.push({ type: SPAWN_CHARS[ch], col: c, row: r });
      } else if (ch === 'P') {
        starts.push({ col: c, row: r });
      } else if (ch === 'F') {
        flags.push({ col: c, row: r });
      } else {
        throw new LevelError(`${name}: unknown character '${ch}' at row ${r + 1}, col ${c + 1}`);
      }
    }
  }

  if (starts.length !== 1) throw new LevelError(`${name}: expected exactly one 'P', found ${starts.length}`);
  if (flags.length !== 1) throw new LevelError(`${name}: expected exactly one 'F', found ${flags.length}`);

  return { name, cols, rows: LEVEL_ROWS, tiles: new TileMap(cols, LEVEL_ROWS, data, contents), spawns, start: starts[0], flag: flags[0] };
}
