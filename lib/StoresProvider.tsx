import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/hooks/useHousehold';
import type { Store } from '@/types';

interface StoresContextValue {
  stores: Store[];
  loading: boolean;
}

const StoresContext = createContext<StoresContextValue>({
  stores: [],
  loading: true,
});

export function StoresProvider({ children }: { children: ReactNode }) {
  const { householdId, loading: householdLoading } = useHousehold();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <StoresContext.Provider value={{ stores, loading }}>
      {children}
    </StoresContext.Provider>
  );
}

export function useStoresContext(): StoresContextValue {
  return useContext(StoresContext);
}
