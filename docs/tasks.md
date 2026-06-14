# Task Breakdown — Household Grocery List App
**Version:** 1.0
**Date:** June 14, 2026
**Related:** grocery-app-prd.md v0.3 · grocery-app-ux-flows.md v1.0
**Build environment:** Claude Code

---

## How to Use This Document

Tickets are grouped into **milestones** — each milestone is a shippable increment you can test end-to-end before moving on. Within each milestone, tickets are ordered by dependency. Hand each ticket to Claude Code as a focused session; include the ticket ID and paste the relevant UX flow / edge cases from the flows doc when context is needed.

**Stack reminder (reference for Claude Code prompts):**
- Expo (React Native + Web), TypeScript
- Supabase: Postgres + Realtime + Auth + Edge Functions + RLS
- Open Food Facts API (barcode lookup)
- Vercel (web hosting), Expo EAS (iOS build)

**Ticket format:**
- **Goal** — what done looks like
- **Scope** — what to build; what to explicitly exclude
- **Key details** — stack-specific notes, schema refs, edge cases to implement
- **Depends on** — blocking tickets

---

## Milestone 0 — Project Scaffolding
*Goal: A running app shell with routing, auth, and database connected. Nothing user-facing yet.*

---

### T-001 · Initialize Expo project with TypeScript
**Size:** Small

**Goal:** Repo exists, runs on iOS simulator and web browser, TypeScript strict mode enabled.

**Scope:**
- `npx create-expo-app` with TypeScript template
- Configure Expo Router (file-based routing) — this is the Expo equivalent of Next.js App Router; use `app/` directory structure
- Set up ESLint + Prettier
- Confirm `expo start --web` and `expo start --ios` both boot without errors

**Exclude:** Any UI, auth, or data. Shell only.

---

### T-002 · Initialize Supabase project and connect to app
**Size:** Small

**Goal:** Supabase project created; app can make an authenticated query to Supabase from both iOS and web.

**Scope:**
- Create Supabase project (via supabase.com dashboard)
- Install `@supabase/supabase-js`
- Create `lib/supabase.ts` client singleton using `AsyncStorage` for session persistence on native, `localStorage` on web — Expo requires this split; use `@supabase/ssr` pattern or `ExpoSecureStore` adapter
- Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env` / `app.config.ts`
- Smoke test: fetch from a test table and log response

**Key detail:** Supabase JS v2 requires a custom storage adapter for React Native. Claude Code should use the official Expo + Supabase guide pattern (`supabase-js` with `AsyncStorage`).

---

### T-003 · Database schema — initial migration
**Size:** Medium

**Goal:** All core tables exist in Supabase with correct types, foreign keys, and indexes.

**Scope:** Create a single SQL migration file covering:
- `users` (managed by Supabase Auth — extend with `profiles` table)
- `households`
- `household_members`
- `stores`
- `aisles`
- `grocery_items`
- `staple_items`
- `item_history`
- `household_invites`
- `suggestion_cache`
- `suggestion_dismissals`

Full schema in PRD §5 and §12.2. Key points:
- `grocery_items.source` is an enum: `manual | staples | suggestion | barcode | voice`
- All tables except `users`/`profiles` include `household_id UUID FK → households`
- Add indexes on `household_id` + `purchased_at` on `item_history` (used heavily by rules engine)
- Add index on `household_invites.token`

**Exclude:** RLS policies (T-004), Edge Functions (later milestones).

---

### T-004 · Row-Level Security policies
**Size:** Medium

**Goal:** All tables are locked down so users can only read/write rows belonging to their household.

**Scope:** Write RLS policies for every table:
- `households`: member can read their own household
- `household_members`: readable by members of the household
- `stores`, `aisles`, `grocery_items`, `staple_items`, `item_history`, `suggestion_cache`, `suggestion_dismissals`: all scoped to `household_id` — member must be in `household_members` for that `household_id`
- `household_invites`: creator can read/delete; anyone with the token can read (for join flow); write scoped to household members

**Key detail:** RLS in Supabase uses `auth.uid()` — the pattern is:
```sql
CREATE POLICY "household members only" ON grocery_items
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```
Apply this pattern consistently across all tables.

**Depends on:** T-003

---

### T-005 · Auth flow — sign up, sign in, session persistence
**Size:** Medium

**Goal:** User can create an account and sign back in; session persists across app restarts.

**Scope:**
- Sign-up screen: email + password (magic link is a v2 enhancement)
- Sign-in screen: email + password
- On successful auth, create a `profiles` row for the user if one doesn't exist
- Session persists via the storage adapter from T-002
- Auth state drives routing: unauthenticated → auth screens; authenticated → main app
- Use Expo Router's `(auth)` route group for auth screens and `(app)` for the main app

**Exclude:** Household creation/joining (T-006), Google OAuth (v2).

**Depends on:** T-001, T-002

---

### T-006 · Household creation and invite flow
**Size:** Medium

**Goal:** A new user can create a household or join one via invite link. After completing either path, they land in the main app shell.

**Scope:**
- **Post-auth gate:** if user has no `household_members` row, show "Create or Join" screen before main app
- **Create household:** text field for household name → creates `households` row + `household_members` row for creator
- **Join via invite:** user pastes an invite link or token → app validates token against `household_invites` (not expired, not used) → creates `household_members` row → marks invite as used
- **Generate invite link:** inside the app (Settings → Household), any member can generate a new invite link. Creates a `household_invites` row, generates a deep link URL (e.g., `yourapp://join?token=abc123`), copies to clipboard. Token is single-use, 48hr expiry.
- Handle expired and already-used token errors with clear messages

**Key detail:** Deep links in Expo require configuring `scheme` in `app.config.ts` and using `expo-linking`. Test on both iOS simulator and web.

**Depends on:** T-003, T-004, T-005

---

## Milestone 1 — Core List (Read & Write)
*Goal: Users can configure stores/aisles, add items by typing, and see a live-synced list. The essential loop works.*

---

### T-007 · Store and aisle configuration screen
**Size:** Medium

**Goal:** User can create up to 3 stores, add/rename/reorder up to 10 aisles per store, accessible from Settings.

**Scope:**
- Settings screen at `app/(app)/settings/stores.tsx`
- List stores; each store shows its aisles with drag-to-reorder (use `react-native-reanimated` + `react-native-draggable-flatlist` — both are Expo-compatible)
- Inline rename for store and aisle names (tap to edit in place)
- "+ Add aisle" inline text field; disappears on save
- "+ Add a store" hidden when 3 stores exist (EC8-7)
- Aisle count badge; "+ Add aisle" hidden at 10 (EC8-3)
- Store deletion deferred (EC8-5): show disabled state with note
- All changes write to `stores` / `aisles` tables and sync via Realtime

**Edge cases to implement:** EC8-1 (duplicate aisle name block), EC8-3 (aisle limit), EC8-4 (rename store), EC8-7 (store limit)

**Depends on:** T-003, T-004, T-006

---

### T-008 · Main tab bar and store tab shell
**Size:** Small

**Goal:** Main app renders a tab bar with one tab per configured store + Suggestions + Staples tabs. Tabs are dynamic based on `stores` table.

**Scope:**
- Tab bar at bottom of screen with store tabs (dynamic, from DB) + Suggestions + Staples
- Each store tab is a screen at `app/(app)/store/[storeId].tsx`
- Tabs render store name; if no stores exist, show prompt to configure stores first
- No list content yet — placeholder "coming soon" content is fine
- Realtime subscription on `stores` table so tabs update if a store is added/renamed

**Key detail:** Expo Router's dynamic tabs require using a `_layout.tsx` that maps store data to tab definitions. This is non-trivial — Claude Code should use the Expo Router docs pattern for dynamic tab routes, not static `(tabs)` config.

**Depends on:** T-006, T-007

---

### T-009 · Grocery item list view (read)
**Size:** Medium

**Goal:** Each store tab renders its grocery items grouped by aisle, with checked items struck through and faded at the bottom of each aisle section.

**Scope:**
- Query `grocery_items` filtered by `store_id` and `household_id`, ordered by `aisle.sort_order` then `item.sort_order`
- Group items by aisle; render aisle as a collapsible section header
- Aisle header shows name + "X of Y ✓" count
- Unchecked items render normally; checked items render with strikethrough + reduced opacity, sorted to bottom of their aisle section
- Auto-collapse aisle when all items are checked (EC4-4)
- "Everything's in the cart 🛒" state when all items across all aisles are checked (EC4-5)
- Empty state when no items exist (EC5-6 wireframe)
- Realtime subscription on `grocery_items` for this store — incoming changes animate in (EC4-2)

**Exclude:** Checking off items (T-010), adding items (T-011).

**Depends on:** T-007, T-008

---

### T-010 · Check off and uncheck items
**Size:** Small

**Goal:** Tapping an item's circle checks or unchecks it; change syncs in real time across all devices.

**Scope:**
- Tap circle → toggle `checked` boolean + set/clear `checked_at` and `checked_by` on `grocery_items`
- Optimistic update: UI reflects change immediately before DB confirms
- Checked item animates to bottom of aisle section with strikethrough + fade
- Uncheck reverses animation, restores item to original `sort_order` position
- Realtime: other devices receive update via existing subscription from T-009

**Edge cases to implement:** EC4-1 (uncheck reverses), EC4-3 (simultaneous check — last-write-wins, no conflict UI needed), EC4-7 (offline — optimistic local, sync on reconnect)

**Depends on:** T-009

---

### T-011 · Add item sheet — typing + inline suggestions
**Size:** Large

**Goal:** User can add a grocery item by typing; suggestions from item history appear as they type; duplicate items are hard-blocked.

**Scope:**
- Bottom sheet (use `@gorhom/bottom-sheet` — Expo compatible) triggered by `+` button in store tab header
- Fields: Name, Store (pre-filled from current tab), Aisle picker, Qty, Unit, Notes
- Inline suggestions: query `item_history` on name prefix (debounced, 200ms), ranked by frequency + recency; display as dropdown below name field; tap to auto-fill name + store + aisle
- [Add Item] button disabled until name + aisle are filled
- On submit: write to `grocery_items`, write to (or update) `item_history`
- Duplicate check (EC1-3): before saving, query for existing unchecked item with same name (case-insensitive) in same store → block save with inline error if found
- Aisle picker includes "+ New aisle" option (EC1-2): tapping opens inline text field, saves new aisle, returns to sheet with new aisle selected
- Discard confirmation on sheet dismiss with partial content (EC1-7)

**Edge cases to implement:** EC1-2, EC1-3 (hard block), EC1-4, EC1-5, EC1-6 (offline), EC1-7

**Depends on:** T-009, T-010

---

### T-012 · Long-press context menu on item
**Size:** Small

**Goal:** Long-pressing an item shows options to edit, move to a different aisle, or delete it.

**Scope:**
- Long-press → context menu with: [Edit item] [Move to different aisle] [Delete from list]
- Edit: opens same sheet as T-011 pre-filled with item data
- Move to aisle: aisle picker modal (aisles for the same store only); updates `aisle_id` + `sort_order`
- Delete: single inline confirmation (no modal) → removes from `grocery_items`; does not write to `item_history`

**Depends on:** T-011

---

### T-013 · End Trip flow
**Size:** Medium

**Goal:** Each store tab has an End Trip button that clears checked items for that store only, after confirmation.

**Scope:**
- [End Trip] button pinned to bottom of store tab, above tab bar
- Button hidden if no items exist (EC5-2); disabled with message if no checked items (EC5-1)
- Tap → modal listing checked items to be cleared + unchecked items that will remain (wireframe in Flow 5)
- Confirm → delete all checked `grocery_items` for this store; write each to `item_history` with `purchased_at = NOW()`
- Dismiss modal → no changes
- Handle race condition: if another member triggers End Trip simultaneously, show notice and auto-dismiss (EC5-4)
- Offline: apply locally, queue `item_history` writes, sync on reconnect (EC5-7)

**Edge cases to implement:** EC5-1, EC5-2, EC5-3, EC5-4, EC5-6 (empty state post-trip), EC5-7

**Depends on:** T-010, T-011

---

## Milestone 2 — Staples & Suggestions
*Goal: Staples list is fully functional; Suggestions tab shows rules-based recommendations.*

---

### T-014 · Staples list — read view
**Size:** Small

**Goal:** Staples tab renders all staple items grouped by their default store, with search.

**Scope:**
- Query `staple_items` for household, grouped by `default_store_id`
- Collapsible sections per store (same pattern as T-009)
- Each row shows: name, default aisle, default qty/unit
- [Search 🔍] button opens inline search bar; filters rows client-side by name
- Empty state (EC6-5 wireframe)
- Realtime subscription on `staple_items`

**Depends on:** T-008

---

### T-015 · Staples list — add and edit a staple
**Size:** Medium

**Goal:** Users can add new staples and edit or delete existing ones.

**Scope:**
- [+ Add] button → Add Staple sheet (Flow 7 wireframe)
- Fields: Name (with same history suggestions as T-011), Default Store, Default Aisle, Default Qty, Default Unit
- Name is required; store/aisle are optional (EC7-3)
- Duplicate staple name warning (EC7-4): warn but allow save (duplicates permitted for same item at different stores)
- Tap existing staple row → Edit sheet, pre-filled; shows [🗑 Delete] at bottom
- Delete: inline confirm (EC7-1), no modal; removing staple does not affect previously copied grocery items (EC7-5)
- Save blocked if name is empty (EC7-2)

**Edge cases to implement:** EC7-1 through EC7-5

**Depends on:** T-014

---

### T-016 · Copy staples to active list
**Size:** Medium

**Goal:** User can select one or more staples and copy them to an active store list, with duplicates hard-blocked.

**Scope:**
- [Select] button on Staples tab → enters selection mode (Flow 6 wireframe)
- Checkboxes on all rows; header shows count + [Add to List ▾] + [✕ Cancel]
- [Add to List ▾] dropdown: list of stores + "Each item's default"
- On confirm: copy selected staples to `grocery_items` for target store
- Before copying: check for duplicates against unchecked items in target store (case-insensitive). Duplicates are deselected + labeled "Already on list" in the UI; cannot be re-selected (EC6-2 hard block)
- If user picks "Each item's default": items with no default store are flagged and skipped with a notice
- If target aisle doesn't exist in target store: prompt user to pick an existing aisle or create one (EC6-1)
- Toast on success: "X items added to [Store]"
- Long-press in selection mode → "Select all in [Store]" / "Select all" (EC6-4)

**Edge cases to implement:** EC6-1, EC6-2 (hard block), EC6-3, EC6-4, EC6-5

**Depends on:** T-014, T-015

---

### T-017 · Rules engine — Supabase Edge Function
**Size:** Large

**Goal:** A Supabase Edge Function runs the 4-rule suggestions engine and writes results to `suggestion_cache`.

**Scope:** Implement `supabase/functions/suggestions/index.ts`:

**Rule 1 — Overdue Staple**
- Items in `staple_items` not in active `grocery_items` (unchecked) for this household
- No `item_history` record in last N days (default 14) OR never purchased
- Score: base 80 + modifiers (see PRD §12.3)
- Category: `might_be_running_low`

**Rule 2 — Frequency + Recency Decay**
- Items in `item_history` with ≥ 3 purchases in last 180 days
- Not in active unchecked `grocery_items`
- Days since last purchase > 7
- Score: base 60 + frequency score + recency decay (see PRD §12.3)
- Category: `might_be_running_low`

**Rule 3 — Co-purchase Association**
- Requires ≥ 10 completed trips in `item_history`
- For each unchecked active item, find items bought in same trip window (same store, within 2 hours)
- Score by co-occurrence frequency (see PRD §12.3)
- Category: `ai_picks`

**Rule 4 — Periodic Pattern**
- Items with ≥ 4 purchases AND std_dev of purchase intervals < 5 days
- Score: base 70 + modifiers (see PRD §12.3)
- Category: `might_be_running_low`

**Post-processing:**
- Merge candidates from all rules (sum scores for same item)
- Filter: remove active list items, dismissed items (`suggestion_dismissals` where `resurface_at > NOW()`), items with score < 40
- Sort by score desc; cap at 20 total (10 per category)
- Write to `suggestion_cache` as JSONB (schema in PRD §12.4)

**Key detail:** Supabase Edge Functions run Deno, not Node. Use Deno-compatible imports. All DB queries use the Supabase service role key (passed via env var, never exposed to client). Run with `supabase functions serve` locally for testing.

**Exclude:** Calling the function from the client (T-018).

**Depends on:** T-003, T-004, T-013 (needs real `item_history` data to test meaningfully)

---

### T-018 · Suggestions tab — UI
**Size:** Medium

**Goal:** Suggestions tab displays cached results from the rules engine, with add and dismiss actions.

**Scope:**
- On tab open: check `suggestion_cache` for this household — if fresh (< 6 hours), render from cache; if stale or missing, call Edge Function, then render
- Loading state while function runs
- Two sections: "Might be running low" and "AI picks for you" (only render section if it has items)
- Each card: item name, store name, aisle name, last purchased date (or "Never purchased")
- [+ Add] on card → copies item directly to its store's active list (same duplicate check as T-011 EC1-3; if duplicate, card shows "Already on list" and [+ Add] is disabled)
- [✕] on card → writes to `suggestion_dismissals` with `resurface_at = NOW() + 7 days`; card animates out
- Pull-to-refresh invalidates cache and re-invokes Edge Function
- Graceful empty state when not enough history yet (PRD §12.5): *"Add more items and complete a few trips — suggestions will improve over time."*

**Depends on:** T-017, T-011 (for duplicate check logic, can share a hook)

---

## Milestone 3 — Voice & Barcode Input
*Goal: Items can be added by voice and barcode scan on both iOS and web.*

---

### T-019 · Barcode scanner
**Size:** Medium

**Goal:** User can scan a barcode to pre-fill the Add Item sheet with a product name.

**Scope:**
- Install `expo-camera` and `expo-barcode-scanner`
- 📷 button in store tab header and inside Add Item sheet (Flow 3)
- Full-screen scanner overlay with targeting box
- On scan: call Open Food Facts API `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- On success: extract `product_name` or `product_name_en`; open Add Item sheet pre-filled
- Check `item_history` for prior scan of same barcode first — use cached name without API call (EC3-2)
- On API miss: open sheet with empty name + notice "Product not found. Enter a name manually." (EC3-1)
- Store barcode on `grocery_items` and `item_history` records
- Manual barcode entry text field as fallback below camera view
- Web: `expo-camera` works in browser via WebRTC — test permission prompt on Chrome (EC3-4)
- Handle offline: if barcode not in local history, show EC3-5 message

**Edge cases to implement:** EC3-1 through EC3-7

**Depends on:** T-011

---

### T-020 · Voice input
**Size:** Large

**Goal:** User can dictate one or more grocery items; each is parsed and shown for review before adding.

**Scope:**
- 🎤 button in store tab header
- iOS: use `expo-speech-recognition` (wraps `SFSpeechRecognizer`)
- Web: use `window.SpeechRecognition` / `webkitSpeechRecognition` via a web-only module
- Listening overlay (Flow 2 wireframe): live transcription shown as user speaks
- On silence / Done tap: parse transcription into items

**Parsing logic (implement client-side):**
- Split on conjunctions: "and", comma, "also"
- Extract quantity: leading number words ("two", "three") or digits
- Extract unit: known unit list (lbs, cans, gallons, bunches, boxes, bags, cartons, oz, packs)
- Remainder = item name
- Example: "two cans of black beans" → `{ name: "black beans", qty: 2, unit: "cans" }`

- Review screen (Flow 2 wireframe): one card per parsed item; [Edit ✎] opens inline fields; checkbox to include/exclude each item (EC2-7)
- Auto-fill store (from current tab) and aisle (from `item_history` if name matches)
- Aisle unknown → flagged in amber, [Add All] blocked until resolved (EC2-1)
- [Add All / Add Selected (N)] → same write path as T-011; same duplicate check (hard block per item)
- Duplicate parsed items in same utterance: merge and combine qty (EC2-4)
- Microphone permission denied: prompt with [Open Settings] (EC2-6)
- No speech detected: retry / type instead (EC2-2)

**Key detail:** Speech recognition APIs differ significantly between iOS native and web. Use a platform-specific file pattern: `speech.ios.ts` and `speech.web.ts` with a shared interface. Claude Code should implement this abstraction before building the UI layer on top.

**Edge cases to implement:** EC2-1 through EC2-7

**Depends on:** T-011

---

## Milestone 4 — Presence, Polish & Offline
*Goal: Real-time presence, offline resilience, and UI polish are production-ready.*

---

### T-021 · Real-time presence indicator
**Size:** Small

**Goal:** A subtle indicator shows when another household member is actively shopping at a store.

**Scope:**
- Use Supabase Realtime Presence channel (one channel per household)
- When a user opens a store tab, broadcast `{ user_id, user_name, store_id }` to the presence channel
- On tab change or app background, remove presence
- Other household members see a small avatar or label on the active store tab: e.g., "Sarah is here"
- Max 3–4 users so no overflow handling needed

**Key detail:** Supabase Presence uses `channel.track()` and `channel.on('presence', ...)`. It is separate from the Realtime DB subscriptions already set up in T-009. One presence channel per household is sufficient.

**Depends on:** T-008, T-009

---

### T-022 · Offline queue and sync indicator
**Size:** Medium

**Goal:** All mutations work offline; unsynced changes are clearly indicated; sync happens automatically on reconnect.

**Scope:**
- Use `MMKV` (React Native) / `IndexedDB` via `idb` (web) as the offline queue store — abstract behind a single `offlineQueue` module with `enqueue` / `flush` interface
- Queue: add item, check/uncheck, delete item, end trip, add staple, dismiss suggestion
- On reconnect (monitor with `@react-native-community/netinfo`): flush queue in FIFO order
- Per-item ⚠ icon on rows with unsynced local changes
- Store tab header shows "Offline" badge when network is unavailable
- If a queued mutation conflicts on flush (e.g., item was deleted by another member while offline): silently discard the conflicting mutation; no error shown to user

**Key detail:** Supabase JS v2 does not have built-in offline support — this queue is fully custom. Keep it simple: a JSON array in persistent storage, processed serially on reconnect. Do not attempt a full CRDT implementation.

**Depends on:** T-010, T-011, T-013

---

### T-023 · Item drag-to-reorder within aisle
**Size:** Small

**Goal:** Items within an aisle can be reordered by drag; order persists and syncs.

**Scope:**
- Long-press item → drag handle appears; user drags to new position
- Use `react-native-draggable-flatlist` (same lib as T-007 for aisle reorder)
- On drop: update `sort_order` for all affected items in batch (single `UPDATE` with a `CASE` statement or individual updates)
- Optimistic update; sync to DB on drop (not during drag)

**Depends on:** T-009

---

### T-024 · iOS app config and Expo EAS build
**Size:** Small

**Goal:** App builds and installs on a physical iPhone via Expo EAS.

**Scope:**
- Configure `app.config.ts`: bundle ID, app name, icon, splash screen, permissions (camera, microphone)
- Set up `eas.json` with development and production profiles
- Run `eas build --platform ios --profile development` and install on device
- Verify camera and microphone permissions prompt correctly on device (not just simulator)
- Configure deep link scheme for invite links (T-006)

**Depends on:** T-019, T-020 (permissions needed before build config is meaningful)

---

### T-025 · Web deployment to Vercel
**Size:** Small

**Goal:** App is deployed to Vercel and accessible in a browser; web-specific features (speech, camera) work.

**Scope:**
- Export Expo web build: `expo export --platform web`
- Deploy to Vercel via GitHub integration or `vercel` CLI
- Configure environment variables in Vercel dashboard (Supabase URL + anon key)
- Verify barcode scanner and voice input work in Chrome (camera/mic permissions)
- Test deep link invite flow on web (token in URL query param)

**Depends on:** T-024 (or can run in parallel after T-006)

---

## Milestone 5 — Hardening & Edge Cases
*Goal: All specified edge cases are implemented and tested; app is ready for household use.*

---

### T-026 · Remaining edge case audit
**Size:** Medium

**Goal:** Systematically verify every edge case in the UX Flows doc is implemented.

**Scope:**
- Walk through all 50+ edge cases in `grocery-app-ux-flows.md`
- For each: confirm it is handled, test it manually, note any gaps
- Fix any unimplemented or incorrectly implemented cases
- Pay particular attention to: offline flows (EC1-6, EC3-5, EC4-7, EC5-7), permission denials (EC2-6, EC3-4), and the aisle-missing flows (EC1-2, EC1-4, EC2-1)

**Depends on:** All prior milestones

---

### T-027 · Accessibility pass
**Size:** Medium

**Goal:** Core flows are usable with iOS VoiceOver and meet basic WCAG AA contrast.

**Scope:**
- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements
- Ensure tap targets are ≥ 44×44pt
- Verify color contrast on checked/faded items and suggestion cards
- Test check-off and add-item flows with VoiceOver enabled on device

**Depends on:** T-026

---

## Dependency Graph (summary)

```
T-001 → T-002 → T-003 → T-004 → T-005 → T-006
                                            │
                T-007 ←─────────────────────┤
                  │                         │
                T-008 ←─────────────────────┘
                  │
        ┌─────────┤─────────┐
        ▼         ▼         ▼
      T-009     T-014     T-018*
        │         │
      T-010     T-015
        │         │
      T-011     T-016
      │   │
   T-012  T-013
            │
          T-017 → T-018
      T-011 → T-019
      T-011 → T-020
      T-009 → T-021
      T-010,T-011,T-013 → T-022
      T-009 → T-023
      T-019,T-020 → T-024
      T-006 → T-025
      All → T-026 → T-027
```

---

## Ticket Count by Milestone

| Milestone | Tickets | Focus |
|---|---|---|
| 0 — Scaffolding | T-001 – T-006 | Project setup, DB, auth, households |
| 1 — Core List | T-007 – T-013 | Stores, aisles, add/check/end trip |
| 2 — Staples & Suggestions | T-014 – T-018 | Staples CRUD, copy flow, rules engine |
| 3 — Voice & Barcode | T-019 – T-020 | Input modalities |
| 4 — Presence & Polish | T-021 – T-025 | Sync, offline, builds |
| 5 — Hardening | T-026 – T-027 | Edge cases, accessibility |
| **Total** | **27 tickets** | |
