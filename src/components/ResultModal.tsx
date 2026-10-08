import type { GameState } from '../game/types';
import { getResultCopy } from '../utils/messages';
import { Button } from './Button';
import { Modal } from './Modal';

interface ResultModalProps {
  state: GameState;
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  onNewGame: () => void;
  onBackToSetup: () => void;
}

export function ResultModal({ state, open, onClose, onPlayAgain, onNewGame, onBackToSetup }: ResultModalProps) {
  const copy = getResultCopy(state);
  return (
    <Modal open={open && copy !== null} onClose={onClose} labelledBy="result-title">
      {copy && (
        <div className={`result result--${copy.tone}`}>
          <h2 id="result-title">{copy.title}</h2>
          <p>{copy.message}</p>
        </div>
      )}
      <div className="modal__actions">
        <Button variant="primary" onClick={onPlayAgain}>Play Again</Button>
        <Button onClick={onNewGame}>New Game</Button>
        <Button onClick={onBackToSetup}>Back to Setup</Button>
      </div>
      <Button variant="ghost" onClick={onClose}>View board</Button>
    </Modal>
  );
}
