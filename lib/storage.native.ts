import { createMMKV } from 'react-native-mmkv';

import type { KVStorage } from './storage';

const mmkv = createMMKV({ id: 'offline-queue' });

export const storage: KVStorage = {
  getItem: async (key) => mmkv.getString(key) ?? null,
  setItem: async (key, value) => mmkv.set(key, value),
};
