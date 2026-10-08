import { useCallback, useReducer } from 'react';
import { canUndo, createInitialState, gameReducer } from '../game/reducer';
import type { GameConfig, Position } from '../game/types';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialState());

  const start = useCallback((config: GameConfig) => dispatch({ type: 'start', config, random: Math.random() }), []);
  const place = useCallback((position: Position) => dispatch({ type: 'place', position }), []);
  const computerMove = useCallback(
    (position: Position, atMove: number) => dispatch({ type: 'computerMove', position, atMove }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const restart = useCallback(() => dispatch({ type: 'restart', random: Math.random() }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return { state, start, place, computerMove, undo, restart, reset, canUndo: canUndo(state) };
}
