/**
 * Domain types for the demo. Every multi-user field from the Supabase era
 * (household_id, created_by, checked_by, updated_at, pending_sync) is gone:
 * there is one implicit user per browser tab, so ownership is never recorded.
 */

export type ItemSource = 'manual' | 'barcode';

export type List = {
  id: string;
  name: string;
  /** Hex color, or null to fall back to the primary accent. */
  color: string | null;
  sortOrder: number;
  createdAt: string;
};

export type ListItem = {
  id: string;
  listId: string;
  name: string;
  /** Free-text grouping label, e.g. "Produce". Null when untagged. */
  tag: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
  checkedAt: string | null;
  sortOrder: number;
  source: ItemSource;
  createdAt: string;
};

export type AddItemInput = {
  name: string;
  tag: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  source?: ItemSource;
};

export type EditItemInput = {
  name: string;
  tag: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
};

/**
 * The demo "account". No password is stored — there is nothing to
 * authenticate against, so keeping one would be pure liability.
 */
export type DemoSession = {
  email: string;
  displayName: string;
};

/** Result shape for mutations that can be rejected by the duplicate rule. */
export type MutationResult = { error: string | null };
