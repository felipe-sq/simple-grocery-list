import type { List, ListItem } from '@/types';

/**
 * Content shown on a visitor's first load. A portfolio link that opens onto an
 * empty state hides every feature the app has, so the demo starts populated:
 * three tags to exercise the filter rail, a couple of items already checked to
 * show the completed section, and quantity/unit values so those fields aren't
 * invisible.
 */

// Appears in the URL as /lists/<id>, so it tracks the list's display name.
const SEED_LIST_ID = 'seed-list-weekly-groceries';

// Fixed timestamp rather than Date.now(): a stable createdAt keeps ordering
// deterministic and avoids any hydration mismatch between server and client.
const SEED_TIME = '2026-01-01T09:00:00.000Z';

export const seedList: List = {
  id: SEED_LIST_ID,
  name: 'Weekly Groceries',
  color: '#34c759',
  sortOrder: 0,
  createdAt: SEED_TIME,
};

type SeedItem = {
  name: string;
  tag: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  notes?: string;
};

const SEED_ITEMS: SeedItem[] = [
  { name: 'Bananas', tag: 'Produce', quantity: 6, unit: null, checked: false },
  { name: 'Baby spinach', tag: 'Produce', quantity: 1, unit: 'bag', checked: false },
  { name: 'Roma tomatoes', tag: 'Produce', quantity: 4, unit: null, checked: true },
  { name: 'Whole milk', tag: 'Dairy', quantity: 1, unit: 'gal', checked: false },
  { name: 'Greek yogurt', tag: 'Dairy', quantity: 1, unit: 'tub', checked: false },
  { name: 'Cheddar', tag: 'Dairy', quantity: 8, unit: 'oz', checked: true, notes: 'Sharp, not mild' },
  { name: 'Olive oil', tag: 'Pantry', quantity: 1, unit: 'bottle', checked: false },
  { name: 'Penne', tag: 'Pantry', quantity: 1, unit: 'lb', checked: false },
  { name: 'Canned tomatoes', tag: 'Pantry', quantity: 3, unit: 'cans', checked: false },
  { name: 'Coffee beans', tag: 'Pantry', quantity: 1, unit: 'bag', checked: false, notes: 'Whole bean' },
];

export const seedItems: ListItem[] = SEED_ITEMS.map((item, index) => ({
  id: `seed-item-${index}`,
  listId: SEED_LIST_ID,
  name: item.name,
  tag: item.tag,
  quantity: item.quantity,
  unit: item.unit,
  notes: item.notes ?? null,
  checked: item.checked,
  checkedAt: item.checked ? SEED_TIME : null,
  sortOrder: index * 10,
  source: 'manual',
  createdAt: SEED_TIME,
}));
