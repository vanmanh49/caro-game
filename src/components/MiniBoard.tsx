import type { CSSProperties } from 'react';
import type { Player, Position } from '../game/types';
import { Piece } from './Piece';

interface MiniBoardProps {
  size: number;
  stones: ReadonlyArray<{ row: number; col: number; player: Player }>;
  highlight?: readonly Position[];
  className?: string;
}

/** Small static board used for decoration and the How to Play example. */
export function MiniBoard({ size, stones, highlight = [], className = '' }: MiniBoardProps) {
  const cells = Array.from({ length: size * size }, (_, i) => {
    const row = Math.floor(i / size);
    const col = i % size;
    const stone = stones.find((s) => s.row === row && s.col === col);
    const lit = highlight.some((p) => p.row === row && p.col === col);
    return (
      <div key={i} className={`mini__cell ${lit ? 'mini__cell--hl' : ''}`}>
        {stone && <Piece player={stone.player} />}
      </div>
    );
  });
  return (
    <div className={`mini ${className}`} style={{ '--n': size } as CSSProperties} aria-hidden="true">
      {cells}
    </div>
  );
}
