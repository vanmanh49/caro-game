import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer, type GameAction } from '../src/game/reducer';
import { DEFAULT_SETTINGS, toConfig, type GameConfig } from '../src/game/types';
import { cellLabel, describeLastMove, getResultCopy, getStatusText } from '../src/utils/messages';
import { boardWith } from './helpers';

const cfg = (over: Partial<GameConfig>): GameConfig => ({ ...toConfig(DEFAULT_SETTINGS), ...over });
const place = (row: number, col: number): GameAction => ({ type: 'place', position: { row, col } });
const cm = (row: number, col: number, atMove: number): GameAction => ({
  type: 'computerMove',
  position: { row, col },
  atMove,
});
const run = (actions: GameAction[]) => actions.reduce(gameReducer, createInitialState());

describe('cellLabel', () => {
  it('uses 1-based rows and columns', () => {
    const board = boardWith(15, { X: [[4, 6]] });
    expect(cellLabel(board, 0, 0)).toBe('Row 1, Column 1, Empty');
    expect(cellLabel(board, 4, 6)).toBe('Row 5, Column 7, occupied by X');
    expect(cellLabel(board, 4, 6, true)).toBe('Row 5, Column 7, occupied by X, part of the winning line');
  });
});

describe('status text', () => {
  it('Player vs Computer turns', () => {
    expect(getStatusText(run([{ type: 'start', config: cfg({}), random: 0 }]))).toBe('Your Turn');
    expect(getStatusText(run([{ type: 'start', config: cfg({ firstMover: 'computer' }), random: 0 }]))).toBe(
      "Computer's Turn",
    );
  });

  it('Player vs Player turns', () => {
    const s = run([{ type: 'start', config: cfg({ mode: 'pvp' }), random: 0 }]);
    expect(getStatusText(s)).toBe("Player X's Turn");
  });

  it('results', () => {
    const won = run([
      { type: 'start', config: cfg({ firstMover: 'player' }), random: 0 },
      place(7, 3), cm(0, 0, 1), place(7, 4), cm(0, 2, 3), place(7, 5), cm(0, 4, 5), place(7, 6), cm(0, 6, 7), place(7, 7),
    ]);
    expect(getStatusText(won)).toBe('You Win!');
    expect(getResultCopy(won)).toEqual({ tone: 'win', title: '🎉 You Win!', message: 'Excellent move!' });
    expect(describeLastMove(won)).toBe('X placed at row 8, column 8.');
  });

  it('computer win and draw copy', () => {
    const lost = run([
      { type: 'start', config: cfg({ firstMover: 'computer' }), random: 0 },
      cm(7, 3, 0), place(0, 0), cm(7, 4, 2), place(0, 2), cm(7, 5, 4), place(0, 4), cm(7, 6, 6), place(0, 6), cm(7, 7, 8),
    ]);
    expect(getStatusText(lost)).toBe('Computer Wins');
    expect(getResultCopy(lost)).toEqual({
      tone: 'lose',
      title: 'Game Over',
      message: 'The computer wins this round.',
    });
    const draw = run([
      { type: 'start', config: cfg({ mode: 'pvp', boardSize: 3, winLength: 3 }), random: 0 },
      place(0, 0), place(0, 1), place(0, 2), place(1, 1), place(1, 0), place(1, 2), place(2, 1), place(2, 0), place(2, 2),
    ]);
    expect(getStatusText(draw)).toBe('Draw');
    expect(getResultCopy(draw)).toEqual({
      tone: 'draw',
      title: "It's a Draw!",
      message: 'Neither player could complete five in a row.',
    });
  });

  it('has no result copy while playing', () => {
    expect(getResultCopy(createInitialState())).toBeNull();
  });
});
