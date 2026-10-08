import { getAvailableMoves, isValidMove, validateBoard } from '../game/board';
import type { Board, Difficulty, Player, Position } from '../game/types';
import { getCandidates } from './candidates';
import { chooseEasyMove } from './easyAI';
import { rankCandidates } from './evaluation';
import { chooseExpertMove } from './expertAI';
import { indexToPosition, toCode, toGrid, type Code, type Grid } from './grid';
import { chooseHardMove } from './hardAI';
import { chooseMediumMove } from './mediumAI';

export interface ComputeOptions {
  winLength: number;
  rng?: () => number;
  timeLimitMs?: number;
}

function choose(difficulty: Difficulty, g: Grid, code: Code, rng: () => number, timeLimitMs?: number): number {
  switch (difficulty) {
    case 'easy':
      return chooseEasyMove(g, code, rng);
    case 'medium':
      return chooseMediumMove(g, code, rng);
    case 'hard':
      return chooseHardMove(g, code, rng);
    case 'expert':
      return chooseExpertMove(g, code, rng, timeLimitMs);
  }
}

/**
 * Synchronous AI entry point (used by the worker and the main-thread fallback).
 * Always returns an empty cell; throws only when the board is full or invalid.
 */
export function computeMove(
  difficulty: Difficulty,
  board: Board,
  player: Player,
  options: ComputeOptions,
): Position {
  validateBoard(board);
  const rng = options.rng ?? Math.random;
  const code = toCode(player);
  let position: Position | null = null;
  try {
    const g = toGrid(board, options.winLength);
    const idx = choose(difficulty, g, code, rng, options.timeLimitMs);
    if (Number.isInteger(idx)) position = indexToPosition(g.size, idx);
  } catch {
    position = null;
  }
  if (position && isValidMove(board, position)) return position;

  // Safety net: the AI failed or proposed an illegal cell.
  const g = toGrid(board, options.winLength);
  const best = rankCandidates(g, getCandidates(g), code)[0];
  if (best !== undefined) return indexToPosition(g.size, best);
  const available = getAvailableMoves(board);
  if (available.length === 0) throw new Error('No available moves');
  return available[0];
}
