import { useState, useEffect } from 'react';

const readFromStorage = <T>(key: string, initialValue: T, legacyKeys?: string[]): T => {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(initialValue) && Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
      if (!Array.isArray(initialValue)) return parsed as T;
    }

    // Fallback to legacy keys
    if (legacyKeys) {
      for (const param of legacyKeys) {
        const legacy = window.localStorage.getItem(param);
        if (legacy && Array.isArray(initialValue)) {
          return [legacy] as unknown as T;
        }
      }
    }
    return initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
};

export function useStorage<T>(key: string, initialValue: T, legacyKeys?: string[]): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    readFromStorage(key, initialValue, legacyKeys)
  );

  // Sync with localStorage changes from other components (same tab via custom event, or other tabs via 'storage' event)
  useEffect(() => {
    const handleChange = (e: Event) => {
      const storageKey = (e as CustomEvent<string>).detail ?? (e as StorageEvent).key;
      if (storageKey === key) {
        setStoredValue(readFromStorage(key, initialValue, legacyKeys));
      }
    };

    window.addEventListener('local-storage', handleChange);
    window.addEventListener('storage', handleChange as EventListener);

    return () => {
      window.removeEventListener('local-storage', handleChange);
      window.removeEventListener('storage', handleChange as EventListener);
    };
  }, [key]);

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch a custom event so other mounted components using the same key can re-sync
        window.dispatchEvent(new CustomEvent('local-storage', { detail: key }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
