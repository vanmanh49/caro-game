import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_SCOREBOARD } from '../src/game/scoreboard';
import { DEFAULT_SETTINGS } from '../src/game/types';
import { isGameSettings, isScoreboard, isThemeOrNull } from '../src/utils/guards';
import { readStorage, writeStorage } from '../src/utils/storage';

function stubStorage(store: Record<string, string>) {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('storage', () => {
  it('round-trips a value', () => {
    const store: Record<string, string> = {};
    stubStorage(store);
    writeStorage('caro:settings', DEFAULT_SETTINGS);
    expect(readStorage('caro:settings', isGameSettings, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back on corrupt JSON and wrong shapes', () => {
    stubStorage({ a: '{not json', b: JSON.stringify({ mode: 'nope' }), c: JSON.stringify({ pvc: 1 }) });
    expect(readStorage('a', isGameSettings, DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS);
    expect(readStorage('b', isGameSettings, DEFAULT_SETTINGS)).toBe(DEFAULT_SETTINGS);
    expect(readStorage('c', isScoreboard, EMPTY_SCOREBOARD)).toBe(EMPTY_SCOREBOARD);
  });

  it('never throws when localStorage is missing or throws', () => {
    expect(readStorage('x', isThemeOrNull, null)).toBeNull(); // no localStorage in Node
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(readStorage('x', isThemeOrNull, 'dark')).toBe('dark');
    expect(() => writeStorage('x', 1)).not.toThrow();
  });

  it('validates theme values', () => {
    expect(isThemeOrNull('light')).toBe(true);
    expect(isThemeOrNull(null)).toBe(true);
    expect(isThemeOrNull('blue')).toBe(false);
  });
});
