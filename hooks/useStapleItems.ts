import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { StapleItemWithDetails } from '@/types';

export function useStapleItems(householdId: string | null): {
  items: StapleItemWithDetails[];
  loading: boolean;
} {
  const [items, setItems] = useState<StapleItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setItems([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    let cancelled = false;

    async function fetchStaples() {
      const { data } = await supabase
        .from('staple_items')
        .select(
          '*, store:stores!default_store_id(id, name, sort_order), aisle:aisles!default_aisle_id(id, name)',
        )
        .eq('household_id', householdId)
        .order('sort_order');
      if (cancelled) return;
      setItems((data as StapleItemWithDetails[]) ?? []);
      setLoading(false);
    }

    fetchStaples();

    const channel = supabase
      .channel(`staple_items_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staple_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchStaples(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [householdId]);

  return { items, loading };
}
