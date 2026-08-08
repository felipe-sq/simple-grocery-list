'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { List } from '@/types';

interface ListCardProps {
  list: List;
  totalCount: number;
  remainingCount: number;
  active: boolean;
  onEdit: (list: List) => void;
}

export function ListCard({ list, totalCount, remainingCount, active, onEdit }: ListCardProps) {
  const allDone = totalCount > 0 && remainingCount === 0;
  const subtitle =
    totalCount === 0
      ? 'Empty'
      : allDone
        ? `All ${totalCount} done`
        : `${remainingCount} of ${totalCount} left`;

  return (
    <div
      className={cn(
        'group bg-card relative flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
        active ? 'ring-primary ring-2' : 'hover:bg-muted/60',
      )}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: list.color ?? 'var(--primary)' }}
      />

      <Link href={`/lists/${list.id}`} className="min-w-0 flex-1 focus:outline-none">
        {/* Stretched link: the whole card is the hit target, but the DOM keeps a
            single real link so keyboard and screen-reader users get one stop. */}
        <span className="absolute inset-0 rounded-lg" />
        <span className="text-foreground block truncate font-medium">{list.name}</span>
        <span className={cn('block text-sm', allDone ? 'text-accent' : 'text-muted-foreground')}>
          {subtitle}
        </span>
      </Link>

      {/* Always visible on touch, where there is no hover to reveal it. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Options for ${list.name}`}
        className="relative z-10 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        onClick={(event) => {
          event.preventDefault();
          onEdit(list);
        }}
      >
        <MoreHorizontal className="size-4" />
      </Button>
    </div>
  );
}
