import { openDB, type IDBPDatabase } from 'idb';

import type { KVStorage } from './storage';

const DB_NAME = 'grocery-offline';
const STORE_NAME = 'kv';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
  }
  return dbPromise;
}

export const storage: KVStorage = {
  getItem: async (key) => {
    const db = await getDb();
    const val = await db.get(STORE_NAME, key);
    return typeof val === 'string' ? val : null;
  },
  setItem: async (key, value) => {
    const db = await getDb();
    await db.put(STORE_NAME, value, key);
  },
};
