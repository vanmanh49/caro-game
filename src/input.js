// src/input.js
export const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  run: ['ShiftLeft', 'ShiftRight'],
  fire: ['KeyX'],
  mute: ['KeyM'],
  start: ['Enter', 'Space'],
};

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function createInput(target = window) {
  const down = new Set();
  const pressed = new Set();

  const onDown = (e) => {
    if (PREVENT.has(e.code)) e.preventDefault();
    if (!down.has(e.code)) {
      down.add(e.code);
      pressed.add(e.code);
    }
  };
  const onUp = (e) => down.delete(e.code);
  const clear = () => {
    down.clear();
    pressed.clear();
  };

  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', clear);

  const any = (set, action) => KEYMAP[action].some((code) => set.has(code));
  return {
    isDown: (action) => any(down, action),
    wasPressed: (action) => any(pressed, action),
    endFrame: () => pressed.clear(),
    clear,
    dispose() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', clear);
    },
  };
}
