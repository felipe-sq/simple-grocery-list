import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { enqueue, flush } from '@/lib/offlineQueue';
import type { AddItemInput, Aisle, EditItemInput, GroceryItemWithAisle } from '@/types';

const GROCERY_TYPES = ['toggle_item', 'add_item', 'delete_item', 'end_trip'] as const;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useGroceryItems(
  storeId: string,
  householdId: string | null,
): {
  items: GroceryItemWithAisle[];
  loading: boolean;
  toggleItem: (itemId: string) => Promise<void>;
  addItem: (data: AddItemInput) => Promise<{ error: string | null }>;
  editItem: (itemId: string, data: EditItemInput) => Promise<{ error: string | null }>;
  deleteItem: (itemId: string) => Promise<{ error: string | null }>;
  moveItemToAisle: (itemId: string, targetAisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>) => Promise<{ error: string | null }>;
  reorderItems: (aisleId: string, reorderedItems: GroceryItemWithAisle[]) => Promise<void>;
  endTrip: () => Promise<{ error: string | null; raceLost: boolean }>;
} {
  const [items, setItems] = useState<GroceryItemWithAisle[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const isInitialLoad = useRef(true);
  // Tracks whether the Supabase realtime channel is live
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
      if (mutation.type === 'add_item') {
        const { error: itemErr } = await supabase
          .from('grocery_items')
          .insert(mutation.groceryItem);
        if (itemErr) return false;
        await supabase.from('item_history').insert(mutation.historyItem);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(mutation.itemId);
          return next;
        });
        return true;
      }
      if (mutation.type === 'delete_item') {
        // Silently discard conflicts (item deleted by another member)
        await supabase
          .from('grocery_items')
          .delete()
          .eq('id', mutation.itemId)
          .eq('household_id', mutation.householdId);
        return true;
      }
      if (mutation.type === 'end_trip') {
        const { error: deleteErr } = await supabase
          .from('grocery_items')
          .delete()
          .in('id', mutation.itemIds)
          .eq('household_id', mutation.householdId);
        if (deleteErr) return false;
        await supabase.from('item_history').insert(mutation.historyItems);
        return true;
      }
      return false;
    }, GROCERY_TYPES);
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
      supabase.removeChannel(channel);
    };
  }, [storeId, householdId, flushQueue]);

  // Secondary flush trigger: netinfo reconnect catches cases where the
  // Supabase channel is already SUBSCRIBED when the device regains internet.
  useEffect(() => {
    let wasOnline = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (!wasOnline && online && isConnectedRef.current) {
        flushQueue();
      }
      wasOnline = online;
    });
    return unsubscribe;
  }, [flushQueue]);

  const toggleItem = useCallback(async (itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    const currentHouseholdId = householdIdRef.current;
    if (!item || !currentHouseholdId) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id ?? null;

    const newChecked = !item.checked;
    const newCheckedAt = newChecked ? new Date().toISOString() : null;
    const newCheckedBy = newChecked ? userId : null;

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

  const addItem = useCallback(async (data: AddItemInput): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return { error: 'Not authenticated' };

    const itemId = generateId();
    const now = new Date().toISOString();
    const aisleItems = itemsRef.current.filter((i) => i.aisle_id === data.aisleId);
    const sortOrder =
      aisleItems.length > 0 ? Math.max(...aisleItems.map((i) => i.sort_order)) + 10 : 0;

    const groceryItem = {
      id: itemId,
      household_id: currentHouseholdId,
      store_id: data.storeId,
      aisle_id: data.aisleId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      notes: data.notes,
      sort_order: sortOrder,
      source: (data.source ?? 'manual') as 'manual' | 'barcode' | 'voice' | 'staples' | 'suggestion',
      barcode: data.barcode ?? null,
      created_by: userId,
      created_at: now,
    };

    const historyItem = {
      household_id: currentHouseholdId,
      name: data.name.trim().toLowerCase(),
      store_id: data.storeId,
      aisle_id: data.aisleId,
      barcode: data.barcode ?? null,
      added_by: userId,
      purchased_at: now,
    };

    if (!isConnectedRef.current) {
      // EC1-6: offline — optimistic add + enqueue
      const optimistic: GroceryItemWithAisle = {
        ...groceryItem,
        updated_at: now,
        checked: false,
        checked_at: null,
        checked_by: null,
        aisle: data.aisle,
        pending_sync: true,
      };
      if (data.storeId === storeId) {
        setItems((prev) => [...prev, optimistic]);
        setPendingIds((prev) => new Set([...prev, itemId]));
      }
      await enqueue({ type: 'add_item', householdId: currentHouseholdId, itemId, groceryItem, historyItem });
      return { error: null };
    }

    const { error: itemErr } = await supabase.from('grocery_items').insert(groceryItem);
    if (itemErr) return { error: itemErr.message };

    // Update state immediately; Realtime will re-fetch and produce the same result
    if (data.storeId === storeId) {
      const optimisticItem: GroceryItemWithAisle = {
        ...groceryItem,
        updated_at: now,
        checked: false,
        checked_at: null,
        checked_by: null,
        aisle: data.aisle,
      };
      setItems((prev) => (prev.some((i) => i.id === itemId) ? prev : [...prev, optimisticItem]));
    }

    await supabase.from('item_history').insert(historyItem);
    return { error: null };
  }, [storeId]);

  const editItem = useCallback(async (itemId: string, data: EditItemInput): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    const prevItems = itemsRef.current;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, name: data.name, store_id: data.storeId, aisle_id: data.aisleId, aisle: data.aisle, quantity: data.quantity, unit: data.unit, notes: data.notes }
          : i,
      ),
    );

    const { error } = await supabase
      .from('grocery_items')
      .update({ name: data.name, store_id: data.storeId, aisle_id: data.aisleId, quantity: data.quantity, unit: data.unit, notes: data.notes })
      .eq('id', itemId)
      .eq('household_id', currentHouseholdId);

    if (error) {
      setItems(prevItems);
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const deleteItem = useCallback(async (itemId: string): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    // Optimistic delete — remove from UI immediately
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    if (!isConnectedRef.current) {
      // Offline: queue the delete; no ⚠ icon needed since item is removed from UI
      await enqueue({ type: 'delete_item', itemId, householdId: currentHouseholdId });
      return { error: null };
    }

    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', itemId)
      .eq('household_id', currentHouseholdId);

    if (error) {
      // Network dropped — queue for retry; keep optimistic removal
      await enqueue({ type: 'delete_item', itemId, householdId: currentHouseholdId });
    }
    return { error: null };
  }, []);

  const moveItemToAisle = useCallback(async (itemId: string, targetAisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    const prevItems = itemsRef.current;
    const aisleItems = prevItems.filter((i) => i.aisle_id === targetAisle.id);
    const newSortOrder = aisleItems.length > 0 ? Math.max(...aisleItems.map((i) => i.sort_order)) + 10 : 0;

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, aisle_id: targetAisle.id, aisle: targetAisle, sort_order: newSortOrder }
          : i,
      ),
    );

    const { error } = await supabase
      .from('grocery_items')
      .update({ aisle_id: targetAisle.id, sort_order: newSortOrder })
      .eq('id', itemId)
      .eq('household_id', currentHouseholdId);

    if (error) {
      setItems(prevItems);
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const reorderItems = useCallback(async (aisleId: string, reorderedItems: GroceryItemWithAisle[]): Promise<void> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return;

    const withNewOrder = reorderedItems.map((item, index) => ({ ...item, sort_order: index * 10 }));

    setItems((prev) => {
      const rest = prev.filter((i) => i.aisle_id !== aisleId);
      return [...rest, ...withNewOrder];
    });

    if (!isConnectedRef.current) return;

    await Promise.all(
      withNewOrder.map(({ id, sort_order }) =>
        supabase
          .from('grocery_items')
          .update({ sort_order })
          .eq('id', id)
          .eq('household_id', currentHouseholdId),
      ),
    );
  }, []);

  const endTrip = useCallback(async (): Promise<{ error: string | null; raceLost: boolean }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated', raceLost: false };

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) return { error: 'Not authenticated', raceLost: false };

    const checkedItems = itemsRef.current.filter((i) => i.checked);
    if (checkedItems.length === 0) return { error: null, raceLost: false };

    const now = new Date().toISOString();
    const itemIds = checkedItems.map((i) => i.id);
    const historyItems = checkedItems.map((item) => ({
      household_id: currentHouseholdId,
      name: item.name.trim().toLowerCase(),
      store_id: item.store_id,
      aisle_id: item.aisle_id,
      added_by: userId,
      purchased_at: now,
    }));

    // Optimistic update — remove checked items immediately
    setItems((prev) => prev.filter((i) => !i.checked));

    if (!isConnectedRef.current) {
      // EC5-7: offline — queue end trip; history writes will sync on reconnect
      await enqueue({
        type: 'end_trip',
        householdId: currentHouseholdId,
        storeId,
        itemIds,
        historyItems,
      });
      return { error: null, raceLost: false };
    }

    const { error: deleteErr, count } = await supabase
      .from('grocery_items')
      .delete({ count: 'exact' })
      .in('id', itemIds)
      .eq('household_id', currentHouseholdId);

    if (deleteErr) {
      // Network dropped — queue for retry; keep optimistic removal
      await enqueue({
        type: 'end_trip',
        householdId: currentHouseholdId,
        storeId,
        itemIds,
        historyItems,
      });
      return { error: null, raceLost: false };
    }

    // EC5-4: fewer rows deleted than expected means another user beat us
    const raceLost = count !== null && count < itemIds.length;

    await supabase.from('item_history').insert(historyItems);

    return { error: null, raceLost };
  }, [storeId]);

  const itemsWithPending = useMemo(
    () => items.map((i) => ({ ...i, pending_sync: pendingIds.has(i.id) })),
    [items, pendingIds],
  );

  return { items: itemsWithPending, loading, toggleItem, addItem, editItem, deleteItem, moveItemToAisle, reorderItems, endTrip };
}
