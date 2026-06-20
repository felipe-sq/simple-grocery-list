import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/hooks/useHousehold';
import type { Store } from '@/types';

interface StoresContextValue {
  stores: Store[];
  loading: boolean;
  createStore: (name: string) => Promise<{ store: Store | null; error: string | null }>;
}

const StoresContext = createContext<StoresContextValue>({
  stores: [],
  loading: true,
  createStore: async () => ({ store: null, error: 'Not initialized' }),
});

export function StoresProvider({ children }: { children: ReactNode }) {
  const { householdId, loading: householdLoading } = useHousehold();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const storesRef = useRef<Store[]>([]);
  useEffect(() => { storesRef.current = stores; }, [stores]);

  useEffect(() => {
    if (householdLoading) return;

    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setStores([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    let cancelled = false;

    async function fetchStores() {
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order');
      if (cancelled) return;
      setStores((data as Store[]) ?? []);
      setLoading(false);
    }

    fetchStores();

    const channel = supabase
      .channel(`stores_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stores',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchStores(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [householdId, householdLoading]);

  const createStore = useCallback(
    async (name: string): Promise<{ store: Store | null; error: string | null }> => {
      if (!householdId) return { store: null, error: 'Not authenticated' };
      const existing = storesRef.current;
      const sortOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.sort_order)) + 10 : 0;
      const { data, error } = await supabase
        .from('stores')
        .insert({ household_id: householdId, name, sort_order: sortOrder })
        .select()
        .single();
      if (error) return { store: null, error: error.message };
      const newStore = data as Store;
      setStores((prev) => [...prev, newStore]);
      return { store: newStore, error: null };
    },
    [householdId],
  );

  return (
    <StoresContext.Provider value={{ stores, loading, createStore }}>
      {children}
    </StoresContext.Provider>
  );
}

export function useStoresContext(): StoresContextValue {
  return useContext(StoresContext);
}
