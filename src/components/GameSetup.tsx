import { BOARD_SIZES, type FirstMover, type GameMode, type GameSettings } from '../game/types';
import { Button } from './Button';
import { ChoiceGroup } from './ChoiceGroup';
import { DifficultySelector } from './DifficultySelector';
import { PieceSelector } from './PieceSelector';

interface GameSetupProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onStart: () => void;
  onBack: () => void;
}

export function GameSetup({ settings, onChange, onStart, onBack }: GameSetupProps) {
  const pvc = settings.mode === 'pvc';
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onChange({ ...settings, [key]: value });
  return (
    <div className="setup">
      <div className="setup__intro">
        <h1>{pvc ? 'Ready?' : 'Two players, one board'}</h1>
        <p>{pvc ? 'Choose your piece and challenge the AI.' : 'Take turns on the same screen. X goes first.'}</p>
      </div>
      <div className="panel setup__form">
        <ChoiceGroup<GameMode>
          legend="Game mode"
          name="setup-mode"
          value={settings.mode}
          onChange={(mode) => set('mode', mode)}
          options={[
            { value: 'pvc', title: 'Player vs Computer' },
            { value: 'pvp', title: 'Player vs Player' },
          ]}
        />
        {pvc && (
          <>
            <PieceSelector value={settings.playerPiece} onChange={(p) => set('playerPiece', p)} />
            <ChoiceGroup<FirstMover>
              legend="Who goes first?"
              name="setup-first"
              value={settings.firstMover}
              onChange={(f) => set('firstMover', f)}
              columns={3}
              options={[
                { value: 'player', title: 'You' },
                { value: 'computer', title: 'Computer' },
                { value: 'random', title: 'Random' },
              ]}
            />
            <DifficultySelector value={settings.difficulty} onChange={(d) => set('difficulty', d)} />
          </>
        )}
        <ChoiceGroup<number>
          legend="Board size"
          name="setup-board"
          value={settings.boardSize}
          onChange={(n) => set('boardSize', n)}
          columns={3}
          options={BOARD_SIZES.map((n) => ({ value: n, title: `${n} × ${n}` }))}
        />
      </div>
      <div className="setup__actions">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button variant="primary" size="lg" onClick={onStart}>Start Game</Button>
      </div>
    </div>
  );
}
