import { useCallback, useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storage';

export function useLocalStorage<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => readStorage(key, validate, initial));
  useEffect(() => writeStorage(key, value), [key, value]);
  const set = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);
  return [value, set] as const;
}
