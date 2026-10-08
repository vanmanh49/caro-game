import { getCandidates } from './candidates';
import { WIN_SCORE, evaluate, rankCandidates } from './evaluation';
import { makesWin, opponentOf, type Code, type Grid } from './grid';
import { Zobrist } from './zobrist';

export interface SearchOptions {
  maxDepth: number;
  maxCandidates: number;
  timeLimitMs?: number;
  startDepth?: number;
}

export interface SearchResult {
  idx: number;
  score: number;
  depth: number;
  timedOut: boolean;
}

type Bound = 0 | 1 | 2; // exact, lower bound, upper bound

interface TTEntry {
  check: number;
  depth: number;
  score: number;
  bound: Bound;
  best: number;
}

const MAX_PLY = 64;
const TT_LIMIT = 400_000;

export class Searcher {
  private readonly zobrist: Zobrist;
  private readonly tt = new Map<number, TTEntry>();
  private readonly killers: number[][] = Array.from({ length: MAX_PLY }, () => [-1, -1]);
  private lo = 0;
  private hi = 0;
  private nodes = 0;
  private deadline = Infinity;
  private timedOut = false;

  constructor(
    private readonly g: Grid,
    private readonly maxCandidates: number,
  ) {
    this.zobrist = new Zobrist(g.cells.length);
    for (let i = 0; i < g.cells.length; i++) {
      const v = g.cells[i];
      if (v !== 0) this.toggle(i, v as Code);
    }
  }

  private toggle(idx: number, code: Code): void {
    const k = this.zobrist.index(idx, code);
    this.lo ^= this.zobrist.lo[k];
    this.hi ^= this.zobrist.hi[k];
  }

  private put(idx: number, code: Code): void {
    this.g.cells[idx] = code;
    this.toggle(idx, code);
  }

  private remove(idx: number, code: Code): void {
    this.g.cells[idx] = 0;
    this.toggle(idx, code);
  }

  private recordKiller(ply: number, move: number): void {
    const k = this.killers[ply];
    if (k[0] !== move) {
      k[1] = k[0];
      k[0] = move;
    }
  }

  /** A terminal score for the side to move, or the ordered list of moves worth searching. */
  private generate(code: Code, ply: number, ttBest: number): number | number[] {
    const g = this.g;
    const opp = opponentOf(code);
    const cands = getCandidates(g);
    if (cands.length === 0) return 0;
    for (const c of cands) if (makesWin(g, c, code)) return WIN_SCORE - ply;
    const threats = cands.filter((c) => makesWin(g, c, opp));
    if (threats.length >= 2) return -(WIN_SCORE - ply - 1);
    if (threats.length === 1) return threats;
    const moves = rankCandidates(g, cands, code).slice(0, this.maxCandidates);
    const priority = [ttBest, ...this.killers[ply]].filter(
      (m, i, all) => m >= 0 && moves.includes(m) && all.indexOf(m) === i,
    );
    return priority.length ? [...priority, ...moves.filter((m) => !priority.includes(m))] : moves;
  }

  private negamax(depth: number, alpha: number, beta: number, code: Code, ply: number): number {
    if ((++this.nodes & 511) === 0 && performance.now() > this.deadline) this.timedOut = true;
    if (this.timedOut) return 0;
    if (depth === 0) return evaluate(this.g, code);

    let ttBest = -1;
    const entry = this.tt.get(this.lo);
    if (entry && entry.check === this.hi) {
      ttBest = entry.best;
      if (entry.depth >= depth) {
        if (entry.bound === 0) return entry.score;
        if (entry.bound === 1 && entry.score >= beta) return entry.score;
        if (entry.bound === 2 && entry.score <= alpha) return entry.score;
      }
    }

    const generated = this.generate(code, ply, ttBest);
    if (typeof generated === 'number') return generated;

    const alpha0 = alpha;
    const opp = opponentOf(code);
    let best = -Infinity;
    let bestMove = generated[0];
    for (const move of generated) {
      this.put(move, code);
      const score = -this.negamax(depth - 1, -beta, -alpha, opp, ply + 1);
      this.remove(move, code);
      if (this.timedOut) return 0;
      if (score > best) {
        best = score;
        bestMove = move;
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        this.recordKiller(ply, move);
        break;
      }
    }

    if (this.tt.size > TT_LIMIT) this.tt.clear();
    const bound: Bound = best <= alpha0 ? 2 : best >= beta ? 1 : 0;
    this.tt.set(this.lo, { check: this.hi, depth, score: best, bound, best: bestMove });
    return best;
  }

  search(code: Code, opts: SearchOptions): SearchResult {
    const g = this.g;
    const opp = opponentOf(code);
    this.deadline = opts.timeLimitMs === undefined ? Infinity : performance.now() + opts.timeLimitMs;

    const cands = getCandidates(g);
    if (cands.length === 0) throw new Error('No moves available');
    for (const c of cands) {
      if (makesWin(g, c, code)) return { idx: c, score: WIN_SCORE, depth: 0, timedOut: false };
    }
    const threats = cands.filter((c) => makesWin(g, c, opp));
    if (threats.length > 0) return { idx: threats[0], score: 0, depth: 0, timedOut: false };

    let rootMoves = rankCandidates(g, cands, code).slice(0, this.maxCandidates);
    let best: SearchResult = { idx: rootMoves[0], score: -Infinity, depth: 0, timedOut: false };

    for (let depth = opts.startDepth ?? 1; depth <= opts.maxDepth; depth++) {
      let alpha = -Infinity;
      let depthBest = -1;
      let depthScore = -Infinity;
      for (const move of rootMoves) {
        this.put(move, code);
        const score = -this.negamax(depth - 1, -Infinity, -alpha, opp, 1);
        this.remove(move, code);
        if (this.timedOut) break;
        if (score > depthScore) {
          depthScore = score;
          depthBest = move;
        }
        if (score > alpha) alpha = score;
      }
      if (this.timedOut) {
        best = { ...best, timedOut: true };
        break;
      }
      best = { idx: depthBest, score: depthScore, depth, timedOut: false };
      if (depthScore >= WIN_SCORE - MAX_PLY) break;
      rootMoves = [depthBest, ...rootMoves.filter((m) => m !== depthBest)];
    }
    return best;
  }
}

export function searchBestMove(g: Grid, code: Code, opts: SearchOptions): SearchResult {
  return new Searcher(g, opts.maxCandidates).search(code, opts);
}
