'use client';

import { Plus, Settings, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ConfirmDialog, type ConfirmRequest } from '@/components/app/confirm-dialog';
import { ListCard } from '@/components/app/list-card';
import { ListFormDialog } from '@/components/app/list-form-dialog';
import { useHydrated } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import type { List } from '@/types';

export function ListsSidebar() {
  const params = useParams<{ id?: string }>();
  const hydrated = useHydrated();

  const lists = useStore((s) => s.lists);
  const items = useStore((s) => s.items);
  const createList = useStore((s) => s.createList);
  const updateList = useStore((s) => s.updateList);
  const deleteList = useStore((s) => s.deleteList);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<List | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, { total: number; remaining: number }>();
    for (const item of items) {
      const entry = map.get(item.listId) ?? { total: 0, remaining: 0 };
      entry.total += 1;
      if (!item.checked) entry.remaining += 1;
      map.set(item.listId, entry);
    }
    return map;
  }, [items]);

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(list: List) {
    setEditTarget(list);
    setFormOpen(true);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-end justify-between gap-2 px-4 pt-6 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">My Lists</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings" aria-label="Settings">
              <Settings className="size-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={openCreate} aria-label="New list">
            <Plus className="size-5" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {!hydrated ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-card h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
              <ShoppingCart className="text-muted-foreground size-7" />
            </div>
            <p className="text-lg font-semibold">No lists yet</p>
            <p className="text-muted-foreground text-sm">
              Create your first list to start shopping.
            </p>
            <Button onClick={openCreate} className="mt-2">
              <Plus className="size-4" />
              New list
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {lists.map((list) => {
              const count = counts.get(list.id) ?? { total: 0, remaining: 0 };
              return (
                <li key={list.id}>
                  <ListCard
                    list={list}
                    totalCount={count.total}
                    remainingCount={count.remaining}
                    active={params?.id === list.id}
                    onEdit={openEdit}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ListFormDialog
        open={formOpen}
        list={editTarget}
        onOpenChange={setFormOpen}
        onSubmit={(name, color) => {
          if (editTarget) {
            updateList(editTarget.id, { name, color });
          } else {
            createList(name, color);
          }
        }}
        onDelete={(list) =>
          setConfirm({
            title: `Delete "${list.name}"?`,
            description:
              'This permanently removes the list and every item in it. This cannot be undone.',
            confirmLabel: 'Delete list',
            destructive: true,
            onConfirm: () => deleteList(list.id),
          })
        }
      />

      <ConfirmDialog request={confirm} onOpenChange={(open) => !open && setConfirm(null)} />
    </div>
  );
}
