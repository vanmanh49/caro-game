import { Button } from './Button';
import { HomeIcon, PlusIcon, RestartIcon, SettingsIcon, UndoIcon } from './Icons';

interface GameControlsProps {
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onHome: () => void;
}

export function GameControls({ canUndo, onUndo, onRestart, onNewGame, onSettings, onHome }: GameControlsProps) {
  return (
    <section className="panel controls" aria-label="Game controls">
      <Button icon={<UndoIcon />} onClick={onUndo} disabled={!canUndo}>Undo</Button>
      <Button icon={<RestartIcon />} onClick={onRestart} title="Replay with the same settings; the score is kept">
        Restart
      </Button>
      <Button icon={<PlusIcon />} onClick={onNewGame} title="Start fresh with your saved settings and reset the score">
        New Game
      </Button>
      <Button icon={<SettingsIcon />} onClick={onSettings}>Settings</Button>
      <Button icon={<HomeIcon />} onClick={onHome} className="controls__home">Back to Home</Button>
    </section>
  );
}
