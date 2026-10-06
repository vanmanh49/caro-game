// src/storage.js
function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function createStore(storage = defaultStorage(), prefix = 'pixel-plumber.') {
  return {
    get(key, fallback) {
      try {
        const raw = storage.getItem(prefix + key);
        if (raw === null) return fallback;
        const value = JSON.parse(raw);
        return typeof value === typeof fallback ? value : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        storage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        // Storage is unavailable or full; the game works without it.
      }
    },
  };
}
