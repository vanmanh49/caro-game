import type { Scoreboard } from '../game/scoreboard';
import type { GameMode } from '../game/types';

interface ScoreBoardProps {
  mode: GameMode;
  scoreboard: Scoreboard;
}

export function ScoreBoard({ mode, scoreboard }: ScoreBoardProps) {
  const pvc = mode === 'pvc';
  const left = pvc
    ? { label: 'You', score: scoreboard.pvc.player }
    : { label: 'Player X', score: scoreboard.pvp.X };
  const right = pvc
    ? { label: 'Computer', score: scoreboard.pvc.computer }
    : { label: 'Player O', score: scoreboard.pvp.O };
  const draws = pvc ? scoreboard.pvc.draws : scoreboard.pvp.draws;
  return (
    <section className="panel score" aria-label="Scoreboard">
      <div className="score__row">
        <div className="score__side">
          <span className="score__label">{left.label}</span>
          <strong className="score__num">{left.score}</strong>
        </div>
        <span className="score__dash" aria-hidden="true">-</span>
        <div className="score__side">
          <span className="score__label">{right.label}</span>
          <strong className="score__num">{right.score}</strong>
        </div>
      </div>
      <p className="score__draws">Draws: {draws}</p>
    </section>
  );
}
