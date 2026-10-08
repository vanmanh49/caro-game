import type { Board, Difficulty, Player, Position } from '../game/types';

export interface AIPlayer {
  getMove(board: Board, player: Player, signal?: AbortSignal): Promise<Position>;
}

export interface WorkerRequest {
  id: number;
  difficulty: Difficulty;
  board: Board;
  player: Player;
  winLength: number;
}

export type WorkerResponse = { id: number; move: Position } | { id: number; error: string };
