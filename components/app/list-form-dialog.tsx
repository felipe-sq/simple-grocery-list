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
import { cn } from '@/lib/utils';
import type { List } from '@/types';

const COLORS = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa'] as const;

interface ListFormDialogProps {
  open: boolean;
  /** null = create mode; a list = edit mode. */
  list: List | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, color: string) => void;
  onDelete?: (list: List) => void;
}

export function ListFormDialog({
  open,
  list,
  onOpenChange,
  onSubmit,
  onDelete,
}: ListFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Mounted only while open and keyed by target, so the fields initialize
            from props on every open instead of being reset by an effect. */}
        {open ? (
          <ListForm
            key={list?.id ?? 'new'}
            list={list}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            onDelete={onDelete}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ListForm({
  list,
  onOpenChange,
  onSubmit,
  onDelete,
}: Omit<ListFormDialogProps, 'open'>) {
  const [name, setName] = useState(list?.name ?? '');
  const [color, setColor] = useState<string>(list?.color ?? COLORS[0]);

  const editing = list !== null;
  const trimmed = name.trim();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    onSubmit(trimmed, color);
    onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit list' : 'New list'}</DialogTitle>
        <DialogDescription>
          {editing ? 'Rename this list or change its color.' : 'Give your list a name.'}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="list-name">Name</Label>
          <Input
            id="list-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Weekly Groceries"
            autoFocus
            maxLength={60}
          />
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm leading-none font-medium">Color</legend>
          <div className="flex flex-wrap gap-2 pt-1">
            {COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Color ${option}`}
                aria-pressed={color === option}
                onClick={() => setColor(option)}
                className={cn(
                  'size-8 rounded-full transition-transform',
                  color === option
                    ? 'ring-foreground scale-110 ring-2 ring-offset-2'
                    : 'hover:scale-105',
                )}
                style={{ backgroundColor: option }}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {editing && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete(list);
            }}
          >
            Delete list
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!trimmed}>
          {editing ? 'Save' : 'Create list'}
        </Button>
      </DialogFooter>
    </form>
  );
}
