import { countStones, type Grid } from './grid';

/** Empty cells within `radius` of any stone; the centre cell on an empty board. */
export function getCandidates(g: Grid, radius = 2): number[] {
  const { size, cells } = g;
  const mark = new Uint8Array(cells.length);
  const out: number[] = [];
  let anyStone = false;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 0) continue;
    anyStone = true;
    const r = Math.floor(i / size);
    const c = i % size;
    for (let dr = -radius; dr <= radius; dr++) {
      const rr = r + dr;
      if (rr < 0 || rr >= size) continue;
      for (let dc = -radius; dc <= radius; dc++) {
        const cc = c + dc;
        if (cc < 0 || cc >= size) continue;
        const j = rr * size + cc;
        if (cells[j] === 0 && mark[j] === 0) {
          mark[j] = 1;
          out.push(j);
        }
      }
    }
  }
  if (!anyStone) {
    const mid = Math.floor(size / 2);
    return [mid * size + mid];
  }
  return out;
}

/** Centre on an empty board, a random neighbour of the lone stone after one move, otherwise null. */
export function openingMove(g: Grid, rng: () => number): number | null {
  const stones = countStones(g);
  if (stones === 0) {
    const mid = Math.floor(g.size / 2);
    return mid * g.size + mid;
  }
  if (stones === 1) {
    const near = getCandidates(g, 1);
    return near[Math.floor(rng() * near.length)];
  }
  return null;
}
