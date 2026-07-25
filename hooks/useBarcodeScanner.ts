import { useCallback } from 'react';

import type { BarcodePrefill } from '@/types';

export function useBarcodeScanner() {
  const lookupBarcode = useCallback(async (barcode: string): Promise<BarcodePrefill> => {
    // Open Food Facts lookup; if network fails, signal offline
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      if (!res.ok) {
        return { barcode, name: null, fromHistory: false };
      }
      const json = (await res.json()) as {
        product?: { product_name_en?: string; product_name?: string };
      };
      const rawName = json?.product?.product_name_en ?? json?.product?.product_name ?? null;
      return { barcode, name: rawName ?? null, fromHistory: false };
    } catch {
      return { barcode, name: null, fromHistory: false, offline: true };
    }
  }, []);

  return { lookupBarcode };
}
