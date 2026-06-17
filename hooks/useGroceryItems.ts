import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { enqueue, flush } from '@/lib/offlineQueue';
import type { GroceryItemWithAisle } from '@/types';

export function useGroceryItems(
  storeId: string,
  householdId: string | null,
): {
  items: GroceryItemWithAisle[];
  loading: boolean;
  toggleItem: (itemId: string) => Promise<void>;
} {
  const [items, setItems] = useState<GroceryItemWithAisle[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isInitialLoad = useRef(true);
  // false until first SUBSCRIBED; lets us flush on first connect (catches previous-session queue)
  const isConnectedRef = useRef(false);
  const itemsRef = useRef(items);
  const householdIdRef = useRef(householdId);

  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { householdIdRef.current = householdId; }, [householdId]);

  const flushQueue = useCallback(async () => {
    await flush(async (mutation) => {
      if (mutation.type === 'toggle_item') {
        const { error } = await supabase
          .from('grocery_items')
          .update({
            checked: mutation.checked,
            checked_at: mutation.checked_at,
            checked_by: mutation.checked_by,
          })
          .eq('id', mutation.itemId)
          .eq('household_id', mutation.householdId);
        if (!error) {
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(mutation.itemId);
            return next;
          });
          return true;
        }
        return false;
      }
      return false;
    });
  }, []);

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
      .subscribe((status) => {
        const nowConnected = status === 'SUBSCRIBED';
        if (nowConnected && !isConnectedRef.current) {
          flushQueue();
        }
        isConnectedRef.current = nowConnected;
      });

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [storeId, householdId, flushQueue]);

  const toggleItem = useCallback(async (itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    const currentHouseholdId = householdIdRef.current;
    if (!item || !currentHouseholdId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id ?? null;

    const newChecked = !item.checked;
    const newCheckedAt = newChecked ? new Date().toISOString() : null;
    const newCheckedBy = newChecked ? userId : null;

    // Optimistic update — EC4-1 (uncheck reverses instantly)
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, checked: newChecked, checked_at: newCheckedAt, checked_by: newCheckedBy }
          : i,
      ),
    );

    if (!isConnectedRef.current) {
      // EC4-7: offline — queue the mutation and mark pending
      await enqueue({
        type: 'toggle_item',
        itemId,
        householdId: currentHouseholdId,
        checked: newChecked,
        checked_at: newCheckedAt,
        checked_by: newCheckedBy,
      });
      setPendingIds((prev) => new Set([...prev, itemId]));
      return;
    }

    const { error } = await supabase
      .from('grocery_items')
      .update({
        checked: newChecked,
        checked_at: newCheckedAt,
        checked_by: newCheckedBy,
      })
      .eq('id', itemId)
      .eq('household_id', currentHouseholdId);

    if (error) {
      // Network dropped between connectivity check and write — treat as offline
      await enqueue({
        type: 'toggle_item',
        itemId,
        householdId: currentHouseholdId,
        checked: newChecked,
        checked_at: newCheckedAt,
        checked_by: newCheckedBy,
      });
      setPendingIds((prev) => new Set([...prev, itemId]));
    }
  }, []);

  const itemsWithPending = useMemo(
    () => items.map((i) => ({ ...i, pending_sync: pendingIds.has(i.id) })),
    [items, pendingIds],
  );

  return { items: itemsWithPending, loading, toggleItem };
}
