import type { Player } from '../game/types';
import { ChoiceGroup } from './ChoiceGroup';
import { Piece } from './Piece';

export function PieceSelector({ value, onChange }: { value: Player; onChange: (p: Player) => void }) {
  return (
    <ChoiceGroup<Player>
      legend="Choose your piece"
      name="setup-piece"
      value={value}
      onChange={onChange}
      options={[
        { value: 'X', title: <span className="choice__piece"><Piece player="X" /> Play as X</span> },
        { value: 'O', title: <span className="choice__piece"><Piece player="O" /> Play as O</span> },
      ]}
    />
  );
}
