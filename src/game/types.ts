export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Board = readonly (readonly Cell[])[];

export interface Position {
  row: number;
  col: number;
}
export type AIMove = Position;

export type GameMode = 'pvc' | 'pvp';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type FirstMover = 'player' | 'computer' | 'random';
export type GameStatus = 'idle' | 'playing' | 'computer-thinking' | 'won' | 'draw';

export const WIN_LENGTH = 5;
export const BOARD_SIZES = [10, 15, 19] as const;
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** User-editable options (persisted). */
export interface GameSettings {
  mode: GameMode;
  boardSize: number;
  playerPiece: Player;
  firstMover: FirstMover;
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'pvc',
  boardSize: 15,
  playerPiece: 'X',
  firstMover: 'player',
  difficulty: 'medium',
};

export interface GameConfig extends GameSettings {
  winLength: number;
}

export function toConfig(settings: GameSettings, winLength: number = WIN_LENGTH): GameConfig {
  return { ...settings, winLength };
}

export interface Move {
  position: Position;
  player: Player;
}

export type GameResult =
  | { kind: 'win'; winner: Player; cells: Position[] }
  | { kind: 'draw' };

export interface GameState {
  config: GameConfig;
  board: Board;
  currentPlayer: Player;
  /** The computer's piece in Player vs Computer mode, otherwise null. */
  computerPiece: Player | null;
  history: Move[];
  status: GameStatus;
  result: GameResult | null;
  /** Incremented every time an illegal move is attempted (drives the "invalid" sound). */
  invalidMoves: number;
}
