# Claude Code — Ready-to-Paste Ticket Prompts
**Grocery List App · All 27 Tickets**

Each prompt below is fully assembled. For each ticket:
1. Open your terminal in the project folder
2. Run `claude` to start a session
3. Copy the entire block between the `--- START T-XXX ---` and `--- END T-XXX ---` markers
4. Paste it into Claude Code and press Enter
5. Claude Code works autonomously until done — review when it hands back control
6. Type `exit`, then `claude` again for the next ticket

---

<!-- ============================================================ -->
<!-- MILESTONE 0 — SCAFFOLDING                                    -->
<!-- ============================================================ -->

--- START T-001 ---
/goal T-001 is complete: `expo start --web` and `expo start --ios` both launch without errors, TypeScript strict mode is enabled, ESLint and Prettier are configured, and no type errors exist (`npx tsc --noEmit` passes).

## Ticket: T-001 — Initialize Expo project with TypeScript

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Small

**Goal:** Repo exists, runs on iOS simulator and web browser, TypeScript strict mode enabled.

**Scope:**
- `npx create-expo-app` with TypeScript template
- Configure Expo Router (file-based routing) — this is the Expo equivalent of Next.js App Router; use `app/` directory structure
- Set up ESLint + Prettier
- Confirm `expo start --web` and `expo start --ios` both boot without errors

**Exclude:** Any UI, auth, or data. Shell only.

### Reference docs
- https://docs.expo.dev/get-started/create-a-project/
- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev/guides/typescript/

### Completion condition
T-001 is complete: `expo start --web` and `expo start --ios` both launch without errors, TypeScript strict mode is enabled, ESLint and Prettier are configured, and no type errors exist (`npx tsc --noEmit` passes).
--- END T-001 ---

---

--- START T-002 ---
/goal T-002 is complete: `lib/supabase.ts` exists with a working client singleton, the app connects to Supabase on both iOS simulator and web browser, and a smoke-test query succeeds without errors.

## Ticket: T-002 — Initialize Supabase project and connect to app

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Small

**Goal:** Supabase project created; app can make an authenticated query to Supabase from both iOS and web.

**Scope:**
- Install `@supabase/supabase-js`
- Create `lib/supabase.ts` client singleton using `AsyncStorage` for session persistence on native, `localStorage` on web — use the official Expo + Supabase adapter pattern
- Store `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- Smoke test: fetch from a test table and log response on both platforms

**Key detail:** Supabase JS v2 requires a custom storage adapter for React Native. Use the official Expo + Supabase guide pattern (`supabase-js` with `AsyncStorage`).

**Exclude:** Schema, auth UI, RLS. Connection only.

### Reference docs
- https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- https://supabase.com/docs/reference/javascript/introduction

### Completion condition
T-002 is complete: `lib/supabase.ts` exists with a working client singleton, the app connects to Supabase on both iOS simulator and web browser, and a smoke-test query succeeds without errors.
--- END T-002 ---

---

--- START T-003 ---
/goal T-003 is complete: a single SQL migration file exists in `supabase/migrations/`, all tables defined in docs/prd.md §5 and §12.2 are created in Supabase with correct types, foreign keys, and indexes, and `supabase db push` runs without errors.

## Ticket: T-003 — Database schema — initial migration

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/prd.md §5 (Data Schema) and §12.2 (Supporting Schema) for all table definitions.

### Task
**Size:** Medium

**Goal:** All core tables exist in Supabase with correct types, foreign keys, and indexes.

**Scope:** Create a single SQL migration file in `supabase/migrations/` covering:
- `profiles` (extends Supabase Auth users)
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

Key implementation details:
- `grocery_items.source` is a Postgres enum: `manual | staples | suggestion | barcode | voice`
- All tables except `profiles` include `household_id UUID REFERENCES households(id)`
- Add indexes on `item_history(household_id, purchased_at)` — used heavily by rules engine
- Add index on `household_invites(token)`
- Add this duplicate-prevention partial index on `grocery_items`:
  ```sql
  CREATE UNIQUE INDEX grocery_items_no_duplicate_unchecked
  ON grocery_items (household_id, store_id, LOWER(name))
  WHERE checked = false;
  ```

**Exclude:** RLS policies (T-004), Edge Functions (T-017).

### Reference docs
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/cli/local-development
- https://supabase.com/docs/guides/database/tables

### Completion condition
T-003 is complete: a single SQL migration file exists in `supabase/migrations/`, all tables defined in docs/prd.md §5 and §12.2 are created in Supabase with correct types, foreign keys, and indexes, and `supabase db push` runs without errors.
--- END T-003 ---

---

--- START T-004 ---
/goal T-004 is complete: RLS is enabled on all tables, policies are applied so that queries from a test user only return rows belonging to their household, and a policy audit confirms no table is readable without household membership.

## Ticket: T-004 — Row-Level Security policies

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/prd.md §9 (Permissions & Security) for policy requirements.

### Task
**Size:** Medium

**Goal:** All tables are locked down so users can only read/write rows belonging to their household.

**Scope:** Write RLS policies for every table using this pattern:
```sql
CREATE POLICY "household members only" ON grocery_items
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

Apply to: `households`, `household_members`, `stores`, `aisles`, `grocery_items`, `staple_items`, `item_history`, `suggestion_cache`, `suggestion_dismissals`

For `household_invites`: creator can read/delete; anyone with the token can read (for join flow); write scoped to household members.

**Key detail:** RLS uses `auth.uid()` — the Supabase built-in for the currently authenticated user.

**Exclude:** Application logic. Policies only.

### Reference docs
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/row-level-security#policies-with-joins

### Completion condition
T-004 is complete: RLS is enabled on all tables, policies are applied so that queries from a test user only return rows belonging to their household, and a policy audit confirms no table is readable without household membership.
--- END T-004 ---

---

--- START T-005 ---
/goal T-005 is complete: a user can sign up with email/password, sign in, see the main app shell, and have their session persist after closing and reopening the app on both iOS simulator and web.

## Ticket: T-005 — Auth flow — sign up, sign in, session persistence

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Medium

**Goal:** User can create an account and sign back in; session persists across app restarts.

**Scope:**
- Sign-up screen at `app/(auth)/sign-up.tsx`: email + password
- Sign-in screen at `app/(auth)/sign-in.tsx`: email + password
- On successful auth, create a `profiles` row for the user if one doesn't exist
- Session persists via the storage adapter from T-002
- Auth state drives routing: unauthenticated → `(auth)` screens; authenticated → `(app)` shell
- Use Expo Router's `(auth)` route group for auth screens and `(app)` for the main app

**Exclude:** Household creation/joining (T-006), Google OAuth (v2).

### Reference docs
- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/sessions
- https://docs.expo.dev/router/reference/authentication/

### Completion condition
T-005 is complete: a user can sign up with email/password, sign in, see the main app shell, and have their session persist after closing and reopening the app on both iOS simulator and web.
--- END T-005 ---

---

--- START T-006 ---
/goal T-006 is complete: a new authenticated user with no household is prompted to create or join one; a household creator can generate a copy-paste invite link; a second test user can join via the link; both users share the same household_id in household_members.

## Ticket: T-006 — Household creation and invite flow

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/prd.md §9 (Permissions & Security — HouseholdInvite schema and invite flow spec).

### Task
**Size:** Medium

**Goal:** A new user can create a household or join one via invite link.

**Scope:**
- Post-auth gate: if user has no `household_members` row, show "Create or Join" screen before main app
- **Create household:** text field for household name → creates `households` row + `household_members` row for creator
- **Join via invite:** user pastes token → app validates against `household_invites` (not expired, not used) → creates `household_members` row → marks invite as used (`used_at`, `used_by`)
- **Generate invite link:** Settings → Household → generates a `household_invites` row, builds a deep link URL (`yourapp://join?token=abc123`), copies to clipboard. Token is single-use, 48hr expiry.
- Handle expired token error: "This invite link has expired. Ask a household member to generate a new one."
- Handle already-used token error: "This invite link has already been used."

**Key detail:** Deep links in Expo require configuring `scheme` in `app.config.ts` and using `expo-linking`. Test on both iOS simulator and web.

### Reference docs
- https://docs.expo.dev/guides/deep-linking/
- https://docs.expo.dev/versions/latest/sdk/linking/
- https://supabase.com/docs/reference/javascript/insert

### Completion condition
T-006 is complete: a new authenticated user with no household is prompted to create or join one; a household creator can generate a copy-paste invite link; a second test user can join via the link; both users share the same household_id in household_members.
--- END T-006 ---

---

<!-- ============================================================ -->
<!-- MILESTONE 1 — CORE LIST                                      -->
<!-- ============================================================ -->

--- START T-007 ---
/goal T-007 is complete: the settings screen at app/(app)/settings/stores.tsx allows creating up to 3 stores, adding/renaming/reordering up to 10 aisles per store, all changes persist in Supabase, and edge cases EC8-1 through EC8-7 are handled as specified in docs/ux-flows.md Flow 8.

## Ticket: T-007 — Store and aisle configuration screen

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 8 for wireframes and all edge cases (EC8-1 through EC8-7).

### Task
**Size:** Medium

**Goal:** User can create up to 3 stores, add/rename/reorder up to 10 aisles per store.

**Scope:**
- Settings screen at `app/(app)/settings/stores.tsx`
- List stores; each store shows its aisles with drag-to-reorder (use `react-native-draggable-flatlist`)
- Inline rename for store and aisle names (tap to edit in place)
- "+ Add aisle" inline text field; disappears on save
- "+ Add a store" hidden when 3 stores exist (EC8-7)
- Aisle count badge; "+ Add aisle" hidden at 10 (EC8-3)
- Store deletion deferred (EC8-5): show disabled state with note "To remove a store, contact support."
- All changes write to `stores` / `aisles` tables and sync via Realtime
- Tab reorder deferred (EC8-6)

**Edge cases to implement:** EC8-1 (duplicate aisle name block), EC8-3 (aisle limit), EC8-4 (rename store), EC8-7 (store limit)

### Reference docs
- https://github.com/computerjazz/react-native-draggable-flatlist
- https://docs.expo.dev/router/advanced/stack/
- https://supabase.com/docs/guides/realtime/postgres-changes

### Completion condition
T-007 is complete: the settings screen at app/(app)/settings/stores.tsx allows creating up to 3 stores, adding/renaming/reordering up to 10 aisles per store, all changes persist in Supabase, and edge cases EC8-1 through EC8-7 are handled as specified in docs/ux-flows.md Flow 8.
--- END T-007 ---

---

--- START T-008 ---
/goal T-008 is complete: the main app renders a bottom tab bar with one dynamic tab per store (from the DB) plus Suggestions and Staples tabs; tabs update in real time if a store is added or renamed; each store tab renders a placeholder screen.

## Ticket: T-008 — Main tab bar and store tab shell

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 8 (navigation structure wireframe) for tab layout.

### Task
**Size:** Small

**Goal:** Main app renders a tab bar with one tab per configured store + Suggestions + Staples tabs, dynamic from DB.

**Scope:**
- Tab bar at bottom of screen with store tabs (dynamic, from `stores` table) + Suggestions + Staples
- Each store tab is a screen at `app/(app)/store/[storeId].tsx`
- Tabs render store name; if no stores exist, show prompt to configure stores first
- No list content yet — placeholder "coming soon" is fine
- Realtime subscription on `stores` table so tabs update if a store is added/renamed

**Key detail:** Expo Router's dynamic tabs require using a `_layout.tsx` that maps store data to tab definitions at runtime. This is non-trivial — use the Expo Router dynamic routes docs pattern, not static `(tabs)` config.

### Reference docs
- https://docs.expo.dev/router/advanced/tabs/
- https://docs.expo.dev/router/advanced/dynamic-routes/
- https://supabase.com/docs/guides/realtime/postgres-changes

### Completion condition
T-008 is complete: the main app renders a bottom tab bar with one dynamic tab per store (from the DB) plus Suggestions and Staples tabs; tabs update in real time if a store is added or renamed; each store tab renders a placeholder screen.
--- END T-008 ---

---

--- START T-009 ---
/goal T-009 is complete: each store tab renders grocery items grouped by aisle with correct sort order, checked items appear with strikethrough and faded at the bottom of their aisle, aisle headers show X of Y counts, auto-collapse works when all items in an aisle are checked, and a Realtime subscription updates the list live.

## Ticket: T-009 — Grocery item list view (read)

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 4 for wireframes (shopping mode list view).
Read docs/prd.md §5 for grocery_items schema.

### Task
**Size:** Medium

**Goal:** Each store tab renders its grocery items grouped by aisle, with checked items struck through and faded at the bottom of each aisle section.

**Scope:**
- Query `grocery_items` filtered by `store_id` and `household_id`, ordered by `aisle.sort_order` then `item.sort_order`
- Group items by aisle; render aisle as a collapsible section header
- Aisle header shows name + "X of Y ✓" count
- Unchecked items render normally; checked items render with strikethrough + reduced opacity, sorted to bottom of their aisle section
- Auto-collapse aisle when all items are checked (EC4-4)
- "Everything's in the cart 🛒" state when all items across all aisles are checked (EC4-5)
- Empty state when no items exist (EC5-6 wireframe in Flow 5)
- Realtime subscription on `grocery_items` for this store — incoming changes animate in (EC4-2)

**Exclude:** Checking off items (T-010), adding items (T-011).

### Reference docs
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://reactnative.dev/docs/sectionlist

### Completion condition
T-009 is complete: each store tab renders grocery items grouped by aisle with correct sort order, checked items appear with strikethrough and faded at the bottom of their aisle, aisle headers show X of Y counts, auto-collapse works when all items in an aisle are checked, and a Realtime subscription updates the list live.
--- END T-009 ---

---

--- START T-010 ---
/goal T-010 is complete: tapping an item's circle checks or unchecks it with an optimistic update, the change syncs via Supabase Realtime to other devices, and edge cases EC4-1 (uncheck reverses) and EC4-7 (offline) are handled.

## Ticket: T-010 — Check off and uncheck items

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 4 edge cases EC4-1, EC4-3, EC4-7.

### Task
**Size:** Small

**Goal:** Tapping an item's circle checks or unchecks it; change syncs in real time across all devices.

**Scope:**
- Tap circle → toggle `checked` boolean + set/clear `checked_at` and `checked_by` on `grocery_items`
- Optimistic update: UI reflects change immediately before DB confirms
- Checked item animates to bottom of aisle section with strikethrough + fade
- Uncheck reverses animation, restores item to original `sort_order` position
- Realtime: other devices receive update via existing subscription from T-009

**Edge cases to implement:**
- EC4-1: uncheck immediately reverses, no confirmation needed
- EC4-3: simultaneous check by two members — last-write-wins, no conflict UI
- EC4-7: offline check-off saved locally, ⚠ icon shown, synced on reconnect

### Reference docs
- https://supabase.com/docs/reference/javascript/update
- https://supabase.com/docs/guides/realtime

### Completion condition
T-010 is complete: tapping an item's circle checks or unchecks it with an optimistic update, the change syncs via Supabase Realtime to other devices, and edge cases EC4-1 (uncheck reverses) and EC4-7 (offline) are handled.
--- END T-010 ---

---

--- START T-011 ---
/goal T-011 is complete: the Add Item bottom sheet opens from the + button, inline suggestions appear while typing from item_history, the duplicate hard-block (EC1-3) is enforced at both DB and UI level, all fields save correctly to grocery_items and item_history, and edge cases EC1-2 through EC1-7 are handled.

## Ticket: T-011 — Add item sheet — typing + inline suggestions

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 1 for all wireframes and edge cases EC1-1 through EC1-7.
Read docs/prd.md §5 for grocery_items and item_history schemas.

### Task
**Size:** Large

**Goal:** User can add a grocery item by typing; suggestions from item history appear as they type; duplicate items are hard-blocked.

**Scope:**
- Bottom sheet (use `@gorhom/bottom-sheet`) triggered by `+` button in store tab header
- Fields: Name, Store (pre-filled from current tab), Aisle picker, Qty, Unit, Notes
- Inline suggestions: query `item_history` on name prefix (debounced 200ms), ranked by frequency + recency; display as dropdown below name field; tap to auto-fill name + store + aisle
- [Add Item] button disabled until name + aisle are filled
- On submit: write to `grocery_items`, write to (or upsert) `item_history`
- Duplicate check (EC1-3 — hard block): before saving, check for existing unchecked item with same name (case-insensitive) in same store → block save with inline error: "Oat milk is already on your Costco list." The partial unique index from T-003 enforces this at DB level too.
- Aisle picker includes "+ New aisle" option (EC1-2): opens inline text field, saves new aisle, returns to sheet with new aisle selected
- Discard confirmation on sheet dismiss with partial content (EC1-7): "Discard this item?" [Discard] [Keep Editing]

**Edge cases to implement:** EC1-1, EC1-2, EC1-3 (hard block), EC1-4, EC1-5, EC1-6 (offline), EC1-7

### Reference docs
- https://gorhom.dev/react-native-bottom-sheet/
- https://supabase.com/docs/reference/javascript/insert

### Completion condition
T-011 is complete: the Add Item bottom sheet opens from the + button, inline suggestions appear while typing from item_history, the duplicate hard-block (EC1-3) is enforced at both DB and UI level, all fields save correctly to grocery_items and item_history, and edge cases EC1-2 through EC1-7 are handled.
--- END T-011 ---

---

--- START T-012 ---
/goal T-012 is complete: long-pressing a grocery item shows a context menu with Edit, Move to aisle, and Delete options; all three actions work correctly and sync to Supabase.

## Ticket: T-012 — Long-press context menu on item

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 4 edge case EC4-6.

### Task
**Size:** Small

**Goal:** Long-pressing an item shows options to edit, move to a different aisle, or delete it.

**Scope:**
- Long-press → context menu with: [Edit item] [Move to different aisle] [Delete from list]
- Edit: opens same sheet as T-011 pre-filled with item data
- Move to aisle: aisle picker modal (aisles for the same store only); updates `aisle_id` + `sort_order`
- Delete: single inline confirmation (no modal) → removes from `grocery_items`; does not write to `item_history`

### Reference docs
- https://reactnative.dev/docs/pressable

### Completion condition
T-012 is complete: long-pressing a grocery item shows a context menu with Edit, Move to aisle, and Delete options; all three actions work correctly and sync to Supabase.
--- END T-012 ---

---

--- START T-013 ---
/goal T-013 is complete: each store tab has an End Trip button scoped to that store; tapping it shows a confirmation modal listing checked and unchecked items; confirming clears checked items, writes them to item_history, and syncs to all devices; edge cases EC5-1 through EC5-7 are handled.

## Ticket: T-013 — End Trip flow

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 5 for all wireframes and edge cases EC5-1 through EC5-7.

### Task
**Size:** Medium

**Goal:** Each store tab has an End Trip button that clears checked items for that store only, after confirmation.

**Scope:**
- [End Trip] button pinned to bottom of store tab, above tab bar
- Button hidden if no items exist at all (EC5-2)
- Button disabled with message if no checked items exist (EC5-1): "Check off items before ending your trip."
- Tap → modal listing: checked items to be cleared + unchecked items that will remain
- [End Trip] in modal disabled if zero checked items (EC5-3)
- Confirm → delete all checked `grocery_items` for this store; write each to `item_history` with `purchased_at = NOW()`
- Race condition: if another member triggers End Trip simultaneously, show notice and auto-dismiss (EC5-4)
- Empty state after trip (EC5-6 wireframe)
- Offline: apply locally, queue `item_history` writes, sync on reconnect (EC5-7)

**Edge cases to implement:** EC5-1, EC5-2, EC5-3, EC5-4, EC5-6, EC5-7

### Reference docs
- https://supabase.com/docs/reference/javascript/delete
- https://supabase.com/docs/reference/javascript/insert

### Completion condition
T-013 is complete: each store tab has an End Trip button scoped to that store; tapping it shows a confirmation modal listing checked and unchecked items; confirming clears checked items, writes them to item_history, and syncs to all devices; edge cases EC5-1 through EC5-7 are handled.
--- END T-013 ---

---

<!-- ============================================================ -->
<!-- MILESTONE 2 — STAPLES & SUGGESTIONS                         -->
<!-- ============================================================ -->

--- START T-014 ---
/goal T-014 is complete: the Staples tab renders all staple_items grouped by default store, search filters rows client-side in real time, a Realtime subscription keeps the list live, and the empty state is shown when no staples exist.

## Ticket: T-014 — Staples list — read view

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 6 (Staples tab wireframe) and Flow 7 edge case EC6-5 (empty state).

### Task
**Size:** Small

**Goal:** Staples tab renders all staple items grouped by their default store, with search.

**Scope:**
- Query `staple_items` for household, grouped by `default_store_id`
- Collapsible sections per store (same pattern as T-009)
- Each row shows: name, default aisle, default qty/unit
- [Search 🔍] button opens inline search bar; filters rows client-side by name in real time
- Empty state (EC6-5): "No staples yet. Add your household's go-to items so you can quickly restock them." + [+ Add a Staple] button
- Realtime subscription on `staple_items`

### Reference docs
- https://supabase.com/docs/guides/realtime/postgres-changes

### Completion condition
T-014 is complete: the Staples tab renders all staple_items grouped by default store, search filters rows client-side in real time, a Realtime subscription keeps the list live, and the empty state is shown when no staples exist.
--- END T-014 ---

---

--- START T-015 ---
/goal T-015 is complete: users can add, edit, and delete staple items; all edge cases EC7-1 through EC7-5 are handled; changes sync via Supabase Realtime.

## Ticket: T-015 — Staples list — adding and editing a staple

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 7 for wireframes and all edge cases EC7-1 through EC7-5.

### Task
**Size:** Medium

**Goal:** Users can add new staples and edit or delete existing ones.

**Scope:**
- [+ Add] button → Add Staple sheet (Flow 7 wireframe)
- Fields: Name (with same history suggestions as T-011), Default Store, Default Aisle, Default Qty, Default Unit
- Name required (EC7-2); store/aisle optional (EC7-3)
- Duplicate name warning (EC7-4): warn but allow save — duplicates permitted for same item at different stores
- Tap existing row → Edit sheet, pre-filled; [🗑 Delete] at bottom
- Delete: inline confirm, no modal (EC7-1): "Delete [Name] from staples?" [Delete] [Cancel]
- Removing staple does not affect previously copied grocery items (EC7-5)

**Edge cases to implement:** EC7-1 through EC7-5

### Reference docs
- https://supabase.com/docs/reference/javascript/upsert

### Completion condition
T-015 is complete: users can add, edit, and delete staple items; all edge cases EC7-1 through EC7-5 are handled; changes sync via Supabase Realtime.
--- END T-015 ---

---

--- START T-016 ---
/goal T-016 is complete: selection mode works on the Staples tab, items can be copied to a target store list, duplicates are hard-blocked before copy with "Already on list" labels (EC6-2), and all edge cases EC6-1 through EC6-6 are handled.

## Ticket: T-016 — Copy staples to active list

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 6 for all wireframes and edge cases EC6-1 through EC6-6.

### Task
**Size:** Medium

**Goal:** User can select one or more staples and copy them to an active store list, with duplicates hard-blocked.

**Scope:**
- [Select] button on Staples tab → selection mode with checkboxes
- Header updates: item count + [Add to List ▾] + [✕ Cancel]
- [Add to List ▾] dropdown: list of stores + "Each item's default"
- Before copying: check for duplicates against unchecked items in target store (case-insensitive). Duplicates deselected + labeled "Already on list" — cannot be re-selected (EC6-2 hard block)
- [Add to List] disabled until at least one non-duplicate item selected (EC6-3)
- If "Each item's default" chosen and item has no default store: skip + show notice
- If target aisle doesn't exist in target store: prompt to pick existing aisle or create one (EC6-1)
- Toast on success: "X items added to [Store]"
- Long-press in selection mode → "Select all in [Store]" / "Select all" (EC6-4)

**Edge cases to implement:** EC6-1, EC6-2 (hard block), EC6-3, EC6-4, EC6-5, EC6-6

### Reference docs
- https://supabase.com/docs/reference/javascript/insert

### Completion condition
T-016 is complete: selection mode works on the Staples tab, items can be copied to a target store list, duplicates are hard-blocked before copy with "Already on list" labels (EC6-2), and all edge cases EC6-1 through EC6-6 are handled.
--- END T-016 ---

---

--- START T-017 ---
/goal T-017 is complete: the Supabase Edge Function at supabase/functions/suggestions/index.ts implements all 4 rules from docs/prd.md §12.3, writes output to suggestion_cache as JSONB, can be invoked with `supabase functions serve` locally, and returns correctly scored and ranked results given seeded test data.

## Ticket: T-017 — Rules engine — Supabase Edge Function

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/prd.md §12 (entire section) for the full rules engine spec, scoring formulas, output schema, and performance requirements.

### Task
**Size:** Large

**Goal:** A Supabase Edge Function runs the 4-rule suggestions engine and writes results to `suggestion_cache`.

**Implement `supabase/functions/suggestions/index.ts` with these 4 rules:**

**Rule 1 — Overdue Staple** (category: `might_be_running_low`)
- Items in `staple_items` not in active unchecked `grocery_items`
- No `item_history` record in last 14 days OR never purchased
- Score: base 80 + modifiers per PRD §12.3

**Rule 2 — Frequency + Recency Decay** (category: `might_be_running_low`)
- Items in `item_history` with ≥ 3 purchases in last 180 days, not on active list, last purchased > 7 days ago
- Score: base 60 + frequency score + recency decay per PRD §12.3

**Rule 3 — Co-purchase Association** (category: `ai_picks`)
- Requires ≥ 10 completed trips; finds items co-purchased with active list items within 2-hour trip windows
- Score: base 50 + co-occurrence ratio × 40 per PRD §12.3

**Rule 4 — Periodic Pattern** (category: `might_be_running_low`)
- Items with ≥ 4 purchases AND std_dev of purchase intervals < 5 days
- Score: base 70 + modifiers per PRD §12.3

**Post-processing:**
- Merge candidates (sum scores for same item across rules)
- Filter: remove active list items, dismissed items, items with score < 40
- Sort by score desc; cap at 20 total (10 per category)
- Write to `suggestion_cache` as JSONB per output schema in PRD §12.4

**Key detail:** Edge Functions run Deno, not Node. Use Deno-compatible imports. Use the Supabase service role key (from env var) for DB access — never the anon key.

### Reference docs
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/auth
- https://deno.com/manual

### Completion condition
T-017 is complete: the Supabase Edge Function at supabase/functions/suggestions/index.ts implements all 4 rules from docs/prd.md §12.3, writes output to suggestion_cache as JSONB, can be invoked with `supabase functions serve` locally, and returns correctly scored and ranked results given seeded test data.
--- END T-017 ---

---

--- START T-018 ---
/goal T-018 is complete: the Suggestions tab fetches from suggestion_cache (or invokes the Edge Function if stale), renders two sections with add and dismiss actions, dismissed items write to suggestion_dismissals, and the graceful empty state is shown when insufficient history exists.

## Ticket: T-018 — Suggestions tab UI

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 6 (Suggestions tab wireframe).
Read docs/prd.md §12.5 for caching and empty state requirements.

### Task
**Size:** Medium

**Goal:** Suggestions tab displays cached results from the rules engine, with add and dismiss actions.

**Scope:**
- On tab open: check `suggestion_cache` — if fresh (< 6 hours), render from cache; if stale/missing, invoke Edge Function then render
- Loading state while function runs
- Two sections: "Might be running low" and "AI picks for you" (only render section if it has items)
- Each card: item name, store name, aisle name, last purchased date (or "Never purchased")
- [+ Add] on card → copies to store's active list; if duplicate, card shows "Already on list" and [+ Add] disabled
- [✕] on card → writes to `suggestion_dismissals` with `resurface_at = NOW() + 7 days`; card animates out
- Pull-to-refresh invalidates cache and re-invokes Edge Function
- Empty/insufficient-history state: "Add more items and complete a few trips — suggestions will improve over time."

### Reference docs
- https://supabase.com/docs/reference/javascript/select
- https://supabase.com/docs/guides/functions/http-filters

### Completion condition
T-018 is complete: the Suggestions tab fetches from suggestion_cache (or invokes the Edge Function if stale), renders two sections with add and dismiss actions, dismissed items write to suggestion_dismissals, and the graceful empty state is shown when insufficient history exists.
--- END T-018 ---

---

<!-- ============================================================ -->
<!-- MILESTONE 3 — VOICE & BARCODE                               -->
<!-- ============================================================ -->

--- START T-019 ---
/goal T-019 is complete: the barcode scanner opens from the 📷 button on iOS and web, scans UPC/EAN codes, looks up product names from Open Food Facts (with local history cache fallback), pre-fills the Add Item sheet, and edge cases EC3-1 through EC3-7 are handled.

## Ticket: T-019 — Barcode scanner

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 3 for all wireframes and edge cases EC3-1 through EC3-7.

### Task
**Size:** Medium

**Goal:** User can scan a barcode to pre-fill the Add Item sheet with a product name.

**Scope:**
- Install `expo-camera`
- 📷 button in store tab header and inside Add Item sheet
- Full-screen scanner overlay with targeting box (Flow 3 wireframe)
- On scan: check `item_history` for prior scan of same barcode first — use cached name without API call (EC3-2)
- If not cached: call Open Food Facts API `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`; extract `product_name` or `product_name_en`
- On success: open Add Item sheet pre-filled with product name
- On API miss: open sheet with empty name + notice "Product not found. Enter a name manually." (EC3-1)
- Store barcode on `grocery_items` and `item_history` records
- Manual barcode entry text field as fallback below camera view
- Handle camera permission denied (EC3-4): "Camera access is needed for barcode scanning." + [Open Settings]
- Handle offline with barcode not in local history (EC3-5): "Can't look up this product offline." → manual entry

**Edge cases to implement:** EC3-1 through EC3-7

### Reference docs
- https://docs.expo.dev/versions/latest/sdk/camera/
- https://openfoodfacts.github.io/openfoodfacts-server/api/

### Completion condition
T-019 is complete: the barcode scanner opens from the 📷 button on iOS and web, scans UPC/EAN codes, looks up product names from Open Food Facts (with local history cache fallback), pre-fills the Add Item sheet, and edge cases EC3-1 through EC3-7 are handled.
--- END T-019 ---

---

--- START T-020 ---
/goal T-020 is complete: the 🎤 button opens a listening overlay on iOS (using expo-speech-recognition) and web (using Web Speech API), transcribed speech is parsed into item cards with quantity and unit extraction, the review screen allows editing and deselecting items before adding, and edge cases EC2-1 through EC2-7 are handled.

## Ticket: T-020 — Voice input

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md Flow 2 for all wireframes and edge cases EC2-1 through EC2-7.

### Task
**Size:** Large

**Goal:** User can dictate one or more grocery items; each is parsed and shown for review before adding.

**Scope:**
- 🎤 button in store tab header
- Platform split: `hooks/useSpeech.ios.ts` (expo-speech-recognition) and `hooks/useSpeech.web.ts` (window.SpeechRecognition) with shared interface in `hooks/useSpeech.ts`
- Listening overlay (Flow 2 wireframe): live transcription shown as user speaks
- On silence or Done tap: parse transcription into items

**Parsing logic (client-side):**
- Split on: "and", ",", "also"
- Extract quantity: leading number words ("two", "three") or digits → convert to number
- Extract unit from known list: lbs, cans, gallons, bunches, boxes, bags, cartons, oz, packs
- Remainder = item name
- Example: "two cans of black beans" → `{ name: "black beans", qty: 2, unit: "cans" }`

- Review screen (Flow 2 wireframe): one card per item; [Edit ✎] opens inline fields; checkbox per item (EC2-7)
- Auto-fill store (from current tab) and aisle (from `item_history` if name matches)
- Aisle unknown → flagged amber, [Add All] blocked (EC2-1)
- [Add All / Add Selected (N)] → same write path and duplicate check as T-011
- Duplicate parsed items in utterance: merge and combine qty (EC2-4)
- Mic permission denied: [Open Settings] (EC2-6)
- No speech detected: "We didn't catch that." [Retry] [Type Instead] (EC2-2)

**Key detail:** Implement the platform split (`useSpeech.ios.ts` / `useSpeech.web.ts`) before building the UI layer on top of it.

**Edge cases to implement:** EC2-1 through EC2-7

### Reference docs
- https://docs.expo.dev/versions/latest/sdk/speech/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- https://docs.expo.dev/router/advanced/platform-specific-modules/

### Completion condition
T-020 is complete: the 🎤 button opens a listening overlay on iOS (using expo-speech-recognition) and web (using Web Speech API), transcribed speech is parsed into item cards with quantity and unit extraction, the review screen allows editing and deselecting items before adding, and edge cases EC2-1 through EC2-7 are handled.
--- END T-020 ---

---

<!-- ============================================================ -->
<!-- MILESTONE 4 — PRESENCE, POLISH & OFFLINE                    -->
<!-- ============================================================ -->

--- START T-021 ---
/goal T-021 is complete: when a household member opens a store tab, other members see a presence indicator (name or avatar) on that store's tab; presence clears when the user leaves the tab or backgrounds the app.

## Ticket: T-021 — Real-time presence indicator

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/prd.md §4.8 (Real-Time Sync — presence spec).

### Task
**Size:** Small

**Goal:** A subtle indicator shows when another household member is actively shopping at a store.

**Scope:**
- Use Supabase Realtime Presence channel — one channel per household (`presence:household:{id}`)
- When user opens a store tab: call `channel.track({ user_id, user_name, store_id })`
- On tab change or app background: call `channel.untrack()`
- Other members see a small label or avatar badge on the relevant store tab: "Sarah is here"
- Max 3–4 users — no overflow handling needed

**Key detail:** Supabase Presence uses `channel.track()` and `channel.on('presence', ...)`. It is separate from the Realtime DB subscriptions already set up in T-009.

### Reference docs
- https://supabase.com/docs/guides/realtime/presence

### Completion condition
T-021 is complete: when a household member opens a store tab, other members see a presence indicator (name or avatar) on that store's tab; presence clears when the user leaves the tab or backgrounds the app.
--- END T-021 ---

---

--- START T-022 ---
/goal T-022 is complete: all mutations (add, check, delete, end trip, add staple, dismiss suggestion) are queued offline when the network is unavailable, synced in FIFO order on reconnect, and unsynced items show a ⚠ indicator; the offline badge appears on the store tab header when offline.

## Ticket: T-022 — Offline queue and sync indicator

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md edge cases: EC1-6, EC3-5, EC4-7, EC5-7 for offline behavior specs.

### Task
**Size:** Medium

**Goal:** All mutations work offline; unsynced changes are clearly indicated; sync happens automatically on reconnect.

**Scope:**
- Create `lib/offlineQueue.ts` with `enqueue(mutation)` and `flush()` interface
- Storage: `react-native-mmkv` on native, `idb` on web — abstract behind the same interface
- Queue all mutations: add item, check/uncheck, delete item, end trip, add staple, dismiss suggestion
- Monitor network with `@react-native-community/netinfo`; call `flush()` on reconnect
- Flush in FIFO order, serially — do not parallelize
- On conflict during flush (item deleted by another member while offline): silently discard, no error shown
- Per-item ⚠ icon on rows with unsynced local changes
- "Offline" badge on store tab header when network unavailable

**Key detail:** Keep the queue simple — a JSON array in persistent storage processed serially. Do not implement CRDT.

### Reference docs
- https://github.com/mrousavy/react-native-mmkv
- https://github.com/jakearchibald/idb
- https://github.com/react-native-netinfo/react-native-netinfo

### Completion condition
T-022 is complete: all mutations (add, check, delete, end trip, add staple, dismiss suggestion) are queued offline when the network is unavailable, synced in FIFO order on reconnect, and unsynced items show a ⚠ indicator; the offline badge appears on the store tab header when offline.
--- END T-022 ---

---

--- START T-023 ---
/goal T-023 is complete: items within an aisle can be reordered by drag; new sort_order values are written to Supabase on drop and sync to other devices.

## Ticket: T-023 — Item drag-to-reorder within aisle

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Small

**Goal:** Items within an aisle can be reordered by drag; order persists and syncs.

**Scope:**
- Long-press item → drag handle appears; user drags to new position within the same aisle
- Use `react-native-draggable-flatlist` (same library used for aisle reorder in T-007)
- On drop: update `sort_order` for all affected items in a single batch update
- Optimistic update applied during drag; sync to DB on drop only (not during drag)
- Change syncs to all household members via existing Realtime subscription

### Reference docs
- https://github.com/computerjazz/react-native-draggable-flatlist

### Completion condition
T-023 is complete: items within an aisle can be reordered by drag; new sort_order values are written to Supabase on drop and sync to other devices.
--- END T-023 ---

---

--- START T-024 ---
/goal T-024 is complete: the app builds successfully via `eas build --platform ios --profile development`, installs on a physical iPhone, and camera and microphone permission prompts work correctly on device.

## Ticket: T-024 — iOS app config and Expo EAS build

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Small

**Goal:** App builds and installs on a physical iPhone via Expo EAS.

**Scope:**
- Configure `app.config.ts`: bundle ID, app name, icon, splash screen
- Add permissions to `app.config.ts`: `NSCameraUsageDescription`, `NSSpeechRecognitionUsageDescription`, `NSMicrophoneUsageDescription`
- Set up `eas.json` with `development` and `production` build profiles
- Configure deep link scheme for invite links (from T-006): add `scheme` to `app.config.ts`
- Run `eas build --platform ios --profile development`
- Install on physical device and verify camera + microphone permission prompts appear correctly

### Reference docs
- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/guides/permissions/

### Completion condition
T-024 is complete: the app builds successfully via `eas build --platform ios --profile development`, installs on a physical iPhone, and camera and microphone permission prompts work correctly on device.
--- END T-024 ---

---

--- START T-025 ---
/goal T-025 is complete: the web build deploys to Vercel, the app is accessible in a browser, environment variables are configured in Vercel, and barcode scanning and voice input work in Chrome.

## Ticket: T-025 — Web deployment to Vercel

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Small

**Goal:** App is deployed to Vercel and accessible in a browser; web-specific features work.

**Scope:**
- Export Expo web build: `expo export --platform web`
- Deploy to Vercel via GitHub integration or `vercel` CLI
- Configure environment variables in Vercel dashboard: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Verify barcode scanner works in Chrome (camera permission prompt)
- Verify voice input works in Chrome (microphone permission prompt)
- Test deep link invite flow on web: token in URL query param → join household

### Reference docs
- https://docs.expo.dev/distribution/publishing-websites/
- https://vercel.com/docs/deployments/overview

### Completion condition
T-025 is complete: the web build deploys to Vercel, the app is accessible in a browser, environment variables are configured in Vercel, and barcode scanning and voice input work in Chrome.
--- END T-025 ---

---

<!-- ============================================================ -->
<!-- MILESTONE 5 — HARDENING                                      -->
<!-- ============================================================ -->

--- START T-026 ---
/goal T-026 is complete: every edge case in docs/ux-flows.md has been tested manually, all unimplemented cases are fixed, and a docs/edge-case-audit.md file exists noting the status (pass/fail/fixed) of each edge case.

## Ticket: T-026 — Remaining edge case audit

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.
Read docs/ux-flows.md in full — every edge case across all 8 flows.

### Task
**Size:** Medium

**Goal:** Systematically verify every edge case in the UX Flows doc is implemented and correct.

**Scope:**
- Walk through all edge cases in `docs/ux-flows.md` (EC1-1 through EC8-7)
- For each: verify it is handled in code, test it, note the result
- Fix any unimplemented or broken cases
- Create `docs/edge-case-audit.md` with a table: EC ID | Description | Status (Pass / Fixed / Deferred)
- Pay special attention to: offline flows (EC1-6, EC3-5, EC4-7, EC5-7), permission denials (EC2-6, EC3-4), aisle-missing flows (EC1-2, EC1-4, EC2-1)

### Completion condition
T-026 is complete: every edge case in docs/ux-flows.md has been tested manually, all unimplemented cases are fixed, and a docs/edge-case-audit.md file exists noting the status (pass/fail/fixed) of each edge case.
--- END T-026 ---

---

--- START T-027 ---
/goal T-027 is complete: all interactive elements have accessibilityLabel and accessibilityRole, tap targets are ≥ 44×44pt, color contrast passes WCAG AA, and the check-off and add-item flows are navigable with VoiceOver enabled on device.

## Ticket: T-027 — Accessibility pass

### Context
Read CLAUDE.md for coding standards, forbidden actions, stack details, and reference doc links.

### Task
**Size:** Medium

**Goal:** Core flows are usable with iOS VoiceOver and meet basic WCAG AA contrast.

**Scope:**
- Add `accessibilityLabel` and `accessibilityRole` to all interactive elements (buttons, checkboxes, text inputs, list items)
- Ensure all tap targets are ≥ 44×44pt — add `minHeight`/`minWidth` where needed
- Verify color contrast on: checked/faded items (strikethrough gray), suggestion cards, aisle headers, disabled states
- Test check-off flow with VoiceOver enabled on physical iPhone
- Test add-item flow with VoiceOver enabled on physical iPhone

### Reference docs
- https://reactnative.dev/docs/accessibility
- https://docs.expo.dev/guides/accessibility/

### Completion condition
T-027 is complete: all interactive elements have accessibilityLabel and accessibilityRole, tap targets are ≥ 44×44pt, color contrast passes WCAG AA, and the check-off and add-item flows are navigable with VoiceOver enabled on device.
--- END T-027 ---
