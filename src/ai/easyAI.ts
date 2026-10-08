import { getCandidates } from './candidates';
import { rankCandidates } from './evaluation';
import { emptyCells, makesWin, opponentOf, type Code, type Grid } from './grid';

/** Mostly random; occasionally blocks an obvious four; occasionally plays the best-looking cell. */
export function chooseEasyMove(g: Grid, code: Code, rng: () => number): number {
  const cands = getCandidates(g);
  const roll = rng();
  if (roll < 0.1) return rankCandidates(g, cands, code)[0];
  if (roll < 0.3) {
    const opp = opponentOf(code);
    const block = cands.find((c) => makesWin(g, c, opp));
    if (block !== undefined) return block;
  }
  const pool = rng() < 0.8 ? cands : emptyCells(g);
  return pool[Math.floor(rng() * pool.length)];
}
