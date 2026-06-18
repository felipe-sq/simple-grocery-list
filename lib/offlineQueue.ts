import { storage } from './storage';

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
    store_id: string;
    aisle_id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    sort_order: number;
    source: 'manual' | 'barcode' | 'voice' | 'staples' | 'suggestion';
    barcode: string | null;
    created_by: string;
    created_at: string;
  };
  historyItem: {
    household_id: string;
    name: string;
    store_id: string;
    aisle_id: string;
    barcode: string | null;
    added_by: string;
    purchased_at: string;
  };
};

export type DeleteItemMutation = {
  type: 'delete_item';
  itemId: string;
  householdId: string;
};

export type EndTripMutation = {
  type: 'end_trip';
  householdId: string;
  storeId: string;
  itemIds: string[];
  historyItems: {
    household_id: string;
    name: string;
    store_id: string;
    aisle_id: string;
    added_by: string;
    purchased_at: string;
  }[];
};

export type AddStapleMutation = {
  type: 'add_staple';
  householdId: string;
  staple: {
    household_id: string;
    name: string;
    default_store_id: string | null;
    default_aisle_id: string | null;
    default_qty: number | null;
    default_unit: string | null;
    sort_order: number;
  };
};

export type DismissSuggestionMutation = {
  type: 'dismiss_suggestion';
  householdId: string;
  dismissal: {
    household_id: string;
    item_name: string;
    dismissed_at: string;
    resurface_at: string;
    dismissed_by: string;
  };
};

export type OfflineMutation =
  | ToggleItemMutation
  | AddItemMutation
  | DeleteItemMutation
  | EndTripMutation
  | AddStapleMutation
  | DismissSuggestionMutation;

async function getQueue(): Promise<OfflineMutation[]> {
  const raw = await storage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

export async function enqueue(mutation: OfflineMutation): Promise<void> {
  const queue = await getQueue();
  queue.push(mutation);
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
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
