# Caro (Gomoku)

A polished, offline browser Caro/Gomoku game built with React, TypeScript and Vite.

## Run

```bash
npm install
npm run dev      # development
npm test         # unit tests (game engine + AI)
npm run build    # type-check and production build
npm run preview  # serve the production build
```

## Features

- Player vs Computer (Easy, Medium, Hard, Expert) and Player vs Player; X/O and first-move selection
- 10×10, 15×15 and 19×19 boards; five in a row wins (horizontal, vertical, both diagonals)
- Expert AI: iterative-deepening alpha-beta, transposition table, threat search, Web Worker
- Scoreboard, undo, dark/light theme, optional sound, keyboard and screen-reader support
- Settings, theme, sound and scoreboard persist in `localStorage`

## Controls

- **Restart** replays the current settings and keeps the score.
- **New Game** starts fresh with your saved settings and resets the score.
- **Undo** takes back your last move and the computer's reply (one move in Player vs Player).
- On the board: arrow keys move between cells, Enter or Space places a piece.

## Structure

- `src/game` — pure engine (types, board, rules, reducer, scoreboard)
- `src/ai` — evaluation, search, difficulty levels, worker client
- `src/hooks`, `src/components`, `src/utils`, `src/styles` — React UI
- `test` — Vitest suites
- `docs/superpowers` — design spec and implementation plan
