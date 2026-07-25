import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import type { PresencePayload } from '@/types';

interface PresenceContextValue {
  // listId -> display names of OTHER household members currently on that list.
  presenceByList: Map<string, string[]>;
  // The list detail screen reports which list this client is viewing.
  setActiveListId: (listId: string | null) => void;
}

const PresenceContext = createContext<PresenceContextValue>({
  presenceByList: new Map(),
  setActiveListId: () => {},
});

// Exactly ONE realtime presence channel per app instance. Screens must never
// subscribe to the household presence topic themselves: `supabase.channel()`
// returns the existing instance for a repeated topic, and adding callbacks to
// an already-subscribed channel throws ("cannot add `presence` callbacks
// after `subscribe()`").
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { householdId } = useHousehold();
  const userId = session?.user.id ?? null;
  const userName = session?.user.email?.split('@')[0] ?? 'User';

  const [presenceByList, setPresenceByList] = useState<Map<string, string[]>>(new Map());
  const [activeListId, setActiveListIdState] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep a ref so AppState and subscribe callbacks always read the latest values
  // without being captured as stale closure variables.
  const payloadRef = useRef<PresencePayload>({ user_id: userId ?? '', user_name: userName, list_id: activeListId });

  useEffect(() => {
    payloadRef.current = { user_id: userId ?? '', user_name: userName, list_id: activeListId };
  });

  useEffect(() => {
    if (!householdId || !userId) return;

    const channel = supabase.channel(`presence:household:${householdId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    function buildPresenceMap(): Map<string, string[]> {
      const state = channel.presenceState<PresencePayload>();
      const next = new Map<string, string[]>();
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          if (p.user_id === userId || !p.list_id) continue;
          const names = next.get(p.list_id) ?? [];
          if (!names.includes(p.user_name)) {
            next.set(p.list_id, [...names, p.user_name]);
          }
        }
      }
      return next;
    }

    channel
      .on('presence', { event: 'sync' }, () => setPresenceByList(buildPresenceMap()))
      .on('presence', { event: 'join' }, () => setPresenceByList(buildPresenceMap()))
      .on('presence', { event: 'leave' }, () => setPresenceByList(buildPresenceMap()))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(payloadRef.current);
        }
      });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const ch = channelRef.current;
      if (!ch) return;
      if (nextState === 'active') {
        void ch.track(payloadRef.current);
      } else {
        void ch.untrack();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      appStateSub.remove();
      channelRef.current = null;
    };
  }, [householdId, userId]);

  // Re-track whenever the active list changes so other members see the update instantly.
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !userId) return;
    void channel.track({ user_id: userId, user_name: userName, list_id: activeListId });
  }, [activeListId, userId, userName]);

  const setActiveListId = useCallback((listId: string | null) => {
    // Deferred: callers invoke this from screen mount effects, and the
    // project convention forbids synchronous setState inside effect bodies.
    queueMicrotask(() => setActiveListIdState(listId));
  }, []);

  return (
    <PresenceContext.Provider value={{ presenceByList, setActiveListId }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext(): PresenceContextValue {
  return useContext(PresenceContext);
}
