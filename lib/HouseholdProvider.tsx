import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface HouseholdContextValue {
  householdId: string | null;
  loading: boolean;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  householdId: null,
  loading: true,
});

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setHouseholdId(null);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }
    let cancelled = false;

    async function fetchHousehold() {
      const { data: rows, error } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .order('joined_at')
        .limit(1);
      if (error) {
        console.error('[HouseholdProvider] household_members query failed:', error.code, error.message);
      }
      if (cancelled) return;
      const firstRow = (rows as { household_id: string }[] | null)?.[0] ?? null;
      setHouseholdId(firstRow?.household_id ?? null);
      setLoading(false);
    }

    fetchHousehold();

    const channel = supabase
      .channel(`household_member_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchHousehold(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, authLoading]);

  return (
    <HouseholdContext.Provider value={{ householdId, loading }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHouseholdContext(): HouseholdContextValue {
  return useContext(HouseholdContext);
}
