/** Reads and validates a JSON value from localStorage. Never throws; returns `fallback` on any problem. */
export function readStorage<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota, blocked): keep working in memory.
  }
}
