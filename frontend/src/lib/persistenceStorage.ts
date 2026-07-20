import type { StateStorage } from 'zustand/middleware';

function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
}

const memoryStorage = createMemoryStorage();

export function getSessionPersistenceStorage(): StateStorage {
  return window.__TAURI__ ? memoryStorage : sessionStorage;
}
