import type { Board, GameState } from '../game/types';

export function getStatusText(state: GameState): string {
  const { config, status, result, currentPlayer } = state;
  if (status === 'idle') return 'Ready?';
  if (result?.kind === 'draw') return 'Draw';
  if (result?.kind === 'win') {
    if (config.mode === 'pvp') return `Player ${result.winner} Wins!`;
    return result.winner === config.playerPiece ? 'You Win!' : 'Computer Wins';
  }
  if (config.mode === 'pvp') return `Player ${currentPlayer}'s Turn`;
  return currentPlayer === config.playerPiece ? 'Your Turn' : "Computer's Turn";
}

export function describeLastMove(state: GameState): string {
  const last = state.history.at(-1);
  if (!last) return '';
  return `${last.player} placed at row ${last.position.row + 1}, column ${last.position.col + 1}.`;
}

export interface ResultCopy {
  tone: 'win' | 'lose' | 'draw';
  title: string;
  message: string;
}

export function getResultCopy(state: GameState): ResultCopy | null {
  const result = state.result;
  if (!result) return null;
  if (result.kind === 'draw') {
    return { tone: 'draw', title: "It's a Draw!", message: 'Neither player could complete five in a row.' };
  }
  if (state.config.mode === 'pvp') {
    return { tone: 'win', title: `🎉 Player ${result.winner} Wins!`, message: 'Congratulations!' };
  }
  return result.winner === state.config.playerPiece
    ? { tone: 'win', title: '🎉 You Win!', message: 'Excellent move!' }
    : { tone: 'lose', title: 'Game Over', message: 'The computer wins this round.' };
}

export function cellLabel(board: Board, row: number, col: number, isWin = false): string {
  const value = board[row][col];
  const where = `Row ${row + 1}, Column ${col + 1}`;
  if (value === null) return `${where}, Empty`;
  return `${where}, occupied by ${value}${isWin ? ', part of the winning line' : ''}`;
}
