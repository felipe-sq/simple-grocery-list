import { useStoresContext } from '@/lib/StoresProvider';
import type { Store } from '@/types';

export function useStores(): {
  stores: Store[];
  loading: boolean;
  createStore: (name: string) => Promise<{ store: Store | null; error: string | null }>;
  updateStoreColor: (storeId: string, color: string | null) => Promise<string | null>;
} {
  return useStoresContext();
}
