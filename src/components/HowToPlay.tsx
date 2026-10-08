import { Button } from './Button';
import { MiniBoard } from './MiniBoard';
import { Modal } from './Modal';

const STONES = [
  { row: 1, col: 1, player: 'X' as const },
  { row: 2, col: 2, player: 'X' as const },
  { row: 3, col: 3, player: 'X' as const },
  { row: 4, col: 4, player: 'X' as const },
  { row: 5, col: 5, player: 'X' as const },
  { row: 1, col: 4, player: 'O' as const },
  { row: 2, col: 4, player: 'O' as const },
  { row: 3, col: 2, player: 'O' as const },
  { row: 4, col: 3, player: 'O' as const },
];
const WIN = [1, 2, 3, 4, 5].map((n) => ({ row: n, col: n }));

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="howto-title">
      <h2 id="howto-title">How to Play</h2>
      <ol className="rules">
        <li>Players take turns placing one piece on any empty cell.</li>
        <li>Create 5 consecutive pieces to win.</li>
        <li>Lines can run horizontally, vertically, or diagonally.</li>
        <li>Block your opponent's threats before they become five.</li>
        <li>The first player to create five consecutive pieces wins.</li>
      </ol>
      <MiniBoard size={7} stones={STONES} highlight={WIN} className="rules__board" />
      <p className="rules__caption">Here X wins with a diagonal line of five.</p>
      <Button variant="primary" onClick={onClose}>Got it</Button>
    </Modal>
  );
}
