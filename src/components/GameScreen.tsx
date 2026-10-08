import { useCallback, useEffect, useState } from 'react';
import type { Scoreboard } from '../game/scoreboard';
import type { GameState, Position } from '../game/types';
import { GameBoard } from './GameBoard';
import { GameControls } from './GameControls';
import { GameStatus } from './GameStatus';
import { ResultModal } from './ResultModal';
import { ScoreBoard } from './ScoreBoard';

const NO_CELLS: readonly Position[] = [];
const RESULT_DELAY_MS = 900; // let the winning line be seen before the modal opens

interface GameScreenProps {
  state: GameState;
  scoreboard: Scoreboard;
  canUndo: boolean;
  onPlace: (position: Position) => void;
  onUndo: () => void;
  onRestart: () => void;
  onNewGame: () => void;
  onBackToSetup: () => void;
  onHome: () => void;
  onSettings: () => void;
}

export function GameScreen({
  state,
  scoreboard,
  canUndo,
  onPlace,
  onUndo,
  onRestart,
  onNewGame,
  onBackToSetup,
  onHome,
  onSettings,
}: GameScreenProps) {
  const [resultOpen, setResultOpen] = useState(false);
  useEffect(() => {
    if (!state.result) {
      setResultOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setResultOpen(true), RESULT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.result]);

  const handlePlace = useCallback((row: number, col: number) => onPlace({ row, col }), [onPlace]);
  const closeResult = useCallback(() => setResultOpen(false), []);

  return (
    <div className="game">
      <div className="game__status">
        <GameStatus state={state} />
      </div>
      <div className="board-wrap">
        <GameBoard
          key={state.board.length}
          board={state.board}
          currentPlayer={state.currentPlayer}
          lastMove={state.history.at(-1)?.position ?? null}
          winningCells={state.result?.kind === 'win' ? state.result.cells : NO_CELLS}
          interactive={state.status === 'playing'}
          onPlace={handlePlace}
        />
      </div>
      <div className="game__rest">
        <ScoreBoard mode={state.config.mode} scoreboard={scoreboard} />
        <GameControls
          canUndo={canUndo}
          onUndo={onUndo}
          onRestart={onRestart}
          onNewGame={onNewGame}
          onSettings={onSettings}
          onHome={onHome}
        />
      </div>
      <ResultModal
        state={state}
        open={resultOpen}
        onClose={closeResult}
        onPlayAgain={onRestart}
        onNewGame={onNewGame}
        onBackToSetup={onBackToSetup}
      />
    </div>
  );
}
