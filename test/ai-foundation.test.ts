import { describe, expect, it } from 'vitest';
import { getCandidates, openingMove } from '../src/ai/candidates';
import { NEAR_WIN, cellHeuristic, evaluate, rankCandidates } from '../src/ai/evaluation';
import { lineInfo, makesWin, positionToIndex, toGrid } from '../src/ai/grid';
import { createRng } from '../src/utils/random';
import { boardWith, line, type Stones } from './helpers';

const grid = (stones: Stones, size = 15) => toGrid(boardWith(size, stones), 5);
const at = (row: number, col: number, size = 15) => positionToIndex(size, { row, col });

describe('createRng', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = createRng(42);
    const b = createRng(42);
    const values = Array.from({ length: 50 }, () => a());
    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('lineInfo / makesWin', () => {
  it('counts the run through a cell and its open ends', () => {
    const g = grid({ X: [[7, 5], [7, 6], [7, 8]] });
    expect(lineInfo(g, at(7, 7), 1, 0, 1)).toEqual({ count: 4, open: 2 });
  });

  it('counts a blocked end', () => {
    const g = grid({ X: [[7, 5], [7, 6]], O: [[7, 4]] });
    expect(lineInfo(g, at(7, 7), 1, 0, 1)).toEqual({ count: 3, open: 1 });
  });

  it('treats the board edge as closed', () => {
    const g = grid({ X: [[0, 0], [0, 1]] });
    expect(lineInfo(g, at(0, 2), 1, 0, 1)).toEqual({ count: 3, open: 1 });
  });

  it('makesWin detects five and ignores four', () => {
    const four = grid({ X: line(7, 3, 0, 1, 4) });
    expect(makesWin(four, at(7, 7), 1)).toBe(true);
    expect(makesWin(four, at(8, 7), 1)).toBe(false);
    expect(makesWin(four, at(7, 7), 2)).toBe(false);
  });
});

describe('candidates', () => {
  it('returns the centre on an empty board', () => {
    expect(getCandidates(grid({}))).toEqual([at(7, 7)]);
  });

  it('returns only empty cells within radius 2 of a stone', () => {
    const g = grid({ X: [[7, 7]] });
    const cands = getCandidates(g);
    expect(cands).toHaveLength(24);
    expect(cands).not.toContain(at(7, 7));
    expect(cands).not.toContain(at(7, 10));
  });

  it('is empty on a full board', () => {
    const g = toGrid(
      [
        ['X', 'O', 'X'],
        ['O', 'X', 'O'],
        ['O', 'X', 'X'],
      ],
      3,
    );
    expect(getCandidates(g)).toEqual([]);
  });

  it('openingMove: centre first, then a neighbour of the single stone, then null', () => {
    const rng = createRng(1);
    expect(openingMove(grid({}), rng)).toBe(at(7, 7));
    const one = openingMove(grid({ X: [[7, 7]] }), rng);
    expect(one).not.toBeNull();
    expect(Math.abs(Math.floor(one! / 15) - 7)).toBeLessThanOrEqual(1);
    expect(openingMove(grid({ X: [[7, 7]], O: [[7, 8]] }), rng)).toBeNull();
  });
});

describe('evaluate', () => {
  it('is antisymmetric between the two sides when no four exists', () => {
    const g = grid({ X: [[7, 7], [7, 8]], O: [[3, 3], [4, 4]] });
    expect(evaluate(g, 1)).toBe(-evaluate(g, 2));
  });

  it('prefers an open three to a closed three', () => {
    const open = grid({ X: line(7, 6, 0, 1, 3) });
    const closed = grid({ X: line(7, 6, 0, 1, 3), O: [[7, 5]] });
    expect(evaluate(open, 1)).toBeGreaterThan(evaluate(closed, 1));
  });

  it('scores a four with a free completion cell as a near win for the side to move', () => {
    const g = grid({ X: line(7, 4, 0, 1, 4) });
    expect(evaluate(g, 1)).toBeGreaterThanOrEqual(NEAR_WIN);
    expect(evaluate(g, 2)).toBeLessThan(0);
  });
});

describe('cell ranking', () => {
  it('ranks the winning cell first, then the blocking cell above a random cell', () => {
    const g = grid({ X: line(7, 3, 0, 1, 4), O: [[7, 2], [3, 3], [11, 11]] });
    const cands = getCandidates(g);
    expect(rankCandidates(g, cands, 1)[0]).toBe(at(7, 7));
    expect(cellHeuristic(g, at(7, 7), 2)).toBeGreaterThan(cellHeuristic(g, at(5, 5), 2));
  });
});
