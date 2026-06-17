import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { GroceryItemWithAisle } from '@/types';

export function useGroceryItems(
  storeId: string,
  householdId: string | null,
): { items: GroceryItemWithAisle[]; loading: boolean } {
  const [items, setItems] = useState<GroceryItemWithAisle[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setItems([]);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }

    let cancelled = false;
    isInitialLoad.current = true;

    async function fetchItems() {
      const { data } = await supabase
        .from('grocery_items')
        .select('*, aisle:aisles(id, name, sort_order)')
        .eq('store_id', storeId)
        .eq('household_id', householdId)
        .order('sort_order');

      if (cancelled) return;

      if (!isInitialLoad.current && Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      isInitialLoad.current = false;

      setItems((data as GroceryItemWithAisle[]) ?? []);
      setLoading(false);
    }

    fetchItems();

    const channel = supabase
      .channel(`grocery_items_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `store_id=eq.${storeId}`,
        },
        () => fetchItems(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [storeId, householdId]);

  return { items, loading };
}
