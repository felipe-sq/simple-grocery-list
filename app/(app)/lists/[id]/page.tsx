'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AddItemBar } from '@/components/app/add-item-bar';
import { BarcodeScanner } from '@/components/app/barcode-scanner';
import { ConfirmDialog, type ConfirmRequest } from '@/components/app/confirm-dialog';
import { EditItemDialog } from '@/components/app/edit-item-dialog';
import { FilterBar } from '@/components/app/filter-bar';
import { ItemRow } from '@/components/app/item-row';
import { useHydrated } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { isCameraAvailable, lookupBarcode } from '@/lib/barcode';
import { useStore } from '@/lib/store';
import type { ListItem } from '@/types';

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();

  const list = useStore((s) => s.lists.find((l) => l.id === id) ?? null);
  const allItems = useStore((s) => s.items);
  const addItem = useStore((s) => s.addItem);
  const editItem = useStore((s) => s.editItem);
  const toggleItem = useStore((s) => s.toggleItem);
  const deleteItem = useStore((s) => s.deleteItem);
  const clearCompleted = useStore((s) => s.clearCompleted);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ListItem | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const addItemInputRef = useRef<HTMLInputElement>(null);

  // A cold deep link into a list id that isn't in the seed data (a link shared
  // from another tab, say) would otherwise render an empty pane forever.
  useEffect(() => {
    if (hydrated && !list) router.replace('/lists');
  }, [hydrated, list, router]);

  const items = useMemo(() => allItems.filter((i) => i.listId === id), [allItems, id]);

  const tags = useMemo(
    () => [...new Set(items.map((i) => i.tag).filter((t): t is string => t !== null))].sort(),
    [items],
  );

  const visible = useMemo(
    () => (selectedTag === null ? items : items.filter((i) => i.tag === selectedTag)),
    [items, selectedTag],
  );

  const pending = visible.filter((i) => !i.checked);
  const completed = visible.filter((i) => i.checked);

  const handleAdd = useCallback(
    (name: string, tag: string | null) => {
      const { error } = addItem(id, { name, tag });
      if (error) toast.error(error);
    },
    [addItem, id],
  );

  const handleDetected = useCallback(async (barcode: string) => {
    const result = await lookupBarcode(barcode);
    if (result.name) {
      setDraftName(result.name);
      addItemInputRef.current?.focus();
    } else if (result.offline) {
      toast.error('Could not reach the product lookup. Type the item name instead.');
    } else {
      toast.error('No product found for that barcode. Type the item name instead.');
    }
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-full flex-col gap-2 p-4" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card h-12 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!list) return null;

  // Computed after the hydration guard, so `navigator` is guaranteed to exist.
  // A Scan button that throws is worse than no Scan button.
  const cameraAvailable = isCameraAvailable();

  return (
    // The item column is capped and centered: a shopping list stretched across a
    // 1400px pane reads as sparse and unconsidered.
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <header className="flex items-center gap-2 px-3 pt-4 pb-2 md:pt-6">
        <Button variant="ghost" size="icon" asChild className="md:hidden">
          <Link href="/lists" aria-label="Back to lists">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: list.color ?? 'var(--primary)' }}
        />
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{list.name}</h1>
      </header>

      <FilterBar tags={tags} selectedTag={selectedTag} onSelect={setSelectedTag} />

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {pending.length === 0 && completed.length === 0 ? (
          <p className="text-muted-foreground px-1 pt-10 text-center text-sm">
            {items.length === 0 ? 'Nothing on this list yet.' : 'Nothing matches this tag.'}
          </p>
        ) : null}

        {pending.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onToggle={(i) => toggleItem(i.id)}
            onEdit={setEditTarget}
            onDelete={(i) => deleteItem(i.id)}
            onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
          />
        ))}

        {completed.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-1 pt-5 pb-1">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Completed · {completed.length}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7"
                onClick={() =>
                  setConfirm({
                    title: 'Clear completed items?',
                    description:
                      'All checked-off items on this list will be permanently removed. This cannot be undone.',
                    confirmLabel: 'Clear all',
                    destructive: true,
                    onConfirm: () => clearCompleted(id),
                  })
                }
              >
                Clear all
              </Button>
            </div>
            {completed.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={(i) => toggleItem(i.id)}
                onEdit={setEditTarget}
                onDelete={(i) => deleteItem(i.id)}
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
              />
            ))}
          </>
        ) : null}
      </div>

      <AddItemBar
        tags={tags}
        selectedTag={selectedTag}
        name={draftName}
        onNameChange={setDraftName}
        inputRef={addItemInputRef}
        onAdd={handleAdd}
        onScan={cameraAvailable ? () => setScannerOpen(true) : null}
      />

      <EditItemDialog
        item={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSave={(itemId, input) => editItem(itemId, input).error}
        onDelete={(item) => deleteItem(item.id)}
      />

      <BarcodeScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(barcode) => void handleDetected(barcode)}
      />

      <ConfirmDialog request={confirm} onOpenChange={(open) => !open && setConfirm(null)} />
    </div>
  );
}
