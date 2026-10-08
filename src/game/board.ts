import type { Board, Cell, Player, Position } from './types';

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

export class InvalidBoardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBoardError';
  }
}

export function createBoard(size: number): Board {
  if (!Number.isInteger(size) || size < 3) {
    throw new RangeError(`Board size must be an integer >= 3, got ${size}`);
  }
  return Array.from({ length: size }, () => Array<Cell>(size).fill(null));
}

export function isInBounds(board: Board, { row, col }: Position): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    col >= 0 &&
    row < board.length &&
    col < board.length
  );
}

export function isValidMove(board: Board, pos: Position): boolean {
  return isInBounds(board, pos) && board[pos.row][pos.col] === null;
}

export function makeMove(board: Board, pos: Position, player: Player): Board {
  if (!isValidMove(board, pos)) {
    throw new InvalidMoveError(`Invalid move at row ${pos.row}, column ${pos.col}`);
  }
  return board.map((cells, r) =>
    r === pos.row ? cells.map((cell, c) => (c === pos.col ? player : cell)) : cells,
  );
}

export function getAvailableMoves(board: Board): Position[] {
  const moves: Position[] = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board.length; col++) {
      if (board[row][col] === null) moves.push({ row, col });
    }
  }
  return moves;
}

export function isBoardFull(board: Board): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

/** Throws InvalidBoardError if the board is not square, has unknown cells, or has impossible piece counts. */
export function validateBoard(board: Board): void {
  const size = board.length;
  if (size < 3) throw new InvalidBoardError('Board is too small');
  let x = 0;
  let o = 0;
  for (const row of board) {
    if (row.length !== size) throw new InvalidBoardError('Board must be square');
    for (const cell of row) {
      if (cell === 'X') x++;
      else if (cell === 'O') o++;
      else if (cell !== null) throw new InvalidBoardError(`Unknown cell value: ${String(cell)}`);
    }
  }
  if (Math.abs(x - o) > 1) throw new InvalidBoardError('Piece counts are impossible');
}
