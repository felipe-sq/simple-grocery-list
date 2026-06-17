import AsyncStorage from '@react-native-async-storage/async-storage';

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
    source: 'manual';
    created_by: string;
    created_at: string;
  };
  historyItem: {
    household_id: string;
    name: string;
    store_id: string;
    aisle_id: string;
    added_by: string;
    purchased_at: string;
  };
};

export type OfflineMutation = ToggleItemMutation | AddItemMutation;

async function getQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

export async function enqueue(mutation: OfflineMutation): Promise<void> {
  const queue = await getQueue();
  queue.push(mutation);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Calls processor for each queued mutation.
 * Returns the item IDs successfully processed; removes them from the queue.
 * Mutations that return false remain in the queue for the next flush.
 */
export async function flush(
  processor: (mutation: OfflineMutation) => Promise<boolean>,
): Promise<string[]> {
  const queue = await getQueue();
  if (queue.length === 0) return [];

  const flushedIds: string[] = [];
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    const ok = await processor(mutation);
    if (ok) {
      if (mutation.type === 'toggle_item') flushedIds.push(mutation.itemId);
    } else {
      remaining.push(mutation);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return flushedIds;
}
