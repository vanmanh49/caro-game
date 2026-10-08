import type { GameState, Player } from '../game/types';
import { DIFFICULTY_LABEL } from '../utils/labels';
import { describeLastMove, getStatusText } from '../utils/messages';
import { Piece } from './Piece';

function PlayerChip({ piece, label, active }: { piece: Player; label: string; active: boolean }) {
  return (
    <li className={`chip ${active ? 'chip--active' : ''}`}>
      <Piece player={piece} />
      <span className="chip__label">{label}</span>
      {active && <span className="chip__turn">to move</span>}
    </li>
  );
}

export function GameStatus({ state }: { state: GameState }) {
  const { config, status, currentPlayer } = state;
  const text = getStatusText(state);
  const thinking = status === 'computer-thinking';
  const playing = status === 'playing' || thinking;
  const pvc = config.mode === 'pvc';
  const players: Array<{ piece: Player; label: string }> = pvc
    ? [
        { piece: config.playerPiece, label: 'You' },
        { piece: config.playerPiece === 'X' ? 'O' : 'X', label: 'Computer' },
      ]
    : [
        { piece: 'X', label: 'Player X' },
        { piece: 'O', label: 'Player O' },
      ];
  return (
    <section className="panel status" aria-label="Game status">
      <p className="status__headline" data-over={!playing}>{text}</p>
      <p className="status__thinking" aria-hidden={!thinking} data-visible={thinking}>
        Computer is thinking
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
      </p>
      <ul className="status__players">
        {players.map((p) => (
          <PlayerChip key={p.piece} piece={p.piece} label={p.label} active={playing && currentPlayer === p.piece} />
        ))}
      </ul>
      {pvc && (
        <p className="status__difficulty">
          Difficulty <span className="badge">{DIFFICULTY_LABEL[config.difficulty]}</span>
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {thinking ? 'Computer is thinking…' : `${describeLastMove(state)} ${text}`.trim()}
      </p>
    </section>
  );
}
