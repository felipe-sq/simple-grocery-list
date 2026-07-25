import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { enqueue, flush } from '@/lib/offlineQueue';
import type { AddItemInput, GroceryItem } from '@/types';

const GROCERY_TYPES = ['toggle_item', 'add_item', 'delete_item', 'clear_completed'] as const;

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useItems(
  listId: string,
  householdId: string | null,
): {
  items: GroceryItem[];
  loading: boolean;
  toggleItem: (itemId: string) => Promise<void>;
  addItem: (data: AddItemInput) => Promise<{ error: string | null }>;
  editItem: (itemId: string, data: { name: string; tag: string | null; quantity: number | null; unit: string | null; notes: string | null }) => Promise<{ error: string | null }>;
  deleteItem: (itemId: string) => Promise<{ error: string | null }>;
  clearCompleted: () => Promise<{ error: string | null }>;
} {
  const [items, setItems] = useState<GroceryItem[]>([]);
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
        const { error } = await supabase
          .from('grocery_items')
          .insert(mutation.groceryItem);
        if (error) return false;
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
      if (mutation.type === 'clear_completed') {
        const { error } = await supabase
          .from('grocery_items')
          .delete()
          .in('id', mutation.itemIds)
          .eq('household_id', mutation.householdId);
        return !error;
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
        .select('*')
        .eq('list_id', listId)
        .eq('household_id', householdId)
        .order('created_at');

      if (cancelled) return;

      if (!isInitialLoad.current && Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      isInitialLoad.current = false;

      setItems((data as GroceryItem[]) ?? []);
      setLoading(false);
    }

    fetchItems();

    const channel = supabase
      .channel(`grocery_items_${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `list_id=eq.${listId}`,
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
  }, [listId, householdId, flushQueue]);

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
      // Offline — queue the mutation and mark pending
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

    const trimmed = data.name.trim();
    if (!trimmed) return { error: 'Name is required' };

    // Duplicate rule: same name (case-insensitive) unchecked in the same list.
    const duplicate = itemsRef.current.some(
      (i) => !i.checked && i.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return { error: `"${trimmed}" is already on this list` };

    const itemId = generateId();
    const now = new Date().toISOString();
    const sortOrder =
      itemsRef.current.length > 0 ? Math.max(...itemsRef.current.map((i) => i.sort_order)) + 10 : 0;

    const groceryItem = {
      id: itemId,
      household_id: currentHouseholdId,
      list_id: listId,
      tag: data.tag,
      name: trimmed,
      quantity: data.quantity ?? null,
      unit: data.unit ?? null,
      notes: data.notes ?? null,
      sort_order: sortOrder,
      source: (data.source ?? 'manual') as 'manual' | 'barcode' | 'voice',
      barcode: data.barcode ?? null,
      created_by: userId,
      created_at: now,
    };

    const optimistic: GroceryItem = {
      ...groceryItem,
      updated_at: now,
      checked: false,
      checked_at: null,
      checked_by: null,
    };

    if (!isConnectedRef.current) {
      // Offline — optimistic add + enqueue
      setItems((prev) => [...prev, { ...optimistic, pending_sync: true }]);
      setPendingIds((prev) => new Set([...prev, itemId]));
      await enqueue({ type: 'add_item', householdId: currentHouseholdId, itemId, groceryItem });
      return { error: null };
    }

    const { error } = await supabase.from('grocery_items').insert(groceryItem);
    if (error) return { error: error.message };

    // Update state immediately; Realtime will re-fetch and produce the same result
    setItems((prev) => (prev.some((i) => i.id === itemId) ? prev : [...prev, optimistic]));
    return { error: null };
  }, [listId]);

  const editItem = useCallback(async (
    itemId: string,
    data: { name: string; tag: string | null; quantity: number | null; unit: string | null; notes: string | null },
  ): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    const prevItems = itemsRef.current;

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, ...data } : i)),
    );

    const { error } = await supabase
      .from('grocery_items')
      .update(data)
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

  const clearCompleted = useCallback(async (): Promise<{ error: string | null }> => {
    const currentHouseholdId = householdIdRef.current;
    if (!currentHouseholdId) return { error: 'Not authenticated' };

    const completed = itemsRef.current.filter((i) => i.checked);
    if (completed.length === 0) return { error: null };
    const itemIds = completed.map((i) => i.id);

    // Optimistic — remove completed items immediately
    setItems((prev) => prev.filter((i) => !i.checked));

    if (!isConnectedRef.current) {
      await enqueue({ type: 'clear_completed', householdId: currentHouseholdId, listId, itemIds });
      return { error: null };
    }

    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .in('id', itemIds)
      .eq('household_id', currentHouseholdId);

    if (error) {
      await enqueue({ type: 'clear_completed', householdId: currentHouseholdId, listId, itemIds });
    }
    return { error: null };
  }, [listId]);

  const itemsWithPending = useMemo(
    () => items.map((i) => ({ ...i, pending_sync: pendingIds.has(i.id) })),
    [items, pendingIds],
  );

  return { items: itemsWithPending, loading, toggleItem, addItem, editItem, deleteItem, clearCompleted };
}
