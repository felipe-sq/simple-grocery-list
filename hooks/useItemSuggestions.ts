import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { SuggestionResult } from '@/types';

type RawRow = {
  name: string;
  store_id: string;
  aisle_id: string;
  purchased_at: string;
  stores: { name: string }[] | null;
  aisles: { name: string }[] | null;
};

export function useItemSuggestions(
  query: string,
  householdId: string | null,
): { suggestions: SuggestionResult[]; loading: boolean } {
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!householdId || query.trim().length < 2) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setSuggestions([]);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }

    let cancelled = false;

    timerRef.current = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);

      const { data } = await supabase
        .from('item_history')
        .select('name, store_id, aisle_id, purchased_at, stores(name), aisles(name)')
        .eq('household_id', householdId)
        .ilike('name', `${query.trim()}%`)
        .order('purchased_at', { ascending: false })
        .limit(100);

      if (!data) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const rows = data as RawRow[];
      const grouped = new Map<string, { row: RawRow; count: number }>();

      for (const row of rows) {
        const key = row.name.toLowerCase();
        const existing = grouped.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          grouped.set(key, { row, count: 1 });
        }
      }

      const results: SuggestionResult[] = Array.from(grouped.values())
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return b.row.purchased_at.localeCompare(a.row.purchased_at);
        })
        .slice(0, 5)
        .map(({ row }) => ({
          name: row.name,
          store_id: row.store_id,
          store_name: row.stores?.[0]?.name ?? '',
          aisle_id: row.aisle_id,
          aisle_name: row.aisles?.[0]?.name ?? '',
        }));

      setSuggestions(results);
      setLoading(false);
    }, 200);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, householdId]);

  return { suggestions, loading };
}
