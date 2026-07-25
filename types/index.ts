export type List = {
  id: string;
  household_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
};

export type GroceryItem = {
  id: string;
  household_id: string;
  list_id: string;
  tag: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  sort_order: number;
  // 'staples' | 'suggestion' only appear on rows migrated from the old model.
  source: 'manual' | 'staples' | 'suggestion' | 'barcode' | 'voice';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Client-only: set when a mutation is queued offline.
  pending_sync?: boolean;
};

export type AddItemInput = {
  name: string;
  tag: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  barcode?: string | null;
  source?: GroceryItem['source'];
};

export type BarcodePrefill = {
  barcode: string;
  name: string | null;
  fromHistory: boolean;
  offline?: boolean;
};

export type ParsedVoiceItem = {
  name: string;
  qty: number;
  unit: string | null;
  rawText: string;
  parsed: boolean; // false = couldn't extract a clean name, raw text pre-filled
};

export type PresencePayload = {
  user_id: string;
  user_name: string;
  list_id: string | null;
};

export type HouseholdMember = {
  user_id: string;
  name: string;
  joined_at: string;
};
