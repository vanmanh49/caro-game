import { useCallback, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from 'react';
import type { Board, Player, Position } from '../game/types';
import { cellLabel } from '../utils/messages';
import { BoardCell } from './BoardCell';

interface GameBoardProps {
  board: Board;
  currentPlayer: Player;
  lastMove: Position | null;
  winningCells: readonly Position[];
  interactive: boolean;
  onPlace: (row: number, col: number) => void;
}

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

export function GameBoard({ board, currentPlayer, lastMove, winningCells, interactive, onPlace }: GameBoardProps) {
  const size = board.length;
  const gridRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<Position>({ row: Math.floor(size / 2), col: Math.floor(size / 2) });
  const focusRow = Math.min(focus.row, size - 1);
  const focusCol = Math.min(focus.col, size - 1);
  const winSet = useMemo(() => new Set(winningCells.map((p) => p.row * size + p.col)), [winningCells, size]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const key = event.key;
      let next: Position | null = null;
      if (key in ARROWS) {
        const [dr, dc] = ARROWS[key];
        next = {
          row: Math.max(0, Math.min(size - 1, focusRow + dr)),
          col: Math.max(0, Math.min(size - 1, focusCol + dc)),
        };
      } else if (key === 'Home') next = { row: focusRow, col: 0 };
      else if (key === 'End') next = { row: focusRow, col: size - 1 };
      if (!next) return;
      event.preventDefault();
      setFocus(next);
      gridRef.current?.querySelector<HTMLElement>(`[data-pos="${next.row}-${next.col}"]`)?.focus();
    },
    [focusRow, focusCol, size],
  );

  const handleFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const pos = (event.target as HTMLElement).dataset.pos;
    if (!pos) return;
    const [row, col] = pos.split('-').map(Number);
    setFocus((prev) => (prev.row === row && prev.col === col ? prev : { row, col }));
  }, []);

  const style = {
    '--n': size,
    '--ghost-letter': `"${currentPlayer}"`,
    '--ghost-color': currentPlayer === 'X' ? 'var(--x)' : 'var(--o)',
  } as CSSProperties;

  return (
    <div
      ref={gridRef}
      className="board"
      style={style}
      role="grid"
      aria-label={`Caro board, ${size} by ${size}`}
      aria-rowcount={size}
      aria-colcount={size}
      data-interactive={interactive}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {board.map((cells, row) => (
        <div role="row" className="board__row" key={row}>
          {cells.map((value, col) => {
            const isWin = winSet.has(row * size + col);
            return (
              <BoardCell
                key={col}
                row={row}
                col={col}
                value={value}
                label={cellLabel(board, row, col, isWin)}
                isLast={lastMove?.row === row && lastMove.col === col}
                isWin={isWin}
                tabbable={row === focusRow && col === focusCol}
                blocked={!interactive}
                onPlace={onPlace}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
