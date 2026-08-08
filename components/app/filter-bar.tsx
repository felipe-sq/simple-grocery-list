'use client';

import { cn } from '@/lib/utils';

interface FilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onSelect: (tag: string | null) => void;
}

export function FilterBar({ tags, selectedTag, onSelect }: FilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div
      className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2"
      role="group"
      aria-label="Filter by tag"
    >
      <Chip active={selectedTag === null} onClick={() => onSelect(null)}>
        All
      </Chip>
      {tags.map((tag) => (
        <Chip
          key={tag}
          active={selectedTag === tag}
          onClick={() => onSelect(selectedTag === tag ? null : tag)}
        >
          {tag}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
