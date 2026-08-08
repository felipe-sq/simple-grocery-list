'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmRequest = {
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Replaces the RN app's `alert()` helper. Every destructive action in the app
 * routes through here so nothing is deleted on a single stray tap.
 */
export function ConfirmDialog({ request, onOpenChange }: ConfirmDialogProps) {
  return (
    <Dialog open={request !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          {request?.description ? (
            <DialogDescription>{request.description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={request?.destructive ? 'destructive' : 'default'}
            onClick={() => {
              request?.onConfirm();
              onOpenChange(false);
            }}
          >
            {request?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
