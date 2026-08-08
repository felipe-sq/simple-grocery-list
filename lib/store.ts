'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { seedItems, seedList } from '@/lib/seed';
import type {
  AddItemInput,
  DemoSession,
  EditItemInput,
  List,
  ListItem,
  MutationResult,
} from '@/types';

/**
 * Single source of truth for the demo, persisted to sessionStorage.
 *
 * sessionStorage (not localStorage) is deliberate: a refresh or a deep link
 * keeps the visitor's work, but closing the tab clears it. It is also scoped
 * per tab, which is what makes every tab an independent instance of the app
 * with no tenancy model of any kind.
 */

const STORAGE_KEY = 'simple-grocery-list';

function newId(): string {
  return crypto.randomUUID();
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function nextSortOrder(rows: { sortOrder: number }[]): number {
  return rows.length > 0 ? Math.max(...rows.map((r) => r.sortOrder)) + 10 : 0;
}

type StoreState = {
  session: DemoSession | null;
  lists: List[];
  items: ListItem[];
  demoNoticeDismissed: boolean;

  signIn: (email: string) => void;
  signOut: () => void;
  dismissDemoNotice: () => void;

  createList: (name: string, color: string | null) => List;
  updateList: (listId: string, fields: Partial<Pick<List, 'name' | 'color'>>) => void;
  deleteList: (listId: string) => void;

  addItem: (listId: string, input: AddItemInput) => MutationResult;
  editItem: (itemId: string, input: EditItemInput) => MutationResult;
  toggleItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  clearCompleted: (listId: string) => void;

  resetDemo: () => void;
};

function initialData(): Pick<StoreState, 'lists' | 'items'> {
  return { lists: [seedList], items: seedItems };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      session: null,
      ...initialData(),
      demoNoticeDismissed: false,

      signIn: (email) => {
        const displayName = email.split('@')[0] || 'Guest';
        set({ session: { email, displayName } });
      },

      // Signing out clears the demo account but keeps the lists: the data was
      // never tied to the account in the first place, and wiping a visitor's
      // work on sign-out would be surprising.
      signOut: () => set({ session: null }),

      dismissDemoNotice: () => set({ demoNoticeDismissed: true }),

      createList: (name, color) => {
        const list: List = {
          id: newId(),
          name: name.trim(),
          color,
          sortOrder: nextSortOrder(get().lists),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ lists: [...state.lists, list] }));
        return list;
      },

      updateList: (listId, fields) =>
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === listId ? { ...l, ...fields, name: fields.name?.trim() ?? l.name } : l,
          ),
        })),

      deleteList: (listId) =>
        set((state) => ({
          lists: state.lists.filter((l) => l.id !== listId),
          items: state.items.filter((i) => i.listId !== listId),
        })),

      /**
       * The duplicate rule. In the Supabase version this was enforced twice —
       * a unique partial index on (list_id, LOWER(name)) WHERE checked = false,
       * plus a UI check. The index is gone with the database, so this function
       * is now the ONLY enforcement point. Do not re-implement it in a
       * component; call this and surface the returned error.
       */
      addItem: (listId, input) => {
        const name = input.name.trim();
        if (!name) return { error: 'Name is required' };

        const duplicate = get().items.some(
          (i) => i.listId === listId && !i.checked && normalize(i.name) === normalize(name),
        );
        if (duplicate) return { error: `"${name}" is already on this list` };

        const listItems = get().items.filter((i) => i.listId === listId);
        const item: ListItem = {
          id: newId(),
          listId,
          name,
          tag: input.tag,
          quantity: input.quantity ?? null,
          unit: input.unit ?? null,
          notes: input.notes ?? null,
          checked: false,
          checkedAt: null,
          sortOrder: nextSortOrder(listItems),
          source: input.source ?? 'manual',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [...state.items, item] }));
        return { error: null };
      },

      /** Renaming has to clear the same duplicate bar, excluding itself. */
      editItem: (itemId, input) => {
        const name = input.name.trim();
        if (!name) return { error: 'Name is required' };

        const target = get().items.find((i) => i.id === itemId);
        if (!target) return { error: 'Item no longer exists' };

        const duplicate = get().items.some(
          (i) =>
            i.id !== itemId &&
            i.listId === target.listId &&
            !i.checked &&
            normalize(i.name) === normalize(name),
        );
        if (duplicate) return { error: `"${name}" is already on this list` };

        set((state) => ({
          items: state.items.map((i) => (i.id === itemId ? { ...i, ...input, name } : i)),
        }));
        return { error: null };
      },

      toggleItem: (itemId) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  checked: !i.checked,
                  checkedAt: !i.checked ? new Date().toISOString() : null,
                }
              : i,
          ),
        })),

      deleteItem: (itemId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) })),

      clearCompleted: (listId) =>
        set((state) => ({
          items: state.items.filter((i) => !(i.listId === listId && i.checked)),
        })),

      resetDemo: () => set({ ...initialData(), session: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // Reading sessionStorage during render would break SSR, so rehydration
      // is deferred and triggered explicitly from StoreProvider's effect.
      skipHydration: true,
      partialize: (state) => ({
        session: state.session,
        lists: state.lists,
        items: state.items,
        demoNoticeDismissed: state.demoNoticeDismissed,
      }),
    },
  ),
);
