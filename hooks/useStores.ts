import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/hooks/useHousehold';
import { Store } from '@/types';

export function useStores(): { stores: Store[]; loading: boolean } {
  const { householdId, loading: householdLoading } = useHousehold();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (householdLoading) return;

    if (!householdId) {
      // Defer to avoid synchronous setState in effect body (same pattern as useHousehold).
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
      channel.unsubscribe();
    };
  }, [householdId, householdLoading]);

  return { stores, loading };
}
