import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import { playCue, type Cue } from '../utils/audio';
import { isBoolean } from '../utils/guards';
import { useLocalStorage } from './useLocalStorage';

export interface SoundApi {
  enabled: boolean;
  play: (cue: Cue) => void;
}

export const SoundContext = createContext<SoundApi>({ enabled: false, play: () => {} });
export const useSoundContext = () => useContext(SoundContext);

/** Sound preference (off by default) and a `play` function that respects it. */
export function useSound() {
  const [enabled, setEnabled] = useLocalStorage('caro:sound', false, isBoolean);
  const play = useCallback((cue: Cue) => enabled && playCue(cue), [enabled]);
  return { enabled, setEnabled, play };
}

/** Plays placement, invalid-move and result cues as the game state changes. */
export function useGameSounds(state: GameState, play: (cue: Cue) => void): void {
  const moves = useRef(state.history.length);
  const invalid = useRef(state.invalidMoves);
  const resultRef = useRef(state.result);

  useEffect(() => {
    const length = state.history.length;
    const last = state.history.at(-1);
    if (length > moves.current && last && !state.result) play(last.player === 'X' ? 'place-x' : 'place-o');
    moves.current = length;
  }, [state.history, state.result, play]);

  useEffect(() => {
    if (state.invalidMoves > invalid.current) play('invalid');
    invalid.current = state.invalidMoves;
  }, [state.invalidMoves, play]);

  useEffect(() => {
    const result = state.result;
    if (result && result !== resultRef.current) {
      if (result.kind === 'draw') play('draw');
      else if (state.config.mode === 'pvc' && result.winner !== state.config.playerPiece) play('lose');
      else play('win');
    }
    resultRef.current = result;
  }, [state.result, state.config, play]);
}
