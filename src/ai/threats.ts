import { getCandidates } from './candidates';
import { DIRS, makesWin, opponentOf, type Code, type Grid } from './grid';

/**
 * Empty cells that would complete a line for `code` if `code` also owned `idx`
 * (the completion cells of the "four" created by playing `idx`).
 */
export function fourCompletions(g: Grid, idx: number, code: Code): number[] {
  const { size, cells, winLength: wl } = g;
  const row = Math.floor(idx / size);
  const col = idx % size;
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    for (let start = -(wl - 1); start <= 0; start++) {
      let own = 0;
      let empty = -1;
      let ok = true;
      for (let i = 0; i < wl; i++) {
        const r = row + (start + i) * dr;
        const c = col + (start + i) * dc;
        if (r < 0 || r >= size || c < 0 || c >= size) {
          ok = false;
          break;
        }
        const j = r * size + c;
        if (j === idx || cells[j] === code) own++;
        else if (cells[j] === 0) empty = j;
        else {
          ok = false;
          break;
        }
      }
      if (ok && own === wl - 1 && empty >= 0 && !out.includes(empty)) out.push(empty);
    }
  }
  return out;
}

/** Victory by continuous fours: `code` to move; returns the first move of a forced win, or null. */
function vcf(g: Grid, code: Code, depth: number, deadline: number): number | null {
  const cands = getCandidates(g);
  for (const c of cands) if (makesWin(g, c, code)) return c;
  if (depth <= 0 || performance.now() > deadline) return null;
  const opp = opponentOf(code);
  if (cands.some((c) => makesWin(g, c, opp))) return null;
  for (const c of cands) {
    const completions = fourCompletions(g, c, code);
    if (completions.length === 0) continue;
    if (completions.length >= 2) return c;
    const block = completions[0];
    g.cells[c] = code;
    g.cells[block] = opp;
    const next = vcf(g, code, depth - 1, deadline);
    g.cells[block] = 0;
    g.cells[c] = 0;
    if (next !== null) return c;
  }
  return null;
}

export function findVcfWin(g: Grid, code: Code, maxDepth = 8, timeLimitMs = 300): number | null {
  return vcf(g, code, maxDepth, performance.now() + timeLimitMs);
}

/** The first of `moves` after which the opponent has no forced win by continuous fours, or null. */
export function findVcfDefence(
  g: Grid,
  code: Code,
  moves: number[],
  maxDepth: number,
  deadline: number,
): number | null {
  const opp = opponentOf(code);
  for (const move of moves) {
    if (g.cells[move] !== 0) continue;
    g.cells[move] = code;
    const lost = vcf(g, opp, maxDepth, deadline) !== null;
    g.cells[move] = 0;
    if (!lost) return move;
  }
  return null;
}
