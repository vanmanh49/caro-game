import { memo } from 'react';
import type { Cell } from '../game/types';
import { Piece } from './Piece';

interface BoardCellProps {
  row: number;
  col: number;
  value: Cell;
  label: string;
  isLast: boolean;
  isWin: boolean;
  tabbable: boolean;
  blocked: boolean;
  onPlace: (row: number, col: number) => void;
}

function BoardCellView({ row, col, value, label, isLast, isWin, tabbable, blocked, onPlace }: BoardCellProps) {
  const className = ['cell', value ? 'cell--filled' : 'cell--empty', isLast && 'cell--last', isWin && 'cell--win']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      role="gridcell"
      className={className}
      data-pos={`${row}-${col}`}
      aria-label={label}
      aria-disabled={blocked || value !== null}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => onPlace(row, col)}
    >
      {value && <Piece player={value} />}
    </button>
  );
}

export const BoardCell = memo(BoardCellView);
