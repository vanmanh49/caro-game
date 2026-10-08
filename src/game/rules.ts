import { isBoardFull, isInBounds } from './board';
import type { Board, Player, Position } from './types';

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
] as const;

export function otherPlayer(player: Player): Player {
  return player === 'X' ? 'O' : 'X';
}

function walk(board: Board, from: Position, dr: number, dc: number, player: Player): Position[] {
  const out: Position[] = [];
  let row = from.row + dr;
  let col = from.col + dc;
  while (isInBounds(board, { row, col }) && board[row][col] === player) {
    out.push({ row, col });
    row += dr;
    col += dc;
  }
  return out;
}

/** The full line (>= winLength) through `last`, or null. Only the four lines through the last move are checked. */
export function getWinningCells(board: Board, last: Position, winLength: number): Position[] | null {
  if (!isInBounds(board, last)) return null;
  const player = board[last.row][last.col];
  if (player === null) return null;
  for (const [dr, dc] of DIRECTIONS) {
    const cells = [
      ...walk(board, last, -dr, -dc, player).reverse(),
      { row: last.row, col: last.col },
      ...walk(board, last, dr, dc, player),
    ];
    if (cells.length >= winLength) return cells;
  }
  return null;
}

export function checkWinner(board: Board, last: Position, winLength: number): Player | null {
  return getWinningCells(board, last, winLength) ? board[last.row][last.col] : null;
}

export function checkDraw(board: Board): boolean {
  return isBoardFull(board);
}
