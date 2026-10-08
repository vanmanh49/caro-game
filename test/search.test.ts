import { describe, expect, it } from 'vitest';
import { searchBestMove } from '../src/ai/minimax';
import { findVcfDefence, findVcfWin, fourCompletions } from '../src/ai/threats';
import { positionToIndex, toGrid } from '../src/ai/grid';
import { boardWith, line, type Stones } from './helpers';

const grid = (stones: Stones, size = 15) => toGrid(boardWith(size, stones), 5);
const at = (row: number, col: number) => positionToIndex(15, { row, col });

// X can play (7,7): row 7 gets X at cols 4-7 (left end blocked by O) and column 7 gets X at rows 4-7.
const FORK: Stones = {
  X: [[7, 4], [7, 5], [7, 6], [4, 7], [5, 7], [6, 7]],
  O: [[7, 3], [3, 7], [12, 12], [12, 2], [2, 12], [13, 5]],
};

describe('searchBestMove', () => {
  it('plays an immediate win', () => {
    const g = grid({ X: line(7, 3, 0, 1, 4), O: [[7, 2], [9, 9], [2, 2], [12, 3]] });
    expect(searchBestMove(g, 1, { maxDepth: 3, maxCandidates: 10 }).idx).toBe(at(7, 7));
  });

  it('blocks an immediate loss', () => {
    const g = grid({ O: line(7, 3, 0, 1, 4), X: [[7, 2], [9, 9], [2, 2], [12, 3]] });
    expect(searchBestMove(g, 1, { maxDepth: 3, maxCandidates: 10 }).idx).toBe(at(7, 7));
  });

  it('finds a double-four fork at shallow depth', () => {
    const g = grid(FORK);
    const result = searchBestMove(g, 1, { maxDepth: 3, maxCandidates: 12 });
    expect(result.idx).toBe(at(7, 7));
    expect(result.score).toBeGreaterThan(900_000_000);
  });

  it('restores the grid it searched', () => {
    const g = grid(FORK);
    const before = Array.from(g.cells);
    searchBestMove(g, 1, { maxDepth: 4, maxCandidates: 10 });
    expect(Array.from(g.cells)).toEqual(before);
  });

  it('respects the time limit and still returns a legal cell', () => {
    const g = grid({ X: [[7, 7], [8, 8]], O: [[7, 8], [8, 7]] });
    const start = performance.now();
    const result = searchBestMove(g, 1, { maxDepth: 12, maxCandidates: 14, timeLimitMs: 100, startDepth: 2 });
    expect(performance.now() - start).toBeLessThan(1000);
    expect(g.cells[result.idx]).toBe(0);
  });

  it('throws when the board is full', () => {
    const full = toGrid(
      [
        ['X', 'O', 'X'],
        ['O', 'X', 'O'],
        ['O', 'X', 'X'],
      ],
      5,
    );
    expect(() => searchBestMove(full, 1, { maxDepth: 2, maxCandidates: 5 })).toThrow();
  });
});

describe('threat search', () => {
  it('fourCompletions lists the cells that would complete five', () => {
    const g = grid(FORK);
    expect(fourCompletions(g, at(7, 7), 1).sort((a, b) => a - b)).toEqual([at(7, 8), at(8, 7)].sort((a, b) => a - b));
    expect(fourCompletions(g, at(0, 0), 1)).toEqual([]);
  });

  it('findVcfWin finds the double four', () => {
    expect(findVcfWin(grid(FORK), 1, 8, 500)).toBe(at(7, 7));
  });

  it('findVcfWin finds a win that needs a forcing four first', () => {
    // Playing (7,8) makes row 7 (cols 5-8, left end blocked) and column 8 (rows 4-7, top end blocked): a double four.
    const g = grid({
      X: [[7, 5], [7, 6], [7, 7], [4, 8], [5, 8], [6, 8]],
      O: [[7, 4], [3, 8], [12, 12], [12, 2], [2, 12], [13, 5]],
    });
    expect(findVcfWin(g, 1, 8, 500)).not.toBeNull();
  });

  it('findVcfWin returns null on a quiet position', () => {
    expect(findVcfWin(grid({ X: [[7, 7]], O: [[7, 8]] }), 1, 8, 200)).toBeNull();
  });

  it('findVcfDefence stops the opponent fork', () => {
    const g = grid({ O: FORK.X, X: FORK.O });
    expect(findVcfWin(g, 2, 8, 500)).not.toBeNull();
    const moves = [at(7, 7), at(7, 8), at(8, 7), at(0, 0)];
    const defence = findVcfDefence(g, 1, moves, 8, performance.now() + 1000);
    expect(defence).not.toBeNull();
    expect(defence).not.toBe(at(0, 0));
    g.cells[defence!] = 1;
    expect(findVcfWin(g, 2, 8, 500)).toBeNull();
  });
});
