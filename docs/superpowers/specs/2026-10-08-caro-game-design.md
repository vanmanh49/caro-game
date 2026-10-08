# Caro (Gomoku) Browser Game — Design

Date: 2026-10-08

## 1. Purpose and success criteria

Build a polished, responsive, fully offline Caro/Gomoku game in the browser with React, TypeScript and Vite. No backend. It must feel like a professional modern browser game, not a coding demo.

Priorities, in order: UI/UX, correct rules, strong AI, responsive design, clean TypeScript architecture, performance, accessibility, maintainability.

The project is complete only when all of these are verified by running the app:

- `tsc` reports no errors, the production build succeeds, and there are no console errors at runtime.
- There are no `any` types (an `unknown` narrowed at a boundary is acceptable).
- Piece selection (X/O), first-mover selection (You/Computer/Random) and all four difficulties work.
- The AI never plays an illegal move, takes an available win, and blocks an obvious loss.
- Win detection works in all four directions, and the winning cells are highlighted.
- Draw detection works.
- Restart, New Game and Back to Setup work.
- The scoreboard works, and settings, theme, sound and scoreboard persist across a refresh.
- The layout works on mobile and desktop, with no horizontal scroll.
- Accessibility labels and keyboard navigation work.
- Unit tests pass.

## 2. Scope and decisions

- Repo: the old Mario project has been deleted by the user. The Vite project lives at the repo root, on the current branch.
- Runtime dependencies: `react` and `react-dom` only. Dev dependencies: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, and `@types/react` / `@types/react-dom`.
- Styling is plain CSS with CSS variables and per-component CSS files. There is no UI framework.
- Sounds are synthesized with the Web Audio API, so there are no asset files.
- Rules:
  - Standard freestyle: five or more consecutive pieces win.
  - `winLength` is a parameter and the default is 5.
  - Board size is a parameter and the default is 15. 10, 15 and 19 must work.
  - Board size is exposed in Settings as a selector.
- Turn order: the first mover places their own piece first. Choosing O and going first is allowed. In Player vs Player mode, X goes first.
- Undo:
  - In Player vs Computer mode, it removes the player's last move and the computer's reply.
  - It is unavailable while the computer is thinking.
  - It is not available after the game ends.
  - If the computer moved first and the player has not yet moved, there is nothing to undo.
  - In Player vs Player mode, it removes one move.
- Out of scope: online play, accounts, replays, restricted-opening rules (renju), and the Vietnamese "blocked both ends" rule.

## 3. Directory layout

```text
src/
  game/        types.ts, board.ts, rules.ts, gameEngine.ts, reducer.ts, scoreboard.ts
  ai/          aiPlayer.ts, computeMove.ts, types.ts, grid.ts, easyAI.ts, mediumAI.ts,
               hardAI.ts, expertAI.ts, minimax.ts, threats.ts, evaluation.ts,
               candidates.ts, zobrist.ts, ai.worker.ts, workerClient.ts
  hooks/       useGame.ts, useAI.ts, useLocalStorage.ts, useTheme.ts, useSound.ts
  components/  HomeScreen, GameSetup, GameBoard, BoardCell, GameStatus, ScoreBoard,
               GameControls, DifficultySelector, PieceSelector, ResultModal,
               SettingsModal, HowToPlay, Modal (shared), ThemeToggle, SoundToggle
  utils/       storage.ts, audio.ts, random.ts
  styles/      tokens.css, base.css, animations.css
  App.tsx, main.tsx
test/ (or colocated *.test.ts)  engine and AI tests
```

## 4. Game engine (`src/game`)

Pure TypeScript with no React or DOM.

### Types

```ts
type Player = 'X' | 'O';
type Cell = Player | null;
type Board = readonly (readonly Cell[])[];
interface Position { row: number; col: number }
type GameMode = 'pvc' | 'pvp';
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type FirstMover = 'player' | 'computer' | 'random';
type GameStatus = 'idle' | 'playing' | 'computer-thinking' | 'won' | 'draw';

interface GameConfig {
  mode: GameMode;
  boardSize: number;
  winLength: number;
  playerPiece: Player;     // pvc only
  firstMover: FirstMover;  // pvc only
  difficulty: Difficulty;  // pvc only
}
interface Move { position: Position; player: Player }
type GameResult =
  | { kind: 'win'; winner: Player; cells: Position[] }
  | { kind: 'draw' };
interface GameState {
  config: GameConfig;
  board: Board;
  currentPlayer: Player;
  computerPiece: Player | null;
  history: Move[];
  status: GameStatus;
  result: GameResult | null;
}
```

### Functions

- `createBoard(size)`
- `isInBounds(board, pos)`
- `isValidMove(board, pos)`
- `makeMove(board, pos, player)`: returns a new board; throws `InvalidMoveError` on an illegal move.
- `getAvailableMoves(board)`
- `checkWinner(board, lastMove)`: checks only the four lines through the last move.
- `getWinningCells(board, lastMove, winLength)`
- `checkDraw(board)`
- `validateBoard(board)`: for invalid-state handling.

### Reducer

A pure `gameReducer(state, action)` handles these actions:

- `start`
- `place`: ignores illegal moves, returns state unchanged, and surfaces an `invalidMove` flag for the sound cue.
- `computerMove`
- `undo`
- `restart`
- `reset`

Status moves from `playing` to `computer-thinking` when it is the computer's turn, and to `won` or `draw` when the game ends. Once the game is over, `place` is ignored. `useGame` wraps the reducer with `useReducer` and exposes derived data.

## 5. AI (`src/ai`)

### Interface

```ts
interface AIPlayer {
  getMove(board: Board, player: Player, signal?: AbortSignal): Promise<Position>;
}
createAIPlayer(difficulty, options): AIPlayer
```

The returned move is always a valid empty cell. If the AI throws, times out or returns an invalid move, `useAI` falls back to a safe heuristic move (best candidate, then any available cell). This is the "AI cannot find a move" handling.

### Shared internals

- The board is converted to a flat `Int8Array` (0 empty, 1 = me, 2 = opponent) with a known size and `winLength`.
- `candidates.ts`: empty cells within distance 2 of any piece, or the centre cell on an empty board. Candidates are ordered by a cheap heuristic score.
- `evaluation.ts`: scores a position from line patterns in the four directions, using counts and open ends.
  - Pattern tiers, high to low: five, open four, four, open three, closed three, open two, and so on.
  - Defence is weighted slightly below attack when it is the AI's move.
  - A small central-position bonus.
  - Provides `scoreCell(attack, defence)` for ordering and for the Easy/Medium heuristics.
- `minimax.ts`: negamax with alpha-beta pruning.
  - Candidate limit per node.
  - Move ordering: transposition-table move, then killer moves, then static heuristic score.
  - Immediate-win and immediate-block shortcuts at each node.
  - Optional deadline check, so Expert can stop mid-search.
- `zobrist.ts`: Zobrist hashing for the transposition table.
  - The table stores depth, score, bound type and best move.
  - The table is bounded in size and cleared per move.

### Difficulty behaviour

| Level | Behaviour |
|---|---|
| Easy | About 70% random valid move, preferring cells near existing pieces. About 20% blocks an immediate win. About 10% plays the best heuristic cell. It takes its own immediate win only when it happens to pick it. It makes deliberate mistakes. |
| Medium | Takes a win, blocks a loss, then picks the best heuristic cell (attack plus defence patterns). Light depth-2 search among the top candidates. |
| Hard | Alpha-beta at fixed depth 3 over the top 12 candidates, with the full evaluation. Recognises open threes and double threats. Prefers central cells on ties. |
| Expert | Iterative deepening from depth 2 up to 8 under a time budget of about 1.5 s. Zobrist transposition table and killer-move plus static-heuristic move ordering. Before the main search, a threat-sequence search looks for a forced win (continuous fours / open-three threats) and for a forced defence. Candidate set is limited to the 12–16 best cells, which keeps 19×19 fast. Returns the best move from the last completed depth. |

Expert must clearly beat Hard in testing. A test plays Expert against Hard, and Expert must not lose.

### Execution

- `ai.worker.ts` receives `{ board, player, difficulty, config }` and posts back `{ move }` or `{ error }`.
- `workerClient.ts` creates one worker, tags each request with an id, ignores stale responses, and cancels via terminate-and-recreate on reset or new game.
- If `Worker` is unavailable or fails to construct, it falls back to running the same code asynchronously on the main thread (`setTimeout`).
- `useAI` applies a minimum thinking delay of about 350 ms so Easy and Medium do not feel instant, and Expert's time cap bounds the other end.

## 6. UI (`src/components`, `src/hooks`)

### Navigation

`App` holds a `screen` state: `home`, `setup`, `game`. The result modal is part of the game screen. A shared `Transition` wrapper provides a subtle fade and slide between screens. The `prefers-reduced-motion` media query disables non-essential motion.

### Screens and components

- **HomeScreen:** logo, tagline, "Player vs Computer", "Player vs Player", "How to Play", Settings. Entrance animation.
- **GameSetup:**
  - `PieceSelector` for X/O.
  - A who-goes-first selector (You, Computer, Random).
  - `DifficultySelector` with a short description per level.
  - Start button.
  - Pvc-only fields are hidden in Player vs Player mode.
  - Shows the "Ready? Choose your piece and challenge the AI." heading.
- **GameBoard:**
  - A CSS grid of `BoardCell` buttons. `BoardCell` is wrapped in `memo`, with stable props.
  - The board's size is `min(available width, available height)` via CSS, with `aspect-ratio: 1`. Cell size is derived from the board size.
  - Hover/focus preview ghost piece on empty cells, only when the player can move.
  - Placement animation `scale(0.5) → scale(1)` plus a fade.
  - Last-move marker.
  - Winning cells pulse and glow.
  - Interaction is disabled while the computer is thinking or the game is over.
  - `role="grid"` with roving tabindex. Arrow keys move focus, and Enter or Space places a piece. Each cell has `aria-label` such as "Row 5, Column 7, Empty" or "Row 5, Column 7, occupied by X".
- **GameStatus:** turn indicator, player and computer pieces, difficulty badge, "Your Turn" / "Computer's Turn" / "You Win!" / "Computer Wins" / "Draw". While the computer is thinking it shows "Computer is thinking…" with animated dots. A visually hidden `aria-live="polite"` region announces status and moves. State is never conveyed by colour alone: pieces use distinct shapes and letters as well as colour.
- **ScoreBoard:** "You / Computer" (or "Player X / Player O") plus draws. Persisted.
- **GameControls:** New Game, Restart, Undo, Settings, Back to Home, and sound/theme toggles.
- **ResultModal:** win, loss or draw copy as specified, with Play Again, New Game and Back to Setup. Focus is trapped while the modal is open, Escape closes it where sensible, and focus returns afterward.
- **SettingsModal:** theme, sound, board size, and a reset-scoreboard button.
- **HowToPlay:** the five rules, with a small visual example board.

### Layout

- Desktop (wide): the board on the left and the information panel beside it.
- Tablet and mobile: the board is centred, with the panel below it. Touch targets are at least 44 px, no horizontal scroll, and text is at least 16 px.
- The viewport uses `100dvh`. Safe-area insets are respected. Pinch-zoom is not disabled.

### Visual design

- Modern, minimal and friendly. The board is the visual focus, with a clear grid. Glassmorphism panels, gradients and glows are used sparingly.
- Design tokens (colours, radii, shadows, spacing, type scale) live in `tokens.css` and are overridden for light and dark themes. X and O are visually distinct in both themes, with contrast of at least WCAG AA.
- Button hover, active and focus-visible states are all defined.

## 7. State, persistence, errors

- `useLocalStorage<T>(key, initial, validate)`: all reads and writes are wrapped in try/catch. If storage is unavailable or the stored value fails validation, it falls back to the initial value and keeps working in memory.
- Persisted keys use a `caro:` prefix: `settings` (last config), `sound`, `theme`, `scoreboard`. Nothing sensitive is stored.
- Theme defaults to the OS preference (`prefers-color-scheme`) and is applied via `data-theme` on `<html>`, before first paint, to avoid a flash.
- `ErrorBoundary` at the app root shows a friendly recovery screen with a reset button.
- Invalid moves are ignored by the reducer and never throw into the UI. The sound hook plays the invalid-move cue.
- Engine functions that receive a malformed board throw typed errors. The reducer catches them and keeps the previous state.
- Audio failures (AudioContext blocked or missing) are swallowed. Sound is off by default and the context is created lazily on the first user gesture after it is enabled.

## 8. Sound

`utils/audio.ts` synthesizes short tones with oscillators and gain envelopes. Cues: piece placed (X and O differ slightly), invalid move, win, lose, draw and button click. `useSound` exposes `play(cue)` and respects the mute state.

## 9. Testing

Vitest, with no React rendering for rules or AI tests.

- **Engine:**
  - Board creation for sizes 10, 15 and 19.
  - Valid and invalid moves (occupied, out of bounds).
  - Win detection: horizontal, vertical, diagonal ↘, and diagonal ↙, including wins at board edges and a six-in-a-row.
  - Winning cells are correct.
  - Draw detection on a full board with no winner.
  - Move history and undo (pvc removes two moves, pvp removes one).
  - Reducer: turn order, ignoring moves after the game ends, and the first-mover logic.
- **AI** (all levels, using hand-built positions):
  - Always returns a legal cell.
  - Takes an immediate win (Medium, Hard, Expert; Easy over many trials is not required to).
  - Blocks an immediate loss.
  - Expert blocks an open four and an open three, and finds a double-threat win.
  - Difficulty behaviour: Easy plays randomly and fails to block in a measurable fraction of trials, and Expert never loses to Hard in a short match.
  - Expert respects its time budget on 19×19.
- **Utilities:** storage fallback when `localStorage` throws, and invalid stored data.

## 10. Build order

Follows the 17-step process from the request. The implementation plan breaks it into reviewable tasks, with tests written before the engine and AI code. Final verification runs the app in a real browser at desktop and mobile widths, covers every item in section 1, and fixes any bug found before declaring completion.
