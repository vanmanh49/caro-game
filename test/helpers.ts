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
