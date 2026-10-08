import { getCandidates, openingMove } from './candidates';
import { rankCandidates } from './evaluation';
import { makesWin, opponentOf, type Code, type Grid } from './grid';
import { searchBestMove } from './minimax';
import { findVcfDefence, findVcfWin } from './threats';

export const EXPERT_TIME_MS = 1500;

/**
 * Order of play: opening -> win now -> block now -> own forced win by continuous fours ->
 * stop the opponent's forced win -> iterative-deepening alpha-beta within the time budget.
 */
export function chooseExpertMove(g: Grid, code: Code, rng: () => number, timeLimitMs = EXPERT_TIME_MS): number {
  const startedAt = performance.now();
  const opening = openingMove(g, rng);
  if (opening !== null) return opening;

  const cands = getCandidates(g);
  const win = cands.find((c) => makesWin(g, c, code));
  if (win !== undefined) return win;
  const opp = opponentOf(code);
  const block = cands.find((c) => makesWin(g, c, opp));
  if (block !== undefined) return block;

  const threatBudget = Math.min(300, timeLimitMs * 0.2);
  const forced = findVcfWin(g, code, 10, threatBudget);
  if (forced !== null) return forced;
  if (findVcfWin(g, opp, 10, threatBudget) !== null) {
    const ranked = rankCandidates(g, cands, code).slice(0, 20);
    const defence = findVcfDefence(g, code, ranked, 10, performance.now() + threatBudget);
    if (defence !== null) return defence;
  }

  const remaining = Math.max(50, timeLimitMs - (performance.now() - startedAt));
  return searchBestMove(g, code, {
    maxDepth: 8,
    maxCandidates: g.size >= 19 ? 12 : 14,
    timeLimitMs: remaining,
    startDepth: 2,
  }).idx;
}
