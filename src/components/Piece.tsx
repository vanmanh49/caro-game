import type { Player } from '../game/types';

export function Piece({ player, className = '' }: { player: Player; className?: string }) {
  return player === 'X' ? (
    <svg viewBox="0 0 24 24" className={`piece piece--x ${className}`} aria-hidden="true" focusable="false">
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className={`piece piece--o ${className}`} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}
