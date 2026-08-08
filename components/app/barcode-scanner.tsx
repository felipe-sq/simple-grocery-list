'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { startScanning, type StopScan } from '@/lib/barcode';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
}

type Status = 'starting' | 'scanning' | 'denied' | 'failed';

export function BarcodeScanner({ open, onOpenChange, onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('starting');

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let stopScan: StopScan | null = null;
    let canceled = false;

    async function begin() {
      setStatus('starting');
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (canceled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (canceled) return;

        setStatus('scanning');
        stopScan = await startScanning(video, stream, (value) => {
          if (canceled) return;
          canceled = true;
          onDetected(value);
          onOpenChange(false);
        });
      } catch (error) {
        if (canceled) return;
        const denied = error instanceof DOMException && error.name === 'NotAllowedError';
        setStatus(denied ? 'denied' : 'failed');
      }
    }

    void begin();

    return () => {
      canceled = true;
      stopScan?.();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan a barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a product barcode. We&apos;ll look up its name and prefill it for
            you.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative aspect-4/3 overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
            aria-label="Camera preview"
          />

          {status === 'scanning' ? (
            <div
              aria-hidden
              className="border-primary/80 pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2"
            />
          ) : null}

          {status !== 'scanning' ? (
            <div className="bg-muted absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              {status === 'starting' ? (
                <>
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  <p className="text-muted-foreground text-sm">Starting camera…</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {status === 'denied'
                    ? 'Camera access was denied. Type the item name instead.'
                    : 'Could not start the camera. Type the item name instead.'}
                </p>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
