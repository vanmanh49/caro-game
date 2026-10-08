import { describe, expect, it } from 'vitest';
import {
  InvalidBoardError,
  InvalidMoveError,
  createBoard,
  getAvailableMoves,
  isBoardFull,
  isValidMove,
  makeMove,
  validateBoard,
} from '../src/game/board';
import { checkDraw, checkWinner, getWinningCells } from '../src/game/rules';
import { boardWith, line } from './helpers';

describe('createBoard', () => {
  it.each([10, 15, 19])('creates an empty %i x %i board', (size) => {
    const board = createBoard(size);
    expect(board).toHaveLength(size);
    expect(board.every((row) => row.length === size && row.every((c) => c === null))).toBe(true);
  });

  it('rejects invalid sizes', () => {
    expect(() => createBoard(2)).toThrow(RangeError);
    expect(() => createBoard(10.5)).toThrow(RangeError);
  });
});

describe('moves', () => {
  it('makeMove returns a new board and leaves the original untouched', () => {
    const board = createBoard(15);
    const next = makeMove(board, { row: 3, col: 4 }, 'X');
    expect(next[3][4]).toBe('X');
    expect(board[3][4]).toBeNull();
    expect(next).not.toBe(board);
  });

  it('rejects occupied and out-of-bounds moves', () => {
    const board = makeMove(createBoard(15), { row: 0, col: 0 }, 'X');
    expect(isValidMove(board, { row: 0, col: 0 })).toBe(false);
    expect(isValidMove(board, { row: -1, col: 0 })).toBe(false);
    expect(isValidMove(board, { row: 0, col: 15 })).toBe(false);
    expect(isValidMove(board, { row: 0.5, col: 1 })).toBe(false);
    expect(isValidMove(board, { row: 1, col: 1 })).toBe(true);
    expect(() => makeMove(board, { row: 0, col: 0 }, 'O')).toThrow(InvalidMoveError);
    expect(() => makeMove(board, { row: 99, col: 0 }, 'O')).toThrow(InvalidMoveError);
  });

  it('lists available moves', () => {
    const board = makeMove(createBoard(15), { row: 7, col: 7 }, 'X');
    expect(getAvailableMoves(board)).toHaveLength(15 * 15 - 1);
    expect(isBoardFull(board)).toBe(false);
  });
});

describe('validateBoard', () => {
  it('accepts a normal board', () => {
    expect(() => validateBoard(boardWith(15, { X: [[0, 0]], O: [[1, 1]] }))).not.toThrow();
  });

  it('rejects non-square boards, unknown cells and impossible piece counts', () => {
    expect(() => validateBoard([[null, null, null], [null, null, null]])).toThrow(InvalidBoardError);
    expect(() => validateBoard([[null, 'Z' as never, null], [null, null, null], [null, null, null]])).toThrow(
      InvalidBoardError,
    );
    expect(() => validateBoard(boardWith(15, { X: [[0, 0], [0, 1], [0, 2]] }))).toThrow(InvalidBoardError);
  });
});

describe('win detection', () => {
  const WINS: Array<[string, [number, number][]]> = [
    ['horizontal', line(7, 3, 0, 1, 5)],
    ['vertical', line(2, 9, 1, 0, 5)],
    ['diagonal down-right', line(3, 3, 1, 1, 5)],
    ['diagonal down-left', line(3, 9, 1, -1, 5)],
  ];

  it.each(WINS)('detects a %s win from any stone of the line', (_name, cells) => {
    const board = boardWith(15, { X: cells });
    for (const [row, col] of cells) {
      expect(checkWinner(board, { row, col }, 5)).toBe('X');
      expect(getWinningCells(board, { row, col }, 5)).toHaveLength(5);
    }
  });

  it('returns exactly the winning cells', () => {
    const cells = line(7, 3, 0, 1, 5);
    const found = getWinningCells(boardWith(15, { X: cells }), { row: 7, col: 5 }, 5);
    expect(found).toEqual(cells.map(([row, col]) => ({ row, col })));
  });

  it('four in a row is not a win', () => {
    const board = boardWith(15, { X: line(7, 3, 0, 1, 4) });
    expect(checkWinner(board, { row: 7, col: 6 }, 5)).toBeNull();
    expect(getWinningCells(board, { row: 7, col: 6 }, 5)).toBeNull();
  });

  it('six in a row wins and returns all six', () => {
    const board = boardWith(15, { X: line(7, 2, 0, 1, 6) });
    expect(getWinningCells(board, { row: 7, col: 4 }, 5)).toHaveLength(6);
  });

  it('detects wins on the board edge and corner', () => {
    expect(checkWinner(boardWith(15, { X: line(0, 0, 0, 1, 5) }), { row: 0, col: 0 }, 5)).toBe('X');
    expect(checkWinner(boardWith(15, { O: line(10, 14, 1, 0, 5) }), { row: 14, col: 14 }, 5)).toBe('O');
  });

  it('an opponent stone breaks the line', () => {
    const board = boardWith(15, { X: [[7, 3], [7, 4], [7, 6], [7, 7]], O: [[7, 5]] });
    expect(checkWinner(board, { row: 7, col: 4 }, 5)).toBeNull();
  });

  it('respects a custom winLength', () => {
    const board = boardWith(10, { X: line(0, 0, 1, 1, 4) });
    expect(checkWinner(board, { row: 3, col: 3 }, 4)).toBe('X');
    expect(checkWinner(board, { row: 3, col: 3 }, 5)).toBeNull();
  });

  it('returns null for an empty or out-of-range last move', () => {
    const board = createBoard(15);
    expect(getWinningCells(board, { row: 3, col: 3 }, 5)).toBeNull();
    expect(getWinningCells(board, { row: 99, col: 3 }, 5)).toBeNull();
  });
});

describe('draw detection', () => {
  const full = boardWith(3, {
    X: [[0, 0], [0, 2], [1, 0], [2, 1], [2, 2]],
    O: [[0, 1], [1, 1], [1, 2], [2, 0]],
  });

  it('detects a full board with no winner', () => {
    expect(checkDraw(full)).toBe(true);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) expect(getWinningCells(full, { row, col }, 3)).toBeNull();
    }
  });

  it('is false while empty cells remain', () => {
    expect(checkDraw(boardWith(3, { X: [[0, 0]] }))).toBe(false);
  });
});
