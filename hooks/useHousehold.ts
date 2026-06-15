import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useHousehold(): { householdId: string | null; loading: boolean } {
  const { session, loading: authLoading } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      // Defer state reset to avoid synchronous setState in effect body.
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

    const userId = session.user.id;
    let cancelled = false;

    async function fetchHousehold() {
      const { data } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { household_id: string } | null;
      setHouseholdId(row?.household_id ?? null);
      setLoading(false);
    }

    fetchHousehold();

    // Listen for membership changes so the root layout reacts immediately
    // after the user creates or joins a household.
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
      channel.unsubscribe();
    };
  }, [session, authLoading]);

  return { householdId, loading };
}
