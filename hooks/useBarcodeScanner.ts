import { useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import type { Aisle, BarcodePrefill } from '@/types';

export function useBarcodeScanner(householdId: string | null) {
  const lookupBarcode = useCallback(
    async (barcode: string): Promise<BarcodePrefill> => {
      // EC3-2: check item_history for a prior scan of the same barcode
      if (householdId) {
        const { data: historyRows } = await supabase
          .from('item_history')
          .select('name, store_id, aisle_id, aisle:aisles(id, name, sort_order, color)')
          .eq('household_id', householdId)
          .eq('barcode', barcode)
          .order('purchased_at', { ascending: false })
          .limit(1);

        if (historyRows && historyRows.length > 0) {
          const row = historyRows[0];
          const aisleArr = row.aisle as unknown as Pick<Aisle, 'id' | 'name' | 'sort_order' | 'color'>[];
          return {
            barcode,
            name: row.name as string,
            fromHistory: true,
            historyStoreId: row.store_id as string,
            historyAisleId: row.aisle_id as string,
            historyAisle: aisleArr[0] ?? undefined,
          };
        }
      }

      // EC3-5: not in history — attempt Open Food Facts API; if network fails, signal offline
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        );
        if (!res.ok) {
          return { barcode, name: null, fromHistory: false };
        }
        const json = (await res.json()) as {
          product?: { product_name_en?: string; product_name?: string };
        };
        const rawName =
          json?.product?.product_name_en ?? json?.product?.product_name ?? null;
        return { barcode, name: rawName ?? null, fromHistory: false };
      } catch {
        // EC3-5: network error — offline with no cached match
        return { barcode, name: null, fromHistory: false, offline: true };
      }
    },
    [householdId],
  );

  return { lookupBarcode };
}
