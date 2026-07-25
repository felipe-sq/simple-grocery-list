import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { HouseholdMember } from '@/types';

export function useHouseholdMembers(householdId: string | null): {
  members: HouseholdMember[];
  loading: boolean;
} {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setMembers([]);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }

    let cancelled = false;

    async function fetchMembers() {
      const { data } = await supabase
        .from('household_members')
        .select('user_id, joined_at, profile:profiles(name)')
        .eq('household_id', householdId)
        .order('joined_at');
      if (cancelled) return;
      const rows = (data as { user_id: string; joined_at: string; profile: { name: string } | { name: string }[] | null }[] | null) ?? [];
      setMembers(
        rows.map((r) => {
          const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile;
          return { user_id: r.user_id, joined_at: r.joined_at, name: profile?.name ?? 'Member' };
        }),
      );
      setLoading(false);
    }

    fetchMembers();

    const channel = supabase
      .channel(`household_members_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`,
        },
        () => fetchMembers(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  return { members, loading };
}
