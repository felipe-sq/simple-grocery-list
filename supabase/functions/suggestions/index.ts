import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryRow {
  name: string;
  store_id: string;
  store_name: string;
  aisle_id: string;
  aisle_name: string;
  purchased_at: string;
}

interface StapleRow {
  name: string;
  store_id: string | null;
  store_name: string | null;
  aisle_id: string | null;
  aisle_name: string | null;
}

type Category = "might_be_running_low" | "ai_picks";

interface Candidate {
  item_name: string;
  store_id: string;
  store_name: string;
  aisle_id: string;
  aisle_name: string;
  score: number;
  category: Category;
  rules_matched: string[];
  days_since_last_purchase: number | null;
  last_purchased_at: string | null;
}

interface ItemStats {
  totalPurchases: number;
  lastPurchasedAt: string;
  avgIntervalDays: number | null;
  stddevIntervalDays: number | null;
  history: HistoryRow[];
}

interface CoPurchaseData {
  coOccurrenceCount: number;
  tripsWithAnchor: number;
  store_id: string;
  store_name: string;
  aisle_id: string;
  aisle_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeItemStats(history: HistoryRow[]): Map<string, ItemStats> {
  const byName = new Map<string, HistoryRow[]>();
  for (const row of history) {
    const list = byName.get(row.name) ?? [];
    list.push(row);
    byName.set(row.name, list);
  }

  const result = new Map<string, ItemStats>();
  for (const [name, rows] of byName) {
    const sorted = rows
      .slice()
      .sort(
        (a, b) =>
          new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
      );

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(
        (new Date(sorted[i].purchased_at).getTime() -
          new Date(sorted[i - 1].purchased_at).getTime()) /
          86400000
      );
    }

    let avgIntervalDays: number | null = null;
    let stddevIntervalDays: number | null = null;
    if (intervals.length > 0) {
      avgIntervalDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (intervals.length > 1) {
        const variance =
          intervals.reduce((acc, v) => acc + (v - avgIntervalDays!) ** 2, 0) /
          intervals.length;
        stddevIntervalDays = Math.sqrt(variance);
      }
    }

    result.set(name, {
      totalPurchases: sorted.length,
      lastPurchasedAt: sorted[sorted.length - 1].purchased_at,
      avgIntervalDays,
      stddevIntervalDays,
      history: sorted,
    });
  }
  return result;
}

// A "trip" is any distinct (store_id, calendar day) pair in item_history.
function countTrips(history: HistoryRow[]): number {
  const trips = new Set<string>();
  for (const row of history) {
    trips.add(`${row.store_id}:${row.purchased_at.slice(0, 10)}`);
  }
  return trips.size;
}

function computeCoPurchases(
  history: HistoryRow[],
  activeNames: Set<string>
): Map<string, CoPurchaseData> {
  // Group history into trips by (store_id, calendar day)
  const tripItems = new Map<string, HistoryRow[]>();
  for (const row of history) {
    const key = `${row.store_id}:${row.purchased_at.slice(0, 10)}`;
    const list = tripItems.get(key) ?? [];
    list.push(row);
    tripItems.set(key, list);
  }

  const companions = new Map<string, CoPurchaseData>();
  const tripsWithAnchor = new Set<string>();

  for (const [key, items] of tripItems) {
    const hasAnchor = items.some((item) => activeNames.has(item.name));
    if (!hasAnchor) continue;
    tripsWithAnchor.add(key);

    // Count each companion once per trip (deduplicate by name within trip)
    const seenInTrip = new Set<string>();
    for (const item of items) {
      if (activeNames.has(item.name) || seenInTrip.has(item.name)) continue;
      seenInTrip.add(item.name);
      const existing = companions.get(item.name);
      if (existing) {
        existing.coOccurrenceCount += 1;
      } else {
        companions.set(item.name, {
          coOccurrenceCount: 1,
          tripsWithAnchor: 0, // filled after the loop
          store_id: item.store_id,
          store_name: item.store_name,
          aisle_id: item.aisle_id,
          aisle_name: item.aisle_name,
        });
      }
    }
  }

  const totalTripsWithAnchor = tripsWithAnchor.size;
  for (const data of companions.values()) {
    data.tripsWithAnchor = totalTripsWithAnchor;
  }
  return companions;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function respond(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    const householdId = url.searchParams.get("household_id");
    if (!householdId) {
      return respond({ error: "household_id is required" }, 400);
    }

    const force = url.searchParams.get("force") === "true";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify JWT and household membership
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return respond({ error: "Forbidden" }, 403);
    }

    // Serve from cache when fresh (skip when force=true for pull-to-refresh)
    if (!force) {
      const { data: cached } = await supabase
        .from("suggestion_cache")
        .select("suggestions, expires_at")
        .eq("household_id", householdId)
        .single();

      if (cached && new Date(cached.expires_at as string) > new Date()) {
        return respond(cached.suggestions, 200);
      }
    }

    // Fetch store/aisle name maps and rule data in two parallel batches
    const [storesRes, aislesRes] = await Promise.all([
      supabase.from("stores").select("id, name").eq("household_id", householdId),
      supabase.from("aisles").select("id, name").eq("household_id", householdId),
    ]);

    const storeMap = new Map<string, string>(
      ((storesRes.data ?? []) as { id: string; name: string }[]).map((s) => [
        s.id,
        s.name,
      ])
    );
    const aisleMap = new Map<string, string>(
      ((aislesRes.data ?? []) as { id: string; name: string }[]).map((a) => [
        a.id,
        a.name,
      ])
    );

    const [historyRes, activeRes, staplesRes, dismissalsRes] = await Promise.all([
      supabase
        .from("item_history")
        .select("name, store_id, aisle_id, purchased_at")
        .eq("household_id", householdId)
        .order("purchased_at", { ascending: true }),
      supabase
        .from("grocery_items")
        .select("name")
        .eq("household_id", householdId)
        .eq("checked", false),
      supabase
        .from("staple_items")
        .select("name, default_store_id, default_aisle_id")
        .eq("household_id", householdId),
      supabase
        .from("suggestion_dismissals")
        .select("item_name")
        .eq("household_id", householdId)
        .gt("resurface_at", new Date().toISOString()),
    ]);

    if (historyRes.error || activeRes.error || staplesRes.error || dismissalsRes.error) {
      return respond({ error: "Failed to fetch data" }, 500);
    }

    // Normalize
    const history: HistoryRow[] = (
      (historyRes.data ?? []) as {
        name: string;
        store_id: string;
        aisle_id: string;
        purchased_at: string;
      }[]
    ).map((r) => ({
      name: r.name.toLowerCase().trim(),
      store_id: r.store_id,
      store_name: storeMap.get(r.store_id) ?? "",
      aisle_id: r.aisle_id,
      aisle_name: aisleMap.get(r.aisle_id) ?? "",
      purchased_at: r.purchased_at,
    }));

    const activeNames = new Set<string>(
      ((activeRes.data ?? []) as { name: string }[]).map((r) =>
        r.name.toLowerCase().trim()
      )
    );

    const staples: StapleRow[] = (
      (staplesRes.data ?? []) as {
        name: string;
        default_store_id: string | null;
        default_aisle_id: string | null;
      }[]
    ).map((r) => ({
      name: r.name.toLowerCase().trim(),
      store_id: r.default_store_id,
      store_name: r.default_store_id ? (storeMap.get(r.default_store_id) ?? null) : null,
      aisle_id: r.default_aisle_id,
      aisle_name: r.default_aisle_id ? (aisleMap.get(r.default_aisle_id) ?? null) : null,
    }));

    const dismissedNames = new Set<string>(
      ((dismissalsRes.data ?? []) as { item_name: string }[]).map((r) =>
        r.item_name.toLowerCase().trim()
      )
    );

    // ---------------------------------------------------------------------------
    // Run rules
    // ---------------------------------------------------------------------------

    const now = new Date();
    const candidates = new Map<string, Candidate>();
    // Tracks the highest individual rule score per item, used to assign category
    const primaryScores = new Map<string, number>();

    function merge(c: Candidate): void {
      const existing = candidates.get(c.item_name);
      if (existing) {
        const currentPrimary = primaryScores.get(c.item_name) ?? 0;
        if (c.score > currentPrimary) {
          existing.category = c.category;
          primaryScores.set(c.item_name, c.score);
        }
        existing.score += c.score;
        for (const rule of c.rules_matched) {
          if (!existing.rules_matched.includes(rule)) {
            existing.rules_matched.push(rule);
          }
        }
      } else {
        candidates.set(c.item_name, { ...c, rules_matched: [...c.rules_matched] });
        primaryScores.set(c.item_name, c.score);
      }
    }

    const itemStats = computeItemStats(history);

    // --- Rule 1: Overdue Staple ---
    // Category: might_be_running_low | Base: 80
    for (const staple of staples) {
      if (activeNames.has(staple.name)) continue;
      if (!staple.store_id || !staple.aisle_id) continue;

      const stats = itemStats.get(staple.name);
      const lastPurchasedAt = stats?.lastPurchasedAt ?? null;
      const daysSince =
        lastPurchasedAt !== null
          ? (now.getTime() - new Date(lastPurchasedAt).getTime()) / 86400000
          : null;

      // Trigger: no purchase in last 14 days OR never purchased
      if (lastPurchasedAt !== null && daysSince !== null && daysSince <= 14) continue;

      let score = 80;
      const avg = stats?.avgIntervalDays ?? null;

      if (!stats) {
        score += 10; // never purchased
      } else if (avg !== null && daysSince !== null) {
        if (daysSince > avg * 2) score += 10;
        else if (daysSince < avg * 0.75) score -= 20;
      }

      merge({
        item_name: staple.name,
        store_id: staple.store_id,
        store_name: staple.store_name ?? "",
        aisle_id: staple.aisle_id,
        aisle_name: staple.aisle_name ?? "",
        score,
        category: "might_be_running_low",
        rules_matched: ["overdue_staple"],
        days_since_last_purchase: daysSince !== null ? Math.floor(daysSince) : null,
        last_purchased_at: lastPurchasedAt,
      });
    }

    // --- Rule 2: Frequency + Recency Decay ---
    // Category: might_be_running_low | Base: 60
    const cutoff180 = new Date(now.getTime() - 180 * 86400000);
    for (const [name, stats] of itemStats) {
      if (activeNames.has(name)) continue;

      const count180 = stats.history.filter(
        (h) => new Date(h.purchased_at) >= cutoff180
      ).length;
      if (count180 < 3) continue;

      const daysSince =
        (now.getTime() - new Date(stats.lastPurchasedAt).getTime()) / 86400000;
      if (daysSince <= 7) continue;

      const frequencyScore = Math.min(30, (count180 / 180) * 100);
      const recencyDecay = Math.min(30, (daysSince - 7) * 1.5);
      const score = 60 + frequencyScore + recencyDecay;

      const mostRecent = stats.history[stats.history.length - 1];
      merge({
        item_name: name,
        store_id: mostRecent.store_id,
        store_name: mostRecent.store_name,
        aisle_id: mostRecent.aisle_id,
        aisle_name: mostRecent.aisle_name,
        score,
        category: "might_be_running_low",
        rules_matched: ["frequency_recency"],
        days_since_last_purchase: Math.floor(daysSince),
        last_purchased_at: stats.lastPurchasedAt,
      });
    }

    // --- Rule 3: Co-purchase Association ---
    // Category: ai_picks | Base: 50
    if (countTrips(history) >= 10 && activeNames.size > 0) {
      const coPurchases = computeCoPurchases(history, activeNames);
      for (const [name, data] of coPurchases) {
        if (activeNames.has(name)) continue;
        const score = 50 + (data.coOccurrenceCount / data.tripsWithAnchor) * 40;
        merge({
          item_name: name,
          store_id: data.store_id,
          store_name: data.store_name,
          aisle_id: data.aisle_id,
          aisle_name: data.aisle_name,
          score,
          category: "ai_picks",
          rules_matched: ["co_purchase"],
          days_since_last_purchase: null,
          last_purchased_at: null,
        });
      }
    }

    // --- Rule 4: Periodic Pattern ---
    // Category: might_be_running_low | Base: 70
    for (const [name, stats] of itemStats) {
      if (activeNames.has(name)) continue;
      if (stats.totalPurchases < 4) continue;
      if (stats.avgIntervalDays === null || stats.stddevIntervalDays === null) continue;
      if (stats.stddevIntervalDays >= 5) continue;

      const daysSince =
        (now.getTime() - new Date(stats.lastPurchasedAt).getTime()) / 86400000;
      const avg = stats.avgIntervalDays;

      // Trigger: days since >= avg_interval - 3
      if (daysSince < avg - 3) continue;

      let score = 70;
      if (daysSince >= avg) score += 20;
      if (daysSince >= avg + 3) score += 10;

      const mostRecent = stats.history[stats.history.length - 1];
      merge({
        item_name: name,
        store_id: mostRecent.store_id,
        store_name: mostRecent.store_name,
        aisle_id: mostRecent.aisle_id,
        aisle_name: mostRecent.aisle_name,
        score,
        category: "might_be_running_low",
        rules_matched: ["periodic_pattern"],
        days_since_last_purchase: Math.floor(daysSince),
        last_purchased_at: stats.lastPurchasedAt,
      });
    }

    // ---------------------------------------------------------------------------
    // Post-processing: filter → sort → cap → write
    // ---------------------------------------------------------------------------

    const lowResults: Candidate[] = [];
    const aiResults: Candidate[] = [];

    const filtered = Array.from(candidates.values())
      .filter((c) => !activeNames.has(c.item_name))
      .filter((c) => !dismissedNames.has(c.item_name))
      .filter((c) => c.score >= 40)
      .sort((a, b) => b.score - a.score);

    for (const c of filtered) {
      if (c.category === "might_be_running_low" && lowResults.length < 10) {
        lowResults.push(c);
      } else if (c.category === "ai_picks" && aiResults.length < 10) {
        aiResults.push(c);
      }
    }

    const results = [...lowResults, ...aiResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // Upsert into suggestion_cache
    await supabase.from("suggestion_cache").upsert(
      {
        household_id: householdId,
        generated_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 6 * 3600000).toISOString(),
        suggestions: results,
      },
      { onConflict: "household_id" }
    );

    return respond(results, 200);
  } catch (err) {
    return respond({ error: String(err) }, 500);
  }
});
