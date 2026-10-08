import type { Theme } from '../utils/guards';
import { IconButton } from './Button';
import { MoonIcon, MuteIcon, SunIcon, VolumeIcon } from './Icons';
import { Piece } from './Piece';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onHome?: () => void;
}

export function Header({ theme, onToggleTheme, soundEnabled, onToggleSound, onHome }: HeaderProps) {
  const brand = (
    <>
      <span className="brand__mark">
        <Piece player="X" />
      </span>
      <span>Caro</span>
    </>
  );
  return (
    <header className="header">
      {onHome ? (
        <button type="button" className="brand" onClick={onHome} aria-label="Caro, back to home">
          {brand}
        </button>
      ) : (
        <div className="brand">{brand}</div>
      )}
      <div className="header__tools">
        <IconButton label="Sound effects" aria-pressed={soundEnabled} onClick={onToggleSound}>
          {soundEnabled ? <VolumeIcon /> : <MuteIcon />}
        </IconButton>
        <IconButton
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
      </div>
    </header>
  );
}
