import { openingMove } from './candidates';
import type { Code, Grid } from './grid';
import { searchBestMove } from './minimax';

/** Wins/blocks immediately (inside the search), otherwise a shallow depth-2 search over the best 8 cells. */
export function chooseMediumMove(g: Grid, code: Code, rng: () => number): number {
  return openingMove(g, rng) ?? searchBestMove(g, code, { maxDepth: 2, maxCandidates: 8 }).idx;
}
