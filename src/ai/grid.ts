import type { Board, Player, Position } from '../game/types';

export type Code = 1 | 2; // 1 = X, 2 = O; 0 = empty

export interface Grid {
  size: number;
  winLength: number;
  cells: Uint8Array;
}

export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const toCode = (player: Player): Code => (player === 'X' ? 1 : 2);
export const opponentOf = (code: Code): Code => (code === 1 ? 2 : 1);

export function toGrid(board: Board, winLength: number): Grid {
  const size = board.length;
  const cells = new Uint8Array(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = board[r][c];
      cells[r * size + c] = cell === null ? 0 : toCode(cell);
    }
  }
  return { size, winLength, cells };
}

export const indexToPosition = (size: number, idx: number): Position => ({
  row: Math.floor(idx / size),
  col: idx % size,
});
export const positionToIndex = (size: number, { row, col }: Position): number => row * size + col;

export interface LineInfo {
  count: number;
  open: number;
}

/** Length of the run of `code` through `idx` (as if `code` were placed there) and how many of its ends are empty. */
export function lineInfo(g: Grid, idx: number, code: Code, dr: number, dc: number): LineInfo {
  const { size, cells } = g;
  const row = Math.floor(idx / size);
  const col = idx % size;
  let count = 1;
  let open = 0;
  for (let s = 1; s >= -1; s -= 2) {
    let r = row + dr * s;
    let c = col + dc * s;
    while (r >= 0 && r < size && c >= 0 && c < size && cells[r * size + c] === code) {
      count++;
      r += dr * s;
      c += dc * s;
    }
    if (r >= 0 && r < size && c >= 0 && c < size && cells[r * size + c] === 0) open++;
  }
  return { count, open };
}

/** Would placing `code` on the (empty) cell `idx` complete a line of winLength or more? */
export function makesWin(g: Grid, idx: number, code: Code): boolean {
  for (const [dr, dc] of DIRS) {
    if (lineInfo(g, idx, code, dr, dc).count >= g.winLength) return true;
  }
  return false;
}

export function countStones(g: Grid): number {
  let n = 0;
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i] !== 0) n++;
  return n;
}

export function emptyCells(g: Grid): number[] {
  const out: number[] = [];
  for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === 0) out.push(i);
  return out;
}
