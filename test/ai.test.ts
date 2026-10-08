import { describe, expect, it } from 'vitest';
import { createAIPlayer } from '../src/ai/aiPlayer';
import { computeMove } from '../src/ai/computeMove';
import { createBoard, isValidMove, makeMove } from '../src/game/board';
import { getWinningCells, otherPlayer } from '../src/game/rules';
import { BOARD_SIZES, DIFFICULTIES, type Board, type Difficulty, type Player, type Position } from '../src/game/types';
import { createRng } from '../src/utils/random';
import { boardWith, line } from './helpers';

const fast = { winLength: 5, timeLimitMs: 150 };
const key = (p: Position) => `${p.row},${p.col}`;
const SMART: Difficulty[] = ['medium', 'hard', 'expert'];

function randomMidgame(size: number, plies: number, seed: number): Board {
  const rng = createRng(seed);
  let board = createBoard(size);
  let player: Player = 'X';
  for (let i = 0; i < plies; i++) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    if (!isValidMove(board, { row, col })) continue;
    board = makeMove(board, { row, col }, player);
    player = otherPlayer(player);
  }
  return board;
}

function sideToMove(board: Board): Player {
  const flat = board.flat();
  return flat.filter((c) => c === 'X').length > flat.filter((c) => c === 'O').length ? 'O' : 'X';
}

describe('legality', () => {
  it.each(DIFFICULTIES.flatMap((d) => BOARD_SIZES.map((s) => [d, s] as const)))(
    '%s returns a legal cell on a %i board (empty and mid-game)',
    (difficulty, size) => {
      const empty = createBoard(size);
      expect(isValidMove(empty, computeMove(difficulty, empty, 'X', { ...fast, rng: createRng(1) }))).toBe(true);
      const board = randomMidgame(size, 24, size * 7);
      const move = computeMove(difficulty, board, sideToMove(board), { ...fast, rng: createRng(2) });
      expect(isValidMove(board, move)).toBe(true);
    },
  );

  it.each(DIFFICULTIES)('%s plays the only remaining cell on a nearly full board', (difficulty) => {
    const board = boardWith(3, { X: [[0, 0], [0, 2], [1, 1], [2, 1]], O: [[0, 1], [1, 0], [1, 2], [2, 0]] });
    expect(computeMove(difficulty, board, 'X', { ...fast, rng: createRng(3) })).toEqual({ row: 2, col: 2 });
  });

  it('throws on a full board', () => {
    const full = boardWith(3, { X: [[0, 0], [0, 2], [1, 1], [2, 1], [2, 2]], O: [[0, 1], [1, 0], [1, 2], [2, 0]] });
    expect(() => computeMove('easy', full, 'O', fast)).toThrow();
  });

  it('rejects an invalid board', () => {
    const bad = boardWith(15, { X: [[0, 0], [0, 1], [0, 2]] });
    expect(() => computeMove('hard', bad, 'O', fast)).toThrow();
  });
});

describe('tactics', () => {
  const winBoard = boardWith(15, { X: line(7, 3, 0, 1, 4), O: [[7, 2], [9, 9], [2, 2], [12, 3]] });
  const blockBoard = boardWith(15, { O: line(7, 3, 0, 1, 4), X: [[7, 2], [9, 9], [2, 2], [12, 3]] });

  it.each(SMART)('%s takes an immediate win', (difficulty) => {
    expect(computeMove(difficulty, winBoard, 'X', { ...fast, rng: createRng(4) })).toEqual({ row: 7, col: 7 });
  });

  it.each(SMART)('%s blocks an immediate loss', (difficulty) => {
    expect(computeMove(difficulty, blockBoard, 'X', { ...fast, rng: createRng(5) })).toEqual({ row: 7, col: 7 });
  });

  it.each(['hard', 'expert'] as const)('%s blocks an open three on one of its ends', (difficulty) => {
    const board = boardWith(15, { O: line(7, 6, 0, 1, 3), X: [[3, 3], [10, 10], [12, 2]] });
    const move = computeMove(difficulty, board, 'X', { ...fast, rng: createRng(6) });
    expect(['7,5', '7,9']).toContain(key(move));
  });

  it.each(['hard', 'expert'] as const)('%s finds a double-four fork', (difficulty) => {
    const board = boardWith(15, {
      X: [[7, 4], [7, 5], [7, 6], [4, 7], [5, 7], [6, 7]],
      O: [[7, 3], [3, 7], [12, 12], [12, 2], [2, 12], [13, 5]],
    });
    expect(computeMove(difficulty, board, 'X', { ...fast, rng: createRng(7) })).toEqual({ row: 7, col: 7 });
  });
});

describe('difficulty behaviour', () => {
  it('easy sometimes blocks and sometimes misses an obvious four', () => {
    const board = boardWith(15, { O: line(7, 3, 0, 1, 4), X: [[7, 2], [9, 9], [2, 2], [12, 3]] });
    const rng = createRng(99);
    let blocked = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      const move = computeMove('easy', board, 'X', { winLength: 5, rng });
      if (key(move) === '7,7') blocked++;
    }
    expect(blocked).toBeGreaterThan(0);
    expect(blocked).toBeLessThan(trials * 0.6);
  });

  it('expert respects its time budget on a 19x19 board', () => {
    const board = randomMidgame(19, 30, 11);
    const start = performance.now();
    const move = computeMove('expert', board, sideToMove(board), {
      winLength: 5,
      timeLimitMs: 300,
      rng: createRng(8),
    });
    expect(performance.now() - start).toBeLessThan(1500);
    expect(isValidMove(board, move)).toBe(true);
  });

  function playMatch(expertPiece: Player): Player | null {
    const rng = createRng(21);
    let board = createBoard(15);
    let turn: Player = 'X';
    for (let ply = 0; ply < 80; ply++) {
      const difficulty: Difficulty = turn === expertPiece ? 'expert' : 'hard';
      const pos = computeMove(difficulty, board, turn, { winLength: 5, timeLimitMs: 200, rng });
      board = makeMove(board, pos, turn);
      if (getWinningCells(board, pos, 5)) return turn;
      turn = otherPlayer(turn);
    }
    return null;
  }

  it('expert scores at least as well as hard over a colour-swapped pair of games', () => {
    // Freestyle gomoku favours the first player, so each side is compared over both colours.
    const winners = (['X', 'O'] as const).map((expertPiece) => [expertPiece, playMatch(expertPiece)] as const);
    const expertWins = winners.filter(([piece, winner]) => winner === piece).length;
    const hardWins = winners.filter(([piece, winner]) => winner !== null && winner !== piece).length;
    expect(expertWins).toBeGreaterThanOrEqual(hardWins);
    expect(expertWins).toBeGreaterThan(0);
  }, 120_000);
});

describe('createAIPlayer', () => {
  it('resolves a legal move asynchronously', async () => {
    const board = createBoard(15);
    const move = await createAIPlayer('medium', { winLength: 5 }).getMove(board, 'X');
    expect(isValidMove(board, move)).toBe(true);
  });

  it('rejects with AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createAIPlayer('easy', { winLength: 5 }).getMove(createBoard(15), 'X', controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
