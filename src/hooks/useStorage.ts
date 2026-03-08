import { useState } from 'react';

export function useStorage<T>(key: string, initialValue: T, legacyKeys?: string[]): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
         // handle array parsing safely
         const parsed = JSON.parse(item);
         if (Array.isArray(initialValue) && Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
         if (!Array.isArray(initialValue)) return parsed as T;
      }
      
      // Fallback to legacy
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
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
