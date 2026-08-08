'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EditItemInput, ListItem } from '@/types';

interface EditItemDialogProps {
  item: ListItem | null;
  onOpenChange: (open: boolean) => void;
  /** Returns an error message when the duplicate rule rejects the rename. */
  onSave: (itemId: string, input: EditItemInput) => string | null;
  /**
   * The only delete path that works on touch and with a screen reader — the
   * swipe gesture is neither.
   */
  onDelete: (item: ListItem) => void;
}

export function EditItemDialog({ item, onOpenChange, onSave, onDelete }: EditItemDialogProps) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Keyed and mounted per item, so the fields initialize from props and
            never need an effect to reset between edits. */}
        {item ? (
          <EditItemForm
            key={item.id}
            item={item}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onDelete={onDelete}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditItemForm({
  item,
  onOpenChange,
  onSave,
  onDelete,
}: {
  item: ListItem;
  onOpenChange: (open: boolean) => void;
  onSave: EditItemDialogProps['onSave'];
  onDelete: EditItemDialogProps['onDelete'];
}) {
  const [name, setName] = useState(item.name);
  const [tag, setTag] = useState(item.tag ?? '');
  const [quantity, setQuantity] = useState(item.quantity !== null ? String(item.quantity) : '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedQuantity = quantity.trim() === '' ? null : Number(quantity);
    if (parsedQuantity !== null && !Number.isFinite(parsedQuantity)) {
      setError('Quantity must be a number');
      return;
    }

    const message = onSave(item.id, {
      name: name.trim(),
      tag: tag.trim() || null,
      quantity: parsedQuantity,
      unit: unit.trim() || null,
      notes: notes.trim() || null,
    });

    if (message) {
      setError(message);
      return;
    }
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit item</DialogTitle>
        <DialogDescription>Update the name, quantity, tag, or notes.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="item-name">Name</Label>
          <Input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            maxLength={80}
            aria-invalid={error !== null}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="item-quantity">Quantity</Label>
            <Input
              id="item-quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              inputMode="decimal"
              placeholder="2"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="item-unit">Unit</Label>
            <Input
              id="item-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="L"
              maxLength={16}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="item-tag">Tag</Label>
          <Input
            id="item-tag"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Produce"
            maxLength={24}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="item-notes">Notes</Label>
          <Input
            id="item-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Sharp, not mild"
            maxLength={120}
          />
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            onOpenChange(false);
            onDelete(item);
          }}
        >
          Delete
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
