'use client';

import { Plus, ScanBarcode } from 'lucide-react';
import { useState, type RefObject } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddItemBarProps {
  tags: string[];
  /** Active tag filter — new items inherit it so filtering then adding is coherent. */
  selectedTag: string | null;
  /**
   * The draft name is owned by the page: the barcode scanner writes into it
   * directly, which keeps the prefill an event, not an effect that syncs props
   * into state.
   */
  name: string;
  onNameChange: (name: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (name: string, tag: string | null) => void;
  onScan: (() => void) | null;
}

export function AddItemBar({
  tags,
  selectedTag,
  name,
  onNameChange,
  inputRef,
  onAdd,
  onScan,
}: AddItemBarProps) {
  const [tag, setTag] = useState<string | null>(null);

  const effectiveTag = tag ?? selectedTag;
  const trimmed = name.trim();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    onAdd(trimmed, effectiveTag);
    onNameChange('');
    setTag(null);
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-background border-t px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      {tags.length > 0 ? (
        <div
          className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto"
          role="group"
          aria-label="Tag for new item"
        >
          {tags.map((option) => {
            const active = effectiveTag === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setTag(active ? null : option)}
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Add an item…"
          aria-label="Item name"
          className="bg-card flex-1"
          maxLength={80}
        />
        {onScan ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onScan}
            aria-label="Scan barcode"
          >
            <ScanBarcode className="size-5" />
          </Button>
        ) : null}
        <Button type="submit" size="icon" disabled={!trimmed} aria-label="Add item">
          <Plus className="size-5" />
        </Button>
      </div>
    </form>
  );
}
