import { describe, expect, it } from 'vitest';
import { canUndo, createInitialState, gameReducer, type GameAction } from '../src/game/reducer';
import { DEFAULT_SETTINGS, toConfig, type GameConfig, type GameState } from '../src/game/types';

const pvp = (over: Partial<GameConfig> = {}): GameConfig => ({
  ...toConfig(DEFAULT_SETTINGS),
  mode: 'pvp',
  ...over,
});
const pvc = (over: Partial<GameConfig> = {}): GameConfig => ({ ...toConfig(DEFAULT_SETTINGS), ...over });

const start = (config: GameConfig, random = 0): GameAction => ({ type: 'start', config, random });
const place = (row: number, col: number): GameAction => ({ type: 'place', position: { row, col } });
const cm = (row: number, col: number, atMove: number): GameAction => ({
  type: 'computerMove',
  position: { row, col },
  atMove,
});
const run = (actions: GameAction[], from: GameState = createInitialState()): GameState =>
  actions.reduce(gameReducer, from);

describe('start', () => {
  it('Player vs Player: X moves first', () => {
    const s = run([start(pvp())]);
    expect(s.status).toBe('playing');
    expect(s.currentPlayer).toBe('X');
    expect(s.computerPiece).toBeNull();
  });

  it('Player vs Computer: player first', () => {
    const s = run([start(pvc({ firstMover: 'player', playerPiece: 'O' }))]);
    expect(s.currentPlayer).toBe('O');
    expect(s.status).toBe('playing');
    expect(s.computerPiece).toBe('X');
  });

  it('Player vs Computer: computer first', () => {
    const s = run([start(pvc({ firstMover: 'computer', playerPiece: 'X' }))]);
    expect(s.currentPlayer).toBe('O');
    expect(s.computerPiece).toBe('O');
    expect(s.status).toBe('computer-thinking');
  });

  it('random first mover uses the supplied random number', () => {
    const cfg = pvc({ firstMover: 'random', playerPiece: 'X' });
    expect(run([start(cfg, 0.1)]).status).toBe('playing');
    expect(run([start(cfg, 0.9)]).status).toBe('computer-thinking');
  });
});

describe('place', () => {
  it('alternates players and records history', () => {
    const s = run([start(pvp()), place(7, 7), place(7, 8)]);
    expect(s.board[7][7]).toBe('X');
    expect(s.board[7][8]).toBe('O');
    expect(s.currentPlayer).toBe('X');
    expect(s.history).toEqual([
      { position: { row: 7, col: 7 }, player: 'X' },
      { position: { row: 7, col: 8 }, player: 'O' },
    ]);
  });

  it('ignores occupied and out-of-bounds cells but counts them as invalid moves', () => {
    const s = run([start(pvp()), place(7, 7), place(7, 7), place(-1, 3), place(15, 0)]);
    expect(s.history).toHaveLength(1);
    expect(s.currentPlayer).toBe('O');
    expect(s.invalidMoves).toBe(3);
  });

  it('ignores human moves while the computer is thinking', () => {
    const thinking = run([start(pvc({ firstMover: 'computer' }))]);
    expect(gameReducer(thinking, place(7, 7))).toBe(thinking);
  });

  it('wins horizontally and then ignores further moves', () => {
    const won = run([
      start(pvp()),
      place(7, 3), place(0, 0),
      place(7, 4), place(0, 2),
      place(7, 5), place(0, 4),
      place(7, 6), place(0, 6),
      place(7, 7),
    ]);
    expect(won.status).toBe('won');
    expect(won.result).toMatchObject({ kind: 'win', winner: 'X' });
    expect(won.result?.kind === 'win' && won.result.cells).toHaveLength(5);
    expect(gameReducer(won, place(10, 10))).toBe(won);
  });

  it('a move that fills the board and completes a line is a win, not a draw', () => {
    const cfg = pvp({ boardSize: 3, winLength: 3 });
    const s = run([
      start(cfg),
      place(0, 0), place(0, 1), place(0, 2), place(1, 0), place(1, 1),
      place(1, 2), place(2, 1), place(2, 0), place(2, 2),
    ]);
    expect(s.status).toBe('won');
    expect(s.result).toMatchObject({ kind: 'win', winner: 'X' });
  });

  it('detects a draw', () => {
    const cfg = pvp({ boardSize: 3, winLength: 3 });
    const s = run([
      start(cfg),
      place(0, 0), place(0, 1), place(0, 2), place(1, 1), place(1, 0),
      place(1, 2), place(2, 1), place(2, 0), place(2, 2),
    ]);
    expect(s.status).toBe('draw');
    expect(s.result).toEqual({ kind: 'draw' });
  });
});

describe('computerMove', () => {
  it('applies the move and hands the turn back to the player', () => {
    const s = run([start(pvc({ firstMover: 'computer' })), cm(7, 7, 0)]);
    expect(s.board[7][7]).toBe('O');
    expect(s.status).toBe('playing');
    expect(s.currentPlayer).toBe('X');
  });

  it('ignores a stale computer move (arrives after a restart)', () => {
    const thinking = run([start(pvc({ firstMover: 'computer' })), cm(7, 7, 0), place(7, 8)]);
    expect(thinking.history).toHaveLength(2);
    const restarted = run([{ type: 'restart', random: 0 }], thinking);
    expect(restarted.status).toBe('computer-thinking');
    expect(gameReducer(restarted, cm(3, 3, 2))).toBe(restarted);
    expect(gameReducer(restarted, cm(3, 3, 0)).board[3][3]).toBe('O');
  });

  it('ignores a computer move when it is not the computer turn', () => {
    const s = run([start(pvc())]);
    expect(gameReducer(s, cm(3, 3, 0))).toBe(s);
  });

  it('a computer win ends the game', () => {
    const s = run([
      start(pvc({ firstMover: 'computer', playerPiece: 'X' })),
      cm(7, 3, 0), place(0, 0),
      cm(7, 4, 2), place(0, 2),
      cm(7, 5, 4), place(0, 4),
      cm(7, 6, 6), place(0, 6),
      cm(7, 7, 8),
    ]);
    expect(s.status).toBe('won');
    expect(s.result).toMatchObject({ kind: 'win', winner: 'O' });
  });
});

describe('undo', () => {
  it('Player vs Player removes one move', () => {
    const s = run([start(pvp()), place(7, 7), place(7, 8), { type: 'undo' }]);
    expect(s.history).toHaveLength(1);
    expect(s.board[7][8]).toBeNull();
    expect(s.currentPlayer).toBe('O');
  });

  it('Player vs Computer removes the player move and the computer reply', () => {
    const before = run([start(pvc()), place(7, 7), cm(7, 8, 1)]);
    expect(canUndo(before)).toBe(true);
    const s = gameReducer(before, { type: 'undo' });
    expect(s.history).toHaveLength(0);
    expect(s.board[7][7]).toBeNull();
    expect(s.board[7][8]).toBeNull();
    expect(s.currentPlayer).toBe('X');
    expect(s.status).toBe('playing');
  });

  it('computer moved first: nothing to undo until the player has moved', () => {
    const s = run([start(pvc({ firstMover: 'computer' })), cm(7, 7, 0)]);
    expect(canUndo(s)).toBe(false);
    expect(gameReducer(s, { type: 'undo' })).toBe(s);
    const later = run([place(7, 8), cm(7, 9, 2)], s);
    expect(canUndo(later)).toBe(true);
    const undone = gameReducer(later, { type: 'undo' });
    expect(undone.history).toHaveLength(1);
    expect(undone.board[7][7]).toBe('O');
    expect(undone.currentPlayer).toBe('X');
  });

  it('is unavailable while thinking and after the game ends', () => {
    const thinking = run([start(pvc({ firstMover: 'computer' }))]);
    expect(canUndo(thinking)).toBe(false);
    const won = run([
      start(pvp()),
      place(7, 3), place(0, 0), place(7, 4), place(0, 2), place(7, 5),
      place(0, 4), place(7, 6), place(0, 6), place(7, 7),
    ]);
    expect(canUndo(won)).toBe(false);
    expect(gameReducer(won, { type: 'undo' })).toBe(won);
  });
});

describe('restart and reset', () => {
  it('restart keeps the config and clears the board', () => {
    const s = run([start(pvp()), place(7, 7), { type: 'restart', random: 0.3 }]);
    expect(s.history).toHaveLength(0);
    expect(s.config.mode).toBe('pvp');
    expect(s.status).toBe('playing');
  });

  it('reset returns to idle', () => {
    expect(run([start(pvp()), place(7, 7), { type: 'reset' }]).status).toBe('idle');
  });
});
