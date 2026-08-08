'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'motion/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ListItem } from '@/types';

const SWIPE_DELETE_THRESHOLD = -72;

interface ItemRowProps {
  item: ListItem;
  onToggle: (item: ListItem) => void;
  onEdit: (item: ListItem) => void;
  onDelete: (item: ListItem) => void;
  onTagClick: (tag: string) => void;
}

function formatMeta(item: ListItem): string | null {
  const quantity =
    item.quantity !== null ? [item.quantity, item.unit].filter(Boolean).join(' ') : null;
  return [quantity, item.notes].filter(Boolean).join(' · ') || null;
}

export function ItemRow({ item, onToggle, onEdit, onDelete, onTagClick }: ItemRowProps) {
  const x = useMotionValue(0);
  // The red delete backdrop fades in as the row is dragged left, so the gesture
  // explains itself before the threshold is crossed.
  const backdropOpacity = useTransform(x, [SWIPE_DELETE_THRESHOLD, 0], [1, 0]);

  const meta = formatMeta(item);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x < SWIPE_DELETE_THRESHOLD) onDelete(item);
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        aria-hidden
        style={{ opacity: backdropOpacity }}
        className="bg-destructive absolute inset-0 flex items-center justify-end pr-4"
      >
        <Trash2 className="text-destructive-foreground size-5" />
      </motion.div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={{ left: 0.4, right: 0 }}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        className="group bg-card relative flex touch-pan-y items-center gap-2 px-3 py-2.5"
      >
        <button
          type="button"
          onClick={() => onToggle(item)}
          aria-pressed={item.checked}
          aria-label={
            item.checked ? `Mark ${item.name} as not bought` : `Mark ${item.name} as bought`
          }
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            item.checked
              ? 'border-accent bg-accent text-accent-foreground'
              : 'border-separator hover:border-primary',
          )}
        >
          {item.checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
        </button>

        {/* Tapping the row opens the editor. This is the only edit path that
            works on touch, where the hover buttons below never appear, and it
            keeps a keyboard stop on every row. */}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="min-w-0 flex-1 text-left"
          aria-label={`Edit ${item.name}`}
        >
          <span
            className={cn(
              'block truncate',
              item.checked ? 'text-muted-foreground line-through' : 'text-foreground',
            )}
          >
            {item.name}
          </span>
          {meta ? (
            <span className="text-muted-foreground block truncate text-xs">{meta}</span>
          ) : null}
        </button>

        {item.tag ? (
          <button
            type="button"
            onClick={() => onTagClick(item.tag as string)}
            className="bg-muted text-muted-foreground hover:text-foreground hidden shrink-0 rounded-full px-2 py-0.5 text-xs transition-colors sm:block"
          >
            {item.tag}
          </button>
        ) : null}

        {/* Desktop shortcut only: swipe is unusable with a mouse. Hidden below
            `md`, where tap-to-edit and swipe-to-delete cover the same ground
            without crowding a 390px row. */}
        <div className="hidden shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-hidden
            tabIndex={-1}
            onClick={() => onEdit(item)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive size-8"
            aria-label={`Delete ${item.name}`}
            onClick={() => onDelete(item)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
