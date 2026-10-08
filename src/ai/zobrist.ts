import { createRng } from '../utils/random';
import type { Code } from './grid';

export class Zobrist {
  readonly lo: Int32Array;
  readonly hi: Int32Array;

  constructor(cellCount: number, seed = 0x1badb002) {
    const rng = createRng(seed);
    this.lo = new Int32Array(cellCount * 2);
    this.hi = new Int32Array(cellCount * 2);
    for (let i = 0; i < this.lo.length; i++) {
      this.lo[i] = (rng() * 4294967296) | 0;
      this.hi[i] = (rng() * 4294967296) | 0;
    }
  }

  index(idx: number, code: Code): number {
    return idx * 2 + (code - 1);
  }
}
