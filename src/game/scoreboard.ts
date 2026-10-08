import type { GameState } from './types';

export interface Scoreboard {
  pvc: { player: number; computer: number; draws: number };
  pvp: { X: number; O: number; draws: number };
}

export const EMPTY_SCOREBOARD: Scoreboard = {
  pvc: { player: 0, computer: 0, draws: 0 },
  pvp: { X: 0, O: 0, draws: 0 },
};

export function recordResult(sb: Scoreboard, state: GameState): Scoreboard {
  const result = state.result;
  if (!result) return sb;
  if (state.config.mode === 'pvc') {
    if (result.kind === 'draw') return { ...sb, pvc: { ...sb.pvc, draws: sb.pvc.draws + 1 } };
    const playerWon = result.winner === state.config.playerPiece;
    return {
      ...sb,
      pvc: {
        ...sb.pvc,
        player: sb.pvc.player + (playerWon ? 1 : 0),
        computer: sb.pvc.computer + (playerWon ? 0 : 1),
      },
    };
  }
  if (result.kind === 'draw') return { ...sb, pvp: { ...sb.pvp, draws: sb.pvp.draws + 1 } };
  return { ...sb, pvp: { ...sb.pvp, [result.winner]: sb.pvp[result.winner] + 1 } };
}
