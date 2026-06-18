export interface KVStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// Resolved to lib/storage.native.ts (MMKV) or lib/storage.web.ts (idb) at runtime.
// This fallback is only reached in test environments.
export const storage: KVStorage = {
  getItem: async () => null,
  setItem: async () => {},
};
