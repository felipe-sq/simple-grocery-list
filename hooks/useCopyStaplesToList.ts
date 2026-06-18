import { useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { Aisle, StapleItemWithDetails } from '@/types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type AisleMismatch = {
  staple: StapleItemWithDetails;
  targetStoreId: string;
  targetStoreName: string;
  availableAisles: Aisle[];
};

export type CheckResult = {
  duplicateIds: Set<string>;
};

export type MismatchResult = {
  mismatches: AisleMismatch[];
  aislesByStore: Map<string, Aisle[]>;
};

export type CopyResult = {
  addedCount: number;
  skippedNoStore: number;
  error: string | null;
};

// null targetStoreId = "each item's default store"
export function useCopyStaplesToList(householdId: string | null) {
  const checkDuplicates = useCallback(
    async (
      staples: StapleItemWithDetails[],
      targetStoreId: string | null,
    ): Promise<Set<string>> => {
      if (!householdId || staples.length === 0) return new Set();

      const storeIds = new Set<string>();
      if (targetStoreId !== null) {
        storeIds.add(targetStoreId);
      } else {
        for (const s of staples) {
          if (s.default_store_id) storeIds.add(s.default_store_id);
        }
      }
      if (storeIds.size === 0) return new Set();

      const { data } = await supabase
        .from('grocery_items')
        .select('name, store_id')
        .eq('household_id', householdId)
        .eq('checked', false)
        .in('store_id', Array.from(storeIds));

      const storeNamesMap = new Map<string, Set<string>>();
      for (const row of (data ?? []) as { name: string; store_id: string }[]) {
        if (!storeNamesMap.has(row.store_id)) storeNamesMap.set(row.store_id, new Set());
        storeNamesMap.get(row.store_id)!.add(row.name.toLowerCase());
      }

      const duplicateIds = new Set<string>();
      for (const staple of staples) {
        const sid = targetStoreId ?? staple.default_store_id;
        if (!sid) continue;
        if (storeNamesMap.get(sid)?.has(staple.name.toLowerCase())) {
          duplicateIds.add(staple.id);
        }
      }
      return duplicateIds;
    },
    [householdId],
  );

  // Finds staples whose aisle is missing in the target store. Returns mismatches + all fetched aisles.
  const findAisleMismatches = useCallback(
    async (
      staples: StapleItemWithDetails[],
      targetStoreId: string | null,
      stores: { id: string; name: string }[],
    ): Promise<MismatchResult> => {
      if (!householdId || staples.length === 0) return { mismatches: [], aislesByStore: new Map() };

      const storeIds = new Set<string>();
      if (targetStoreId !== null) {
        storeIds.add(targetStoreId);
      } else {
        for (const s of staples) {
          if (s.default_store_id) storeIds.add(s.default_store_id);
        }
      }

      const { data: aisleRows } = await supabase
        .from('aisles')
        .select('*')
        .eq('household_id', householdId)
        .in('store_id', Array.from(storeIds))
        .order('sort_order');

      const aislesByStore = new Map<string, Aisle[]>();
      for (const a of (aisleRows as Aisle[]) ?? []) {
        if (!aislesByStore.has(a.store_id)) aislesByStore.set(a.store_id, []);
        aislesByStore.get(a.store_id)!.push(a);
      }

      const mismatches: AisleMismatch[] = [];

      for (const staple of staples) {
        const sid = targetStoreId ?? staple.default_store_id;
        if (!sid) continue;

        const storeAisles = aislesByStore.get(sid) ?? [];
        const storeName = stores.find((s) => s.id === sid)?.name ?? 'Unknown store';

        if (sid === staple.default_store_id && staple.default_aisle_id) {
          if (storeAisles.some((a) => a.id === staple.default_aisle_id)) continue;
          mismatches.push({ staple, targetStoreId: sid, targetStoreName: storeName, availableAisles: storeAisles });
          continue;
        }

        if (staple.aisle !== null) {
          const nameMatch = storeAisles.find(
            (a) => a.name.toLowerCase() === staple.aisle!.name.toLowerCase(),
          );
          if (nameMatch) continue;
        }

        mismatches.push({ staple, targetStoreId: sid, targetStoreName: storeName, availableAisles: storeAisles });
      }

      return { mismatches, aislesByStore };
    },
    [householdId],
  );

  const copyItems = useCallback(
    async (
      staples: StapleItemWithDetails[],
      targetStoreId: string | null,
      aislesByStore: Map<string, Aisle[]>,
      aisleOverrides: Map<string, string>,
      userId: string,
    ): Promise<CopyResult> => {
      if (!householdId) return { addedCount: 0, skippedNoStore: 0, error: 'Not authenticated' };

      const now = new Date().toISOString();
      const base = Date.now();
      const inserts: object[] = [];
      let skippedNoStore = 0;

      for (let i = 0; i < staples.length; i++) {
        const staple = staples[i];
        const sid = targetStoreId ?? staple.default_store_id;

        if (!sid) {
          skippedNoStore++;
          continue;
        }

        let aisleId: string | null = null;

        if (aisleOverrides.has(staple.id)) {
          aisleId = aisleOverrides.get(staple.id)!;
        } else if (sid === staple.default_store_id && staple.default_aisle_id) {
          aisleId = staple.default_aisle_id;
        } else if (staple.aisle !== null) {
          const storeAisles = aislesByStore.get(sid) ?? [];
          const match = storeAisles.find(
            (a) => a.name.toLowerCase() === staple.aisle!.name.toLowerCase(),
          );
          if (match) aisleId = match.id;
        }

        if (aisleId === null) continue;

        inserts.push({
          id: generateId(),
          household_id: householdId,
          store_id: sid,
          aisle_id: aisleId,
          name: staple.name,
          quantity: staple.default_qty,
          unit: staple.default_unit,
          notes: null,
          sort_order: base * 10 + i,
          source: 'staples' as const,
          created_by: userId,
          created_at: now,
        });
      }

      if (inserts.length === 0) return { addedCount: 0, skippedNoStore, error: null };

      const { error } = await supabase.from('grocery_items').insert(inserts);
      if (error) return { addedCount: 0, skippedNoStore, error: error.message };

      return { addedCount: inserts.length, skippedNoStore, error: null };
    },
    [householdId],
  );

  return { checkDuplicates, findAisleMismatches, copyItems };
}
