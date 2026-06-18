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

export type ItemHistory = {
  id: string;
  household_id: string;
  name: string;
  store_id: string;
  aisle_id: string;
  barcode: string | null;
  purchased_at: string;
  added_by: string;
};

export type AddItemInput = {
  name: string;
  storeId: string;
  aisleId: string;
  aisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  barcode?: string | null;
  source?: GroceryItem['source'];
};

export type BarcodePrefill = {
  barcode: string;
  name: string | null;
  fromHistory: boolean;
  offline?: boolean;
  historyStoreId?: string;
  historyAisleId?: string;
  historyAisle?: Pick<Aisle, 'id' | 'name' | 'sort_order'>;
};

export type EditItemInput = {
  name: string;
  storeId: string;
  aisleId: string;
  aisle: Pick<Aisle, 'id' | 'name' | 'sort_order'>;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

export type SuggestionResult = {
  name: string;
  store_id: string;
  store_name: string;
  aisle_id: string;
  aisle_name: string;
};

export type Suggestion = {
  item_name: string;
  store_id: string;
  store_name: string;
  aisle_id: string;
  aisle_name: string;
  score: number;
  category: 'might_be_running_low' | 'ai_picks';
  rules_matched: string[];
  days_since_last_purchase: number | null;
  last_purchased_at: string | null;
};

export type StapleItem = {
  id: string;
  household_id: string;
  name: string;
  default_store_id: string | null;
  default_aisle_id: string | null;
  default_qty: number | null;
  default_unit: string | null;
  sort_order: number;
  created_at: string;
};

export type StapleItemWithDetails = StapleItem & {
  store: Pick<Store, 'id' | 'name' | 'sort_order'> | null;
  aisle: Pick<Aisle, 'id' | 'name'> | null;
};

export type StapleGroup = {
  store: Pick<Store, 'id' | 'name' | 'sort_order'> | null;
  items: StapleItemWithDetails[];
};

export type ParsedVoiceItem = {
  name: string;
  qty: number;
  unit: string | null;
  rawText: string;
  parsed: boolean; // false = EC2-3: couldn't extract a clean name, raw text pre-filled
};

export type PresencePayload = {
  user_id: string;
  user_name: string;
  store_id: string | null;
};
