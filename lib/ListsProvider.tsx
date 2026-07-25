import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/hooks/useHousehold';
import type { List } from '@/types';

interface ListsContextValue {
  lists: List[];
  loading: boolean;
  createList: (name: string, color: string | null, icon: string | null) => Promise<{ list: List | null; error: string | null }>;
  updateList: (listId: string, fields: Partial<Pick<List, 'name' | 'color' | 'icon'>>) => Promise<string | null>;
  deleteList: (listId: string) => Promise<string | null>;
}

const ListsContext = createContext<ListsContextValue>({
  lists: [],
  loading: true,
  createList: async () => ({ list: null, error: 'Not initialized' }),
  updateList: async () => 'Not initialized',
  deleteList: async () => 'Not initialized',
});

export function ListsProvider({ children }: { children: ReactNode }) {
  const { householdId, loading: householdLoading } = useHousehold();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const listsRef = useRef<List[]>([]);
  useEffect(() => { listsRef.current = lists; }, [lists]);

  useEffect(() => {
    if (householdLoading) return;

    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setLists([]);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    let cancelled = false;

    async function fetchLists() {
      const { data } = await supabase
        .from('lists')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order');
      if (cancelled) return;
      setLists((data as List[]) ?? []);
      setLoading(false);
    }

    fetchLists();

    const channel = supabase
      .channel(`lists_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lists',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchLists(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [householdId, householdLoading]);

  const createList = useCallback(
    async (name: string, color: string | null, icon: string | null): Promise<{ list: List | null; error: string | null }> => {
      if (!householdId) return { list: null, error: 'Not authenticated' };
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) return { list: null, error: 'Not authenticated' };

      const existing = listsRef.current;
      const sortOrder = existing.length > 0 ? Math.max(...existing.map((l) => l.sort_order)) + 10 : 0;
      const { data, error } = await supabase
        .from('lists')
        .insert({ household_id: householdId, name, color, icon, sort_order: sortOrder, created_by: userId })
        .select()
        .single();
      if (error) return { list: null, error: error.message };
      const newList = data as List;
      setLists((prev) => (prev.some((l) => l.id === newList.id) ? prev : [...prev, newList]));
      return { list: newList, error: null };
    },
    [householdId],
  );

  const updateList = useCallback(
    async (listId: string, fields: Partial<Pick<List, 'name' | 'color' | 'icon'>>): Promise<string | null> => {
      const { error } = await supabase.from('lists').update(fields).eq('id', listId);
      if (!error) setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, ...fields } : l)));
      return error?.message ?? null;
    },
    [],
  );

  const deleteList = useCallback(
    async (listId: string): Promise<string | null> => {
      const { error } = await supabase.from('lists').delete().eq('id', listId);
      if (!error) setLists((prev) => prev.filter((l) => l.id !== listId));
      return error?.message ?? null;
    },
    [],
  );

  return (
    <ListsContext.Provider value={{ lists, loading, createList, updateList, deleteList }}>
      {children}
    </ListsContext.Provider>
  );
}

export function useListsContext(): ListsContextValue {
  return useContext(ListsContext);
}
