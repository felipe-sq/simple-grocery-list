import { useListsContext } from '@/lib/ListsProvider';
import type { List } from '@/types';

export function useLists(): {
  lists: List[];
  loading: boolean;
  createList: (name: string, color: string | null, icon: string | null) => Promise<{ list: List | null; error: string | null }>;
  updateList: (listId: string, fields: Partial<Pick<List, 'name' | 'color' | 'icon'>>) => Promise<string | null>;
  deleteList: (listId: string) => Promise<string | null>;
} {
  return useListsContext();
}
