/**
 * Barcode support, split so the expensive part stays out of the initial bundle.
 *
 * Chrome, Edge and Android expose a native `BarcodeDetector`, which costs
 * nothing. Safari and Firefox do not, so we fall back to @zxing/browser — a
 * ~200 KB decoder that is dynamically imported only when a scan actually
 * starts, never on page load.
 */

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] as const;

type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: readonly string[];
}) => NativeBarcodeDetector;

function getNativeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
  return ctor ?? null;
}

/** True when a camera can be opened at all. Used to decide whether to render the Scan button. */
export function isCameraAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    // getUserMedia requires a secure context; localhost counts as one.
    (typeof window === 'undefined' || window.isSecureContext)
  );
}

export type StopScan = () => void;

/**
 * Streams `video` and invokes `onResult` with the first barcode found.
 * Returns a cleanup function that stops both the decoder and the camera track.
 */
export async function startScanning(
  video: HTMLVideoElement,
  stream: MediaStream,
  onResult: (value: string) => void,
): Promise<StopScan> {
  const NativeDetector = getNativeDetector();

  if (NativeDetector) {
    const detector = new NativeDetector({ formats: FORMATS });
    let active = true;

    const tick = async () => {
      if (!active) return;
      try {
        const results = await detector.detect(video);
        if (results.length > 0 && results[0].rawValue) {
          onResult(results[0].rawValue);
          return;
        }
      } catch {
        // A transient decode failure is normal between frames; keep polling.
      }
      if (active) requestAnimationFrame(() => void tick());
    };

    void tick();
    return () => {
      active = false;
    };
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromStream(stream, video, (result) => {
    if (result) onResult(result.getText());
  });
  return () => controls.stop();
}

export type BarcodeLookup = {
  barcode: string;
  name: string | null;
  offline: boolean;
};

/**
 * Open Food Facts lookup. Ported unchanged from the Expo app's
 * `useBarcodeScanner` — it was always a plain CORS-enabled fetch with no
 * database involvement, so it survived the backend removal intact.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookup> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!response.ok) return { barcode, name: null, offline: false };

    const json = (await response.json()) as {
      product?: { product_name_en?: string; product_name?: string };
    };
    const name = json?.product?.product_name_en ?? json?.product?.product_name ?? null;
    return { barcode, name: name?.trim() || null, offline: false };
  } catch {
    return { barcode, name: null, offline: true };
  }
}
