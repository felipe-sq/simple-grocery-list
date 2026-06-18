import { useCallback, useEffect, useRef, useState } from 'react';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { enqueue } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';
import type { Suggestion } from '@/types';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function useSuggestions(householdId: string | null): {
  mightBeLow: Suggestion[];
  aiPicks: Suggestion[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  dismiss: (suggestion: Suggestion) => Promise<void>;
  addToList: (suggestion: Suggestion) => Promise<{ error: string | null }>;
  activeItemNames: Set<string>;
} {
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[]>([]);
  const [activeItemNames, setActiveItemNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const householdIdRef = useRef(householdId);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    householdIdRef.current = householdId;
  }, [householdId]);

  const fetchActiveItemNames = useCallback(async (hId: string): Promise<void> => {
    const { data } = await supabase
      .from('grocery_items')
      .select('name')
      .eq('household_id', hId)
      .eq('checked', false);
    const names = new Set<string>(
      ((data ?? []) as { name: string }[]).map((r) => r.name.toLowerCase().trim()),
    );
    setActiveItemNames(names);
  }, []);

  const inviteEdgeFunction = useCallback(async (hId: string, force: boolean): Promise<Suggestion[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const qs = `household_id=${hId}${force ? '&force=true' : ''}`;

    try {
      const res = await fetch(`${base}/functions/v1/suggestions?${qs}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
      });
      if (!res.ok) return [];
      return (await res.json()) as Suggestion[];
    } catch {
      return [];
    }
  }, []);

  const loadSuggestions = useCallback(async (hId: string, force: boolean): Promise<void> => {
    if (!force) {
      const { data: cached } = await supabase
        .from('suggestion_cache')
        .select('suggestions, expires_at')
        .eq('household_id', hId)
        .maybeSingle();

      const row = cached as { suggestions: Suggestion[]; expires_at: string } | null;
      if (row && new Date(row.expires_at) > new Date()) {
        setAllSuggestions(row.suggestions ?? []);
        return;
      }
    }

    const results = await inviteEdgeFunction(hId, force);

    if (results.length === 0 && !force) {
      // Edge function returned empty or errored — try serving stale cache
      const { data: stale } = await supabase
        .from('suggestion_cache')
        .select('suggestions')
        .eq('household_id', hId)
        .maybeSingle();
      const staleRow = stale as { suggestions: Suggestion[] } | null;
      setAllSuggestions(staleRow?.suggestions ?? []);
    } else {
      setAllSuggestions(results);
    }
  }, [inviteEdgeFunction]);

  useEffect(() => {
    if (!householdId) {
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setAllSuggestions([]);
          setActiveItemNames(new Set());
          setLoading(false);
        }
      });
      return () => { active = false; };
    }

    let cancelled = false;

    async function init() {
      setLoading(true);
      await Promise.all([
        loadSuggestions(householdId!, false),
        fetchActiveItemNames(householdId!),
      ]);
      if (!cancelled) setLoading(false);
    }

    init();

    return () => { cancelled = true; };
  }, [householdId, loadSuggestions, fetchActiveItemNames]);

  const refresh = useCallback(async (): Promise<void> => {
    const hId = householdIdRef.current;
    if (!hId) return;
    setRefreshing(true);
    await Promise.all([
      loadSuggestions(hId, true),
      fetchActiveItemNames(hId),
    ]);
    setRefreshing(false);
  }, [loadSuggestions, fetchActiveItemNames]);

  const dismiss = useCallback(async (suggestion: Suggestion): Promise<void> => {
    const hId = householdIdRef.current;
    if (!hId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Optimistic removal
    setAllSuggestions((prev) => prev.filter((s) => s.item_name !== suggestion.item_name));

    const now = new Date();
    const dismissal = {
      household_id: hId,
      item_name: suggestion.item_name.toLowerCase().trim(),
      dismissed_at: now.toISOString(),
      resurface_at: new Date(now.getTime() + 7 * 24 * 3600000).toISOString(),
      dismissed_by: session.user.id,
    };

    if (!isOnline) {
      await enqueue({ type: 'dismiss_suggestion', householdId: hId, dismissal });
      return;
    }

    await supabase.from('suggestion_dismissals').insert(dismissal);
  }, [isOnline]);

  const addToList = useCallback(async (suggestion: Suggestion): Promise<{ error: string | null }> => {
    const hId = householdIdRef.current;
    if (!hId) return { error: 'Not authenticated' };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not authenticated' };

    const userId = session.user.id;

    const { data: topItem } = await supabase
      .from('grocery_items')
      .select('sort_order')
      .eq('aisle_id', suggestion.aisle_id)
      .eq('household_id', hId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sortOrder = topItem ? (topItem as { sort_order: number }).sort_order + 10 : 0;
    const now = new Date().toISOString();

    const { error: insertError } = await supabase.from('grocery_items').insert({
      id: generateId(),
      household_id: hId,
      store_id: suggestion.store_id,
      aisle_id: suggestion.aisle_id,
      name: suggestion.item_name,
      quantity: null,
      unit: null,
      notes: null,
      sort_order: sortOrder,
      source: 'suggestion',
      created_by: userId,
      created_at: now,
    });

    if (insertError) return { error: insertError.message };

    setActiveItemNames((prev) => new Set([...prev, suggestion.item_name.toLowerCase().trim()]));

    // Write to item_history following the add-item flow pattern
    await supabase.from('item_history').insert({
      household_id: hId,
      name: suggestion.item_name.toLowerCase().trim(),
      store_id: suggestion.store_id,
      aisle_id: suggestion.aisle_id,
      added_by: userId,
      purchased_at: now,
    });

    return { error: null };
  }, []);

  const mightBeLow = allSuggestions.filter((s) => s.category === 'might_be_running_low');
  const aiPicks = allSuggestions.filter((s) => s.category === 'ai_picks');

  return { mightBeLow, aiPicks, loading, refreshing, refresh, dismiss, addToList, activeItemNames };
}
