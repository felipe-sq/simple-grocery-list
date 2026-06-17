import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { enqueue, flush } from '@/lib/offlineQueue';
import type { AddItemInput, Aisle, EditItemInput, GroceryItemWithAisle } from '@/types';

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
      if (mutation.type === 'add_item') {
        const { error: itemErr } = await supabase
          .from('grocery_items')
          .insert(mutation.groceryItem);
        if (itemErr) return false;
        // History failure is non-fatal — item is already saved
        await supabase.from('item_history').insert(mutation.historyItem);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(mutation.itemId);
          return next;
        });
        return true;
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
      source: 'manual' as const,
      created_by: userId,
      created_at: now,
    };

    const historyItem = {
      household_id: currentHouseholdId,
      name: data.name.trim().toLowerCase(),
      store_id: data.storeId,
      aisle_id: data.aisleId,
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

    // History failure is non-fatal
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

    const prevItems = itemsRef.current;

    setItems((prev) => prev.filter((i) => i.id !== itemId));

    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', itemId)
      .eq('household_id', currentHouseholdId);

    if (error) {
      setItems(prevItems);
      return { error: error.message };
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

  const itemsWithPending = useMemo(
    () => items.map((i) => ({ ...i, pending_sync: pendingIds.has(i.id) })),
    [items, pendingIds],
  );

  return { items: itemsWithPending, loading, toggleItem, addItem, editItem, deleteItem, moveItemToAisle };
}
