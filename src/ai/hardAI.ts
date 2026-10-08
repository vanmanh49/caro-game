import { openingMove } from './candidates';
import type { Code, Grid } from './grid';
import { searchBestMove } from './minimax';

/** Alpha-beta search to depth 3 over the best 12 cells with the full evaluation. */
export function chooseHardMove(g: Grid, code: Code, rng: () => number): number {
  return openingMove(g, rng) ?? searchBestMove(g, code, { maxDepth: 3, maxCandidates: 12 }).idx;
}
