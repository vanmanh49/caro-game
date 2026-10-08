import { BOARD_SIZES, type GameSettings } from '../game/types';
import type { Theme } from '../utils/guards';
import { Button } from './Button';
import { ChoiceGroup } from './ChoiceGroup';
import { Modal } from './Modal';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  onResetScore: () => void;
}

export function SettingsModal(props: SettingsModalProps) {
  const { open, onClose, theme, onThemeChange, soundEnabled, onSoundChange, settings, onSettingsChange, onResetScore } = props;
  return (
    <Modal open={open} onClose={onClose} labelledBy="settings-title">
      <h2 id="settings-title">Settings</h2>
      <ChoiceGroup<Theme>
        legend="Theme"
        name="settings-theme"
        value={theme}
        onChange={onThemeChange}
        options={[
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ]}
      />
      <label className="switch">
        <input type="checkbox" role="switch" checked={soundEnabled} onChange={(e) => onSoundChange(e.target.checked)} />
        <span>Sound effects</span>
      </label>
      <ChoiceGroup<number>
        legend="Board size (applies to the next game)"
        name="settings-board"
        value={settings.boardSize}
        onChange={(boardSize) => onSettingsChange({ ...settings, boardSize })}
        columns={3}
        options={BOARD_SIZES.map((n) => ({ value: n, title: `${n} × ${n}` }))}
      />
      <Button onClick={onResetScore}>Reset scoreboard</Button>
      <Button variant="primary" onClick={onClose}>Done</Button>
    </Modal>
  );
}
