import { describe, expect, it } from 'vitest';
import { gameReducer, createInitialState, type GameAction } from '../src/game/reducer';
import { EMPTY_SCOREBOARD, recordResult } from '../src/game/scoreboard';
import { DEFAULT_SETTINGS, toConfig, type GameConfig } from '../src/game/types';

const place = (row: number, col: number): GameAction => ({ type: 'place', position: { row, col } });
const cm = (row: number, col: number, atMove: number): GameAction => ({
  type: 'computerMove',
  position: { row, col },
  atMove,
});
const cfg = (over: Partial<GameConfig>): GameConfig => ({ ...toConfig(DEFAULT_SETTINGS), ...over });
const run = (actions: GameAction[]) => actions.reduce(gameReducer, createInitialState());

describe('recordResult', () => {
  it('counts a player win against the computer', () => {
    const s = run([
      { type: 'start', config: cfg({ firstMover: 'player' }), random: 0 },
      place(7, 3), cm(0, 0, 1), place(7, 4), cm(0, 2, 3), place(7, 5), cm(0, 4, 5), place(7, 6), cm(0, 6, 7), place(7, 7),
    ]);
    expect(recordResult(EMPTY_SCOREBOARD, s).pvc).toEqual({ player: 1, computer: 0, draws: 0 });
  });

  it('counts a computer win', () => {
    const s = run([
      { type: 'start', config: cfg({ firstMover: 'computer' }), random: 0 },
      cm(7, 3, 0), place(0, 0), cm(7, 4, 2), place(0, 2), cm(7, 5, 4), place(0, 4), cm(7, 6, 6), place(0, 6), cm(7, 7, 8),
    ]);
    expect(recordResult(EMPTY_SCOREBOARD, s).pvc).toEqual({ player: 0, computer: 1, draws: 0 });
  });

  it('counts draws and Player vs Player wins separately', () => {
    const draw = run([
      { type: 'start', config: cfg({ mode: 'pvp', boardSize: 3, winLength: 3 }), random: 0 },
      place(0, 0), place(0, 1), place(0, 2), place(1, 1), place(1, 0), place(1, 2), place(2, 1), place(2, 0), place(2, 2),
    ]);
    expect(recordResult(EMPTY_SCOREBOARD, draw).pvp.draws).toBe(1);
    const win = run([
      { type: 'start', config: cfg({ mode: 'pvp' }), random: 0 },
      place(7, 3), place(0, 0), place(7, 4), place(0, 2), place(7, 5), place(0, 4), place(7, 6), place(0, 6), place(7, 7),
    ]);
    expect(recordResult(EMPTY_SCOREBOARD, win).pvp).toEqual({ X: 1, O: 0, draws: 0 });
  });

  it('returns the same scoreboard while the game has no result', () => {
    expect(recordResult(EMPTY_SCOREBOARD, createInitialState())).toBe(EMPTY_SCOREBOARD);
  });
});
