export type Store = {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Aisle = {
  id: string;
  household_id: string;
  store_id: string;
  name: string;
  sort_order: number;
};

export type GroceryItem = {
  id: string;
  household_id: string;
  store_id: string;
  aisle_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  sort_order: number;
  source: 'manual' | 'staples' | 'suggestion' | 'barcode' | 'voice';
  created_by: string;
  created_at: string;
  updated_at: string;
};

// GroceryItem with the joined aisle row (id, name, sort_order only).
// pending_sync is client-only: set when a mutation is queued offline.
export type GroceryItemWithAisle = GroceryItem & {
  aisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>;
  pending_sync?: boolean;
};

export type AisleGroup = {
  aisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>;
  items: GroceryItemWithAisle[];
};
