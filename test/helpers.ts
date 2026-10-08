import type { Board, Cell, Player } from '../src/game/types';

export type Stones = Partial<Record<Player, ReadonlyArray<readonly [number, number]>>>;

export function boardWith(size: number, stones: Stones): Board {
  const grid: Cell[][] = Array.from({ length: size }, () => Array<Cell>(size).fill(null));
  for (const player of ['X', 'O'] as const) {
    for (const [row, col] of stones[player] ?? []) grid[row][col] = player;
  }
  return grid;
}

export function line(row: number, col: number, dr: number, dc: number, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i): [number, number] => [row + dr * i, col + dc * i]);
}

/** Builds a board from ASCII rows: 'X', 'O', anything else is empty. */
export function boardFromRows(rows: readonly string[]): Board {
  return rows.map((row) => [...row].map((ch): Cell => (ch === 'X' ? 'X' : ch === 'O' ? 'O' : null)));
}
