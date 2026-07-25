import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type ListCounts = Map<string, { total: number; remaining: number }>;

// One household-wide query + subscription for the My Lists cards,
// instead of a realtime channel per card.
export function useListCounts(householdId: string | null): ListCounts {
  const [counts, setCounts] = useState<ListCounts>(new Map());

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) setCounts(new Map());
      });
      return () => { active = false; };
    }

    let cancelled = false;

    async function fetchCounts() {
      const { data } = await supabase
        .from('grocery_items')
        .select('list_id, checked')
        .eq('household_id', householdId);
      if (cancelled) return;
      const next: ListCounts = new Map();
      for (const row of (data as { list_id: string; checked: boolean }[] | null) ?? []) {
        const entry = next.get(row.list_id) ?? { total: 0, remaining: 0 };
        entry.total += 1;
        if (!row.checked) entry.remaining += 1;
        next.set(row.list_id, entry);
      }
      setCounts(next);
    }

    fetchCounts();

    const channel = supabase
      .channel(`list_counts_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchCounts(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  return counts;
}
