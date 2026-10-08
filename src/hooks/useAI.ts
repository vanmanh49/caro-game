import { useEffect, useMemo } from 'react';
import { createWorkerAIPlayer } from '../ai/workerClient';
import { getAvailableMoves } from '../game/board';
import type { GameState, Position } from '../game/types';

const MIN_THINK_MS = 350;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Drives the computer's turn: asks the AI (in a worker), waits a minimum "thinking" time, then reports the move. */
export function useAI(state: GameState, onMove: (position: Position, atMove: number) => void): void {
  const { difficulty, winLength } = state.config;
  const player = useMemo(() => createWorkerAIPlayer(difficulty, winLength), [difficulty, winLength]);
  useEffect(() => () => player.dispose(), [player]);

  const thinking = state.status === 'computer-thinking';
  const { board, computerPiece } = state;
  const atMove = state.history.length;

  useEffect(() => {
    if (!thinking || computerPiece === null) return;
    const controller = new AbortController();
    Promise.all([player.getMove(board, computerPiece, controller.signal), delay(MIN_THINK_MS)])
      .then(([position]) => {
        if (!controller.signal.aborted) onMove(position, atMove);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        const moves = getAvailableMoves(board); // last resort: never leave the game stuck
        if (moves.length > 0) onMove(moves[Math.floor(Math.random() * moves.length)], atMove);
      });
    return () => controller.abort();
  }, [thinking, board, computerPiece, atMove, player, onMove]);
}
