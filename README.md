# Pixel Plumber

A Mario-style platformer for the browser. Original characters and art. No assets, no dependencies, no build step.

## Run

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (ES modules need an HTTP origin, so double-clicking `index.html` will not work).

## Controls

| Action | Keys |
|---|---|
| Move | Arrow keys or A/D |
| Jump | Space, W, or Up (hold for a higher jump) |
| Run | Shift |
| Fireball | X (after picking up a fire flower) |
| Mute | M |
| Start | Enter or Space |

## Tests

```
node --test
```

## Levels

Levels are 14-row text grids in `src/levels/`, one character per tile, registered in `src/levels/index.js`:

| Char | Meaning |
|---|---|
| `.` | empty |
| `#` | solid ground |
| `B` | brick |
| `?` | ? block with a coin |
| `M` | ? block with a mushroom (a fire flower when you are already big) |
| `-` | one-way platform |
| `\|` | pipe |
| `C` | coin |
| `G` | goomba |
| `K` | koopa |
| `P` | player start (exactly one) |
| `F` | goal flag (exactly one) |
