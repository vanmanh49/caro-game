// src/stateMachine.js
export function createMachine(states) {
  let current = null;
  let name = null;
  return {
    get name() {
      return name;
    },
    go(next, payload) {
      if (!states[next]) throw new Error(`Unknown state: ${next}`);
      current?.exit?.();
      name = next;
      current = states[next];
      current.enter?.(payload);
    },
    update(dt) {
      current?.update?.(dt);
    },
    render(ctx, alpha) {
      current?.render?.(ctx, alpha);
    },
  };
}
