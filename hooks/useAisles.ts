import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Aisle } from '@/types';

export function useAisles(
  storeId: string,
  householdId: string | null,
): {
  aisles: Aisle[];
  loading: boolean;
  createAisle: (name: string) => Promise<{ aisle: Aisle | null; error: string | null }>;
} {
  const [aisles, setAisles] = useState<Aisle[]>([]);
  const [loading, setLoading] = useState(true);
  const aislesRef = useRef(aisles);

  useEffect(() => { aislesRef.current = aisles; }, [aisles]);

  useEffect(() => {
    if (!householdId || !storeId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setAisles([]);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }

    let cancelled = false;

    async function fetchAisles() {
      const { data } = await supabase
        .from('aisles')
        .select('*')
        .eq('store_id', storeId)
        .eq('household_id', householdId)
        .order('sort_order');
      if (cancelled) return;
      setAisles((data as Aisle[]) ?? []);
      setLoading(false);
    }

    fetchAisles();

    const channel = supabase
      .channel(`aisles_picker_${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aisles', filter: `store_id=eq.${storeId}` },
        () => fetchAisles(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [storeId, householdId]);

  const createAisle = useCallback(
    async (name: string): Promise<{ aisle: Aisle | null; error: string | null }> => {
      if (!householdId) return { aisle: null, error: 'Not authenticated' };

      const existing = aislesRef.current;
      const sortOrder =
        existing.length > 0 ? Math.max(...existing.map((a) => a.sort_order)) + 10 : 0;

      const { data, error } = await supabase
        .from('aisles')
        .insert({ household_id: householdId, store_id: storeId, name, sort_order: sortOrder })
        .select()
        .single();

      if (error) return { aisle: null, error: error.message };
      return { aisle: data as Aisle, error: null };
    },
    [householdId, storeId],
  );

  return { aisles, loading, createAisle };
}
