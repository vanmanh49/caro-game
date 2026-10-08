import { DIRS, lineInfo, opponentOf, type Code, type Grid } from './grid';

export const WIN_SCORE = 1_000_000_000;
export const NEAR_WIN = 500_000_000;

const lineCache = new Map<string, Int32Array[]>();

/** Every row, column and diagonal that is long enough to hold a winning line, as arrays of cell indices. */
function getLines(size: number, winLength: number): Int32Array[] {
  const key = `${size}:${winLength}`;
  const cached = lineCache.get(key);
  if (cached) return cached;
  const lines: Int32Array[] = [];
  const push = (cells: number[]) => {
    if (cells.length >= winLength) lines.push(Int32Array.from(cells));
  };
  for (let r = 0; r < size; r++) push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) push(Array.from({ length: size }, (_, r) => r * size + c));
  for (let d = -(size - 1); d <= size - 1; d++) {
    const cells: number[] = [];
    for (let r = 0; r < size; r++) if (r + d >= 0 && r + d < size) cells.push(r * size + r + d);
    push(cells);
  }
  for (let s = 0; s <= 2 * size - 2; s++) {
    const cells: number[] = [];
    for (let r = 0; r < size; r++) if (s - r >= 0 && s - r < size) cells.push(r * size + s - r);
    push(cells);
  }
  lineCache.set(key, lines);
  return lines;
}

/**
 * Static evaluation from the point of view of the side to move.
 * Every window of `winLength` cells containing stones of only one colour scores 10^stones.
 * A window with winLength-1 stones and no enemy stone means that colour completes a line next move.
 */
export function evaluate(g: Grid, toMove: Code): number {
  const { cells, winLength: wl } = g;
  const power = Array.from({ length: wl + 1 }, (_, k) => (k === 0 ? 0 : 10 ** k));
  let s1 = 0;
  let s2 = 0;
  let four1 = false;
  let four2 = false;
  for (const lineCells of getLines(g.size, wl)) {
    let a = 0;
    let b = 0;
    for (let i = 0; i < lineCells.length; i++) {
      const v = cells[lineCells[i]];
      if (v === 1) a++;
      else if (v === 2) b++;
      if (i >= wl) {
        const out = cells[lineCells[i - wl]];
        if (out === 1) a--;
        else if (out === 2) b--;
      }
      if (i < wl - 1) continue;
      if (b === 0 && a > 0) {
        if (a >= wl) return toMove === 1 ? WIN_SCORE : -WIN_SCORE;
        s1 += power[a];
        if (a === wl - 1) four1 = true;
      } else if (a === 0 && b > 0) {
        if (b >= wl) return toMove === 2 ? WIN_SCORE : -WIN_SCORE;
        s2 += power[b];
        if (b === wl - 1) four2 = true;
      }
    }
  }
  const mine = toMove === 1 ? s1 : s2;
  const theirs = toMove === 1 ? s2 : s1;
  const mineFour = toMove === 1 ? four1 : four2;
  const theirFour = toMove === 1 ? four2 : four1;
  if (mineFour) return NEAR_WIN;
  return mine - theirs - (theirFour ? 50_000 : 0);
}

function patternScore(count: number, open: number, winLength: number): number {
  const missing = winLength - count;
  if (missing <= 0) return 1_000_000;
  if (open === 0) return 0;
  switch (missing) {
    case 1:
      return open === 2 ? 100_000 : 10_000;
    case 2:
      return open === 2 ? 5_000 : 500;
    case 3:
      return open === 2 ? 200 : 20;
    case 4:
      return open === 2 ? 10 : 1;
    default:
      return 0;
  }
}

/** Quick attack + defence value of playing `code` on `idx` (used for ordering and the easy levels). */
export function cellHeuristic(g: Grid, idx: number, code: Code): number {
  const opp = opponentOf(code);
  let attack = 0;
  let defence = 0;
  for (const [dr, dc] of DIRS) {
    const mine = lineInfo(g, idx, code, dr, dc);
    attack += patternScore(mine.count, mine.open, g.winLength);
    const theirs = lineInfo(g, idx, opp, dr, dc);
    defence += patternScore(theirs.count, theirs.open, g.winLength);
  }
  const centre = (g.size - 1) / 2;
  const row = Math.floor(idx / g.size);
  const col = idx % g.size;
  const centrality = g.size - Math.max(Math.abs(row - centre), Math.abs(col - centre));
  return attack + defence * 0.95 + centrality;
}

export function rankCandidates(g: Grid, cands: number[], code: Code): number[] {
  return cands
    .map((idx) => ({ idx, score: cellHeuristic(g, idx, code) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.idx);
}
