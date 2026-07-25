import { storage } from './storage';
import { supabase } from './supabase';

const QUEUE_KEY = 'grocery_offline_queue';

export type ToggleItemMutation = {
  type: 'toggle_item';
  itemId: string;
  householdId: string;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
};

export type AddItemMutation = {
  type: 'add_item';
  householdId: string;
  itemId: string;
  groceryItem: {
    id: string;
    household_id: string;
    list_id: string;
    tag: string | null;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    sort_order: number;
    source: 'manual' | 'barcode' | 'voice';
    barcode: string | null;
    created_by: string;
    created_at: string;
  };
};

export type DeleteItemMutation = {
  type: 'delete_item';
  itemId: string;
  householdId: string;
};

export type ClearCompletedMutation = {
  type: 'clear_completed';
  householdId: string;
  listId: string;
  itemIds: string[];
};

export type OfflineMutation =
  | ToggleItemMutation
  | AddItemMutation
  | DeleteItemMutation
  | ClearCompletedMutation;

async function getQueue(): Promise<OfflineMutation[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

export async function enqueue(mutation: OfflineMutation): Promise<void> {
  const queue = await getQueue();
  queue.push(mutation);
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

const GROCERY_TYPES = ['toggle_item', 'add_item', 'delete_item', 'clear_completed'] as const;

/**
 * Replays all queued grocery mutations against Supabase. Called from the
 * app layout (mount + reconnect) so queued check-offs sync even when no
 * list-detail screen is open, and from useItems on channel (re)subscribe.
 * onFlushed receives the item id of each successfully synced toggle/add.
 */
export async function flushGroceryMutations(onFlushed?: (itemId: string) => void): Promise<void> {
  const flushedIds = await flush(async (mutation) => {
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
      return !error;
    }
    if (mutation.type === 'add_item') {
      const { error } = await supabase.from('grocery_items').insert(mutation.groceryItem);
      return !error;
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

  if (onFlushed) flushedIds.forEach(onFlushed);
}

let isFlushing = false;

/**
 * Serially processes all queued mutations of the given types.
 * Returns item IDs (grocery items) that were successfully flushed.
 * Mutations that return false remain in the queue for the next flush.
 * Conflicts (item no longer exists) are silently discarded (return true).
 * Pass `types` to process only a subset of mutation types.
 */
export async function flush(
  processor: (mutation: OfflineMutation) => Promise<boolean>,
  types?: readonly OfflineMutation['type'][],
): Promise<string[]> {
  if (isFlushing) return [];
  isFlushing = true;

  try {
    const queue = await getQueue();
    if (queue.length === 0) return [];

    const flushedIds: string[] = [];
    const remaining: OfflineMutation[] = [];

    for (const mutation of queue) {
      if (types !== undefined && !types.includes(mutation.type)) {
        remaining.push(mutation);
        continue;
      }

      const ok = await processor(mutation);
      if (ok) {
        if (mutation.type === 'toggle_item' || mutation.type === 'add_item') {
          flushedIds.push(mutation.itemId);
        }
      } else {
        remaining.push(mutation);
      }
    }

    await storage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return flushedIds;
  } finally {
    isFlushing = false;
  }
}
