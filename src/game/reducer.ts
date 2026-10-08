import { InvalidMoveError, createBoard, makeMove } from './board';
import { checkDraw, getWinningCells, otherPlayer } from './rules';
import {
  DEFAULT_SETTINGS,
  toConfig,
  type Board,
  type GameConfig,
  type GameState,
  type GameStatus,
  type Move,
  type Player,
  type Position,
} from './types';

export type GameAction =
  | { type: 'start'; config: GameConfig; random: number }
  | { type: 'place'; position: Position }
  | { type: 'computerMove'; position: Position; atMove: number }
  | { type: 'undo' }
  | { type: 'restart'; random: number }
  | { type: 'reset' };

export function createInitialState(config: GameConfig = toConfig(DEFAULT_SETTINGS)): GameState {
  return {
    config,
    board: createBoard(config.boardSize),
    currentPlayer: 'X',
    computerPiece: null,
    history: [],
    status: 'idle',
    result: null,
    invalidMoves: 0,
  };
}

function resolveFirstPlayer(config: GameConfig, random: number): Player {
  if (config.mode === 'pvp') return 'X';
  const human = config.playerPiece;
  switch (config.firstMover) {
    case 'player':
      return human;
    case 'computer':
      return otherPlayer(human);
    case 'random':
      return random < 0.5 ? human : otherPlayer(human);
  }
}

function begin(config: GameConfig, random: number, invalidMoves: number): GameState {
  const first = resolveFirstPlayer(config, random);
  const computerPiece = config.mode === 'pvc' ? otherPlayer(config.playerPiece) : null;
  return {
    config,
    board: createBoard(config.boardSize),
    currentPlayer: first,
    computerPiece,
    history: [],
    status: first === computerPiece ? 'computer-thinking' : 'playing',
    result: null,
    invalidMoves,
  };
}

function applyMove(state: GameState, position: Position, expected: GameStatus): GameState {
  if (state.status !== expected) return state;
  const player = state.currentPlayer;
  let board: Board;
  try {
    board = makeMove(state.board, position, player);
  } catch (error) {
    if (error instanceof InvalidMoveError) return { ...state, invalidMoves: state.invalidMoves + 1 };
    throw error;
  }
  const history: Move[] = [...state.history, { position, player }];
  const cells = getWinningCells(board, position, state.config.winLength);
  if (cells) {
    return { ...state, board, history, status: 'won', result: { kind: 'win', winner: player, cells } };
  }
  if (checkDraw(board)) {
    return { ...state, board, history, status: 'draw', result: { kind: 'draw' } };
  }
  const next = otherPlayer(player);
  return {
    ...state,
    board,
    history,
    currentPlayer: next,
    status: next === state.computerPiece ? 'computer-thinking' : 'playing',
  };
}

export function canUndo(state: GameState): boolean {
  if (state.status !== 'playing') return false;
  return state.config.mode === 'pvc' ? state.history.length >= 2 : state.history.length >= 1;
}

function undo(state: GameState): GameState {
  if (!canUndo(state)) return state;
  const remove = state.config.mode === 'pvc' ? 2 : 1;
  const history = state.history.slice(0, state.history.length - remove);
  const undone = state.history[state.history.length - remove];
  let board = createBoard(state.config.boardSize);
  for (const move of history) board = makeMove(board, move.position, move.player);
  return { ...state, board, history, currentPlayer: undone.player, status: 'playing', result: null };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      return begin(action.config, action.random, state.invalidMoves);
    case 'restart':
      return begin(state.config, action.random, state.invalidMoves);
    case 'reset':
      return { ...createInitialState(state.config), invalidMoves: state.invalidMoves };
    case 'place':
      return applyMove(state, action.position, 'playing');
    case 'computerMove':
      // A result computed for an earlier game/position must never be applied to the current one.
      if (action.atMove !== state.history.length) return state;
      return applyMove(state, action.position, 'computer-thinking');
    case 'undo':
      return undo(state);
  }
}
