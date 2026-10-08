import type { CSSProperties } from 'react';
import type { GameMode } from '../game/types';
import { Button } from './Button';
import { HelpIcon, SettingsIcon } from './Icons';
import { MiniBoard } from './MiniBoard';

const HERO_STONES = [
  { row: 1, col: 1, player: 'X' as const },
  { row: 2, col: 2, player: 'X' as const },
  { row: 3, col: 3, player: 'X' as const },
  { row: 4, col: 4, player: 'X' as const },
  { row: 5, col: 5, player: 'X' as const },
  { row: 1, col: 4, player: 'O' as const },
  { row: 2, col: 4, player: 'O' as const },
  { row: 3, col: 4, player: 'O' as const },
  { row: 4, col: 2, player: 'O' as const },
];
const HERO_WIN = [1, 2, 3, 4, 5].map((n) => ({ row: n, col: n }));

interface HomeScreenProps {
  onStart: (mode: GameMode) => void;
  onHowToPlay: () => void;
  onSettings: () => void;
}

export function HomeScreen({ onStart, onHowToPlay, onSettings }: HomeScreenProps) {
  const rise = (i: number) => ({ '--i': i }) as CSSProperties;
  return (
    <div className="home">
      <MiniBoard size={7} stones={HERO_STONES} highlight={HERO_WIN} className="home__board rise" />
      <h1 className="home__title rise" style={rise(1)}>CARO</h1>
      <p className="home__tagline rise" style={rise(2)}>Challenge Yourself</p>
      <p className="home__desc rise" style={rise(3)}>
        Line up five pieces before your opponent does. Play the computer at four skill levels, or share the board with a friend.
      </p>
      <div className="home__actions rise" style={rise(4)}>
        <Button variant="primary" size="lg" onClick={() => onStart('pvc')}>Player vs Computer</Button>
        <Button size="lg" onClick={() => onStart('pvp')}>Player vs Player</Button>
      </div>
      <div className="home__links rise" style={rise(5)}>
        <Button variant="ghost" icon={<HelpIcon />} onClick={onHowToPlay}>How to Play</Button>
        <Button variant="ghost" icon={<SettingsIcon />} onClick={onSettings}>Settings</Button>
      </div>
    </div>
  );
}
