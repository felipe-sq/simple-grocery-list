import { useStoresContext } from '@/lib/StoresProvider';
import type { Store } from '@/types';

export function useStores(): { stores: Store[]; loading: boolean } {
  return useStoresContext();
}
