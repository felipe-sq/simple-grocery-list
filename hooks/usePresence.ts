import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { PresencePayload } from '@/types';

// Returns a map of storeId -> display names of OTHER household members present there.
export function usePresence(
  householdId: string | null,
  userId: string | null,
  userName: string,
  activeStoreId: string | null,
): Map<string, string[]> {
  const [presenceByStore, setPresenceByStore] = useState<Map<string, string[]>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Keep a ref so AppState and subscribe callbacks always read the latest values
  // without being captured as stale closure variables.
  const payloadRef = useRef<PresencePayload>({ user_id: userId ?? '', user_name: userName, store_id: activeStoreId });

  useEffect(() => {
    payloadRef.current = { user_id: userId ?? '', user_name: userName, store_id: activeStoreId };
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
          if (p.user_id === userId || !p.store_id) continue;
          const list = next.get(p.store_id) ?? [];
          if (!list.includes(p.user_name)) {
            next.set(p.store_id, [...list, p.user_name]);
          }
        }
      }
      return next;
    }

    channel
      .on('presence', { event: 'sync' }, () => setPresenceByStore(buildPresenceMap()))
      .on('presence', { event: 'join' }, () => setPresenceByStore(buildPresenceMap()))
      .on('presence', { event: 'leave' }, () => setPresenceByStore(buildPresenceMap()))
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
      channel.unsubscribe();
      appStateSub.remove();
      channelRef.current = null;
    };
  }, [householdId, userId]);

  // Re-track whenever the active store changes so other members see the update instantly.
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !userId) return;
    void channel.track({ user_id: userId, user_name: userName, store_id: activeStoreId });
  }, [activeStoreId, userId, userName]);

  return presenceByStore;
}
