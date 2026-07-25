# Design & Status Reference
**Last updated:** 2026-07-25

This file is the running architecture snapshot and status tracker. Update it as features ship or decisions change. It is NOT the spec — the spec lives in `prd.md`, `tasks.md`, and `ux-flows.md`.

---

## 0. 2026-07-25 refactor — CartSync-style lists model (SUPERSEDES sections below)

Major refactor: the store/aisle hierarchy and tab-bar UI described in the sections
below were replaced with a simpler model based on the user's Replit "CartSync" app.

- **Lists replace stores/aisles.** The `lists` table was ADOPTED from the Replit CartSync
  app, which shared this Supabase project: migration `20260725000000` added
  `household_id`/`sort_order`/`created_by` (backfilled from `owner_id`, now nullable
  legacy) and swapped its RLS to the household pattern. `grocery_items` gains `list_id`
  (NOT NULL) and optional free-text `tag`; `store_id`/`aisle_id` are now nullable legacy
  columns. Migration `20260725000001` converted each Expo store → a list (aisle name →
  tag), merged CartSync `items` into `grocery_items` (store_tag → tag, completed →
  checked, note → notes), deduped, then dropped CartSync's `items`/`list_members` tables
  and its broken `on_auth_user_created` signup trigger.
- **Duplicate rule** now scoped `(list_id, LOWER(name)) WHERE checked = false`.
- **Dropped from the app** (tables/Edge Function dormant in DB): staples, suggestions,
  item_history writes, End Trip (replaced by "Clear all" on the completed section),
  stores/aisles settings.
- **Navigation:** no tab bar. `(app)/index` = My Lists cards → `(app)/list/[id]` detail
  → `(app)/settings` behind avatar icon. Household invite flow retained.
- **Theming:** iOS-system light/dark token palette in `constants/Colors.ts`, consumed
  via `useThemeColors()` / `useThemedStyles()`; follows system preference (web uses
  `prefers-color-scheme`).
- **Retained:** auth + onboarding (restyled), offline queue (payload now list-scoped),
  realtime sync, presence (re-keyed to `list_id`), barcode + voice input (prefill/parse
  names only), swipe-to-delete via RNGH.

Sections 1–8 below describe the PRE-refactor architecture and are kept for history.

---

## 1. Architecture Overview

### Stack
| Layer | Technology |
|---|---|
| Framework | Expo SDK + Expo Router (file-based routing, `app/` dir) |
| Language | TypeScript strict mode |
| UI | React Native core components (no UI kit) |
| Backend | Supabase (Postgres + Realtime + Auth + RLS) |
| Web hosting | Vercel (GitHub integration, auto-deploy on push to `main`) |
| iOS builds | Expo EAS (configured, not yet run on physical device) |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Drag-to-reorder | `react-native-draggable-flatlist` |
| Animations | `react-native-reanimated` |
| Offline storage | `react-native-mmkv` (native) / `idb` (web) |
| Network status | `@react-native-community/netinfo` |

### Key Architectural Patterns
- **File-based routing** via Expo Router. Route groups: `(auth)`, `(app)`, `(onboarding)`.
- **Providers** at root level: `GestureHandlerRootView → BottomSheetModalProvider → HouseholdProvider → StoresProvider → RootLayoutNav` (in `app/_layout.tsx`).
- **Platform splits**: `.ios.ts` / `.web.ts` suffixes for speech recognition (`useSpeech`), offline storage (`lib/storage`), and Supabase client (`lib/supabase.web.ts`).
- **RLS** is the security boundary. Every Supabase query is scoped to `household_id`.
- **Realtime subscriptions** set up in `useEffect`, cleaned up with `channel.unsubscribe()` on unmount.
- **Optimistic updates** on check/uncheck; revert on DB error.

---

## 2. File Structure

```
app/
  _layout.tsx              Root layout (providers)
  +html.tsx                Web HTML template (PWA meta, safe area CSS)
  (auth)/                  Sign-in, sign-up, reset-password
  (onboarding)/            Create/join household gate (post-auth, pre-app)
  (app)/
    _layout.tsx            Tab bar (Lists + Staples + Settings, static tabs; custom tab bar owns paddingBottom safe area)
    index.tsx              Redirect to /lists (or /settings/stores if household has no stores)
    lists.tsx              Lists view — horizontal store chip selector + embedded StoreView
    store/[storeId].tsx    Direct per-store view (used for deep links; chip bar not shown here)
    staples.tsx            Staples list
    suggestions.tsx        Suggestions tab
    settings/
      index.tsx            Settings screen (invite, manage stores, sign out)
      stores.tsx           Store & aisle configuration + store deletion

components/
  AddItemSheet.tsx         Add-item bottom sheet
  AddStapleSheet.tsx       Add/edit staple bottom sheet
  AddAisleRow.tsx          Inline aisle creation row
  AisleMismatchModal.tsx   Modal when staple's aisle doesn't exist in target store
  AislePicker.tsx          Aisle selector component
  AisleRow.tsx             Aisle row in store config
  AisleSection.tsx         Collapsible aisle section in grocery list (uses RNGH TouchableOpacity for header — see §8)
  BarcodeScanner.tsx       Full-screen barcode scanner overlay
  EditItemSheet.tsx        Edit existing grocery item
  EndTripModal.tsx         End Trip confirmation modal
  GroceryItemRow.tsx       Single grocery item row
  ItemContextMenu.tsx      Long-press context menu (edit/move/delete)
  ListeningOverlay.tsx     Voice input listening overlay
  MoveAisleSheet.tsx       Move item to different aisle
  SheetModal.tsx           Generic sheet/modal wrapper
  StapleSection.tsx        Staple group section (by store); uses RN TouchableOpacity for header — see §8)
  StoreHeader.tsx          Per-store expandable header in Settings (rename + color picker + collapse toggle)
  StorePickerModal.tsx     Store selector modal
  StoreSection.tsx         Store block in Settings (aisles list + delete store button)
  StoreView.tsx            Full per-store grocery list view (used inside lists.tsx and store/[storeId].tsx)
  SuggestionCard.tsx       Suggestion item card
  SuggestionsDropdown.tsx  Inline type-ahead suggestions dropdown
  VoiceItemCard.tsx        Card for reviewing voice-parsed item
  VoiceReviewSheet.tsx     Sheet showing parsed voice items for review

hooks/
  useAisles.ts             Fetch aisles for a store
  useAuth.ts               Auth session + user
  useBarcodeScanner.ts     Barcode scan + Open Food Facts lookup
  useCopyStaplesToList.ts  Copy-staples-to-list logic (duplicate check included)
  useGroceryItems.ts       Fetch + subscribe to grocery items for a store
  useHousehold.ts          Household context consumer
  useItemSuggestions.ts    Type-ahead history suggestions
  useNetworkStatus.ts      Online/offline detection
  usePresence.ts           Supabase Realtime Presence
  useSpeech.ts             Shared speech interface (platform files below)
  useSpeech.ios.ts         iOS speech via expo-speech-recognition
  useSpeech.web.ts         Web speech via window.SpeechRecognition
  useStapleItems.ts        Fetch + subscribe to staple items
  useStores.ts             Fetch + subscribe to stores
  useSuggestions.ts        Suggestions tab data (cache + Edge Function invoke)

lib/
  supabase.ts              Supabase client singleton (native)
  supabase.web.ts          Supabase client (web — uses localStorage)
  HouseholdProvider.tsx    household_id state + onboarding gate
  StoresProvider.tsx       Stores list context (shared across tabs)
  aisleColors.ts           8-color preset palette + theme helper (bg/text/border tokens per color)
  offlineQueue.ts          Offline mutation queue (enqueue/flush)
  parseVoiceInput.ts       Voice utterance → item array parser
  storage.ts               Storage interface
  storage.native.ts        MMKV storage implementation
  storage.web.ts           idb (IndexedDB) storage implementation

supabase/
  migrations/
    20260615000000_initial_schema.sql
    20260615000001_rls_policies.sql
    20260615000002_household_invites_update_policy.sql
    20260618000000_grocery_items_barcode.sql
    20260619000000_household_members_user_unique.sql
    20260619000001_fix_household_members_rls.sql
    20260620000000_add_store_color.sql

public/
  manifest.json            PWA web manifest (display: standalone)
```

---

## 3. Database Schema (current)

See `supabase/migrations/` for the canonical SQL. Summary of key tables:

| Table | Purpose |
|---|---|
| `profiles` | Extended user info (linked to Supabase Auth `auth.users`) |
| `households` | Household record (name) |
| `household_members` | User ↔ household membership (unique per user) |
| `stores` | Up to 3 stores per household; `color TEXT` column added 2026-06-20 |
| `aisles` | Aisles per store; `sort_order` |
| `grocery_items` | Active shopping items; `source` enum; `barcode` column added 2026-06-18 |
| `staple_items` | Persistent staples list |
| `item_history` | Purchase history (written by End Trip + add-item flow) |
| `household_invites` | Single-use 48hr invite tokens |
| `suggestion_cache` | Cached rules engine output (JSONB) |
| `suggestion_dismissals` | User dismissals with `resurface_at` |

**Duplicate constraint:**
```sql
CREATE UNIQUE INDEX grocery_items_no_duplicate_unchecked
ON grocery_items (household_id, store_id, LOWER(name))
WHERE checked = false;
```
Enforced at both DB level (unique partial index) and UI level.

**All manual SQL applied** as of 2026-06-21. No pending dashboard actions.

---

## 4. PWA / Web Configuration

### How it works
- Expo with `output: "single"` (SPA mode) does NOT auto-generate a web manifest.
- `public/manifest.json` is served statically by Vercel at `/manifest.json`.
- `app/+html.tsx` injects all necessary `<head>` tags.

### Key `<head>` tags (in `app/+html.tsx`)
```html
<meta name="viewport" content="..., viewport-fit=cover" />
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Grocery List" />
```

### Safe area handling
- `viewport-fit=cover` enables `env(safe-area-inset-*)` CSS variables.
- `#root { padding-top: env(safe-area-inset-top); box-sizing: border-box; }` handles the status bar/Dynamic Island at the root level.
- Tab bar's existing `paddingBottom: insets.bottom` (from `useSafeAreaInsets()`) handles the home indicator — this returns real values only after `viewport-fit=cover` is set.
- **To install as PWA on iPhone:** add to home screen via Safari Share menu; must delete and re-add after manifest changes.

---

## 5. Completed Tickets (against `docs/tasks.md`)

| Ticket | Title | Status |
|---|---|---|
| T-001 | Initialize Expo project | ✅ Done |
| T-002 | Initialize Supabase + connect | ✅ Done |
| T-003 | Database schema — initial migration | ✅ Done |
| T-004 | Row-Level Security policies | ✅ Done (+ several follow-up fixes) |
| T-005 | Auth flow — sign up, sign in, session | ✅ Done |
| T-006 | Household creation and invite flow | ✅ Done |
| T-007 | Store and aisle configuration screen | ✅ Done |
| T-008 | Main tab bar and store tab shell | ✅ Done |
| T-009 | Grocery item list view (read) | ✅ Done |
| T-010 | Check off and uncheck items | ✅ Done |
| T-011 | Add item sheet — typing + inline suggestions | ✅ Done |
| T-012 | Long-press context menu on item | ✅ Done |
| T-013 | End Trip flow | ✅ Done |
| T-014 | Staples list — read view | ✅ Done |
| T-015 | Staples list — add and edit | ✅ Done |
| T-016 | Copy staples to active list | ✅ Done |
| T-017 | Rules engine — Supabase Edge Function | ✅ Done |
| T-018 | Suggestions tab — UI | ✅ Done |
| T-019 | Barcode scanner | ✅ Done |
| T-020 | Voice input | ✅ Done |
| T-021 | Real-time presence indicator | ✅ Done |
| T-022 | Offline queue and sync indicator | ✅ Done |
| T-023 | Item drag-to-reorder within aisle | ✅ Done |
| T-024 | iOS app config and Expo EAS build | ✅ Done |
| T-025 | Web deployment to Vercel | ✅ Done |
| T-026 | Remaining edge case audit | ⚠️ Partial (various defect fixes applied; not a systematic pass) |
| T-027 | Accessibility pass | ❌ Not started |

---

## 6. Defects Fixed (post-milestone)

| Commit | Fix |
|---|---|
| `133f290` | Fix 'add staples' button; fix settings tab clickability |
| `7f9d9b5` | Fix unable-to-create-household defect |
| `cd3f72f` | Fix Supabase recursive RLS policy (infinite recursion on `household_members`) |
| `7c7099f` | Additional household creation fix |
| `9b6ce46` | Continued staples button debugging |
| `37c31cb` | Web compatibility: platform guards for sheets, drag lists, nested buttons |
| `ee64a18` | Fix staples store/aisle mapping defects |
| `5d59bbd` | Fix navigator conflict, missing add button, aisle collapse/expand |
| `3011ece` | Fix display of newly added aisle when adding item |
| `6617a14` | Fix real-time store updates; inline duplicate staple warning |
| `b417204` | Move Suggestions into Settings; add per-store color picker |
| `89b1507` | Improve tab bar active state visibility |
| `bbeec03` | Land on first store after login (instead of suggestions) |
| `18168e0` | Add forgot password and reset password flow |
| `cb548b2` | Fix Realtime channel error caused by session churn on token refresh |
| `b03aeae` | Fix mobile Safari viewport zoom on text input focus |
| `e4766eb` | Fix sign-out button hidden by tab bar; replace invite Alert with toast |
| `3f028d7` | Enable PWA standalone mode (initial attempt) |
| `315c433` | Fix PWA standalone on iOS: add `manifest.json` + Apple meta tags |
| `10d8217` | Fix safe area bleed in PWA standalone mode (`viewport-fit=cover` + `#root` CSS) |
| `979dcd1` | Improve section header visibility across store, staples, and settings pages |
| `72f081f` | Replace per-store tabs with static Lists tab + horizontal chip selector (`lists.tsx`) |
| `29a9a24` | Add per-aisle color theming with 8-color preset palette (`lib/aisleColors.ts`) |
| `fb86c65` | Fix web console warnings; UI polish; propagate store color to StapleSection accent |
| `1101dd2` | Add store deletion with danger confirmation modal (counts items/history, cascade via FK) |
| `6287055` | Fix extra empty space above tab bar on Lists page (StoreView was double-applying `insets.bottom`) |
| `5696d02` | Fix scroll blocked by section header taps (RNGH vs RN gesture system conflict in AisleSection) |
| `aa840de` | Fix fresh-load landing on StoreView instead of Lists chip bar (index.tsx redirect target) |

---

## 7. Pending Actions

### Manual (requires Supabase dashboard)

All manual Supabase steps completed as of 2026-06-21. Nothing pending.

### Code (not yet started)

- **T-026 (edge case audit):** Systematic walk through all 50+ edge cases in `ux-flows.md`. Partial coverage exists but not verified end-to-end.
- **T-027 (accessibility):** `accessibilityLabel` + `accessibilityRole` audit; 44pt tap targets; VoiceOver testing.
- **Dark mode:** Out of scope for v1, per PRD §10.
- **Android support:** Out of scope for v1, per PRD §10.

---

## 8. Known Constraints & Decisions

| Decision | Detail |
|---|---|
| PWA on iOS | iOS Safari ignores the W3C manifest `display` field. Standalone mode requires `<meta name="apple-mobile-web-app-capable" content="yes">`. Expo SPA mode does not auto-generate a manifest; `public/manifest.json` is manually maintained. |
| Safe area on web | `react-native-safe-area-context` returns 0 for all insets on web unless `viewport-fit=cover` is in the viewport meta. Always pair with `box-sizing: border-box` when adding `padding-top` to `#root`. |
| RLS recursion | Supabase recursive policies on `household_members` (querying itself) cause infinite recursion. Fixed by using `auth.uid()` directly or `security definer` functions. |
| Session churn | Supabase's token refresh emits multiple `SIGNED_IN` events. Realtime channels must be deduplicated on the session user ID to avoid recreating subscriptions on every refresh. |
| Unique household per user | `household_members.user_id` has a unique constraint — one user, one household. This is intentional for v1. |
| Service role key | Only used in Supabase Edge Functions (Deno, server-side). Never in client code. |
| Item history writes | Only allowed via End Trip flow (T-013) or the add-item path (T-011). Never written to directly from other UI flows. |
| Gesture system in Lists | `AisleSection` headers use RNGH `TouchableOpacity` (from `react-native-gesture-handler`), not RN `Pressable`. Required because `AisleSection` lives inside `NestableScrollContainer` (also RNGH). Mixing gesture systems causes scroll to lose to taps — both must be in the same system. `StapleSection` uses RN `TouchableOpacity` (native ScrollView context; better `cancelsTouchesInView` than `Pressable`). |
| Safe area inset ownership | The custom tab bar in `app/(app)/_layout.tsx` exclusively owns `paddingBottom: insets.bottom`. Screens rendered inside the `content` View (`flex: 1`, sibling of the tab bar) must NOT apply their own bottom safe area. Adding it there creates double-spacing. |
| Lists landing page | `app/(app)/index.tsx` redirects to `/lists`, not to `/store/[storeId]`. The `lists.tsx` chip-bar view is the canonical Lists landing. The `/store/[storeId]` route still exists for direct store deep-links; the Lists tab highlights for both paths (`listsActive = pathname === '/lists' \|\| pathname.startsWith('/store/')`). |
| Store deletion cascade | Deleting a `stores` row cascades via FK `ON DELETE CASCADE` to `aisles`, `grocery_items`, and `item_history`. `staple_items.default_store_id` uses `ON DELETE SET NULL`. Client code just calls `supabase.from('stores').delete()` and RLS + cascades handle the rest. Danger modal shows live counts of items and history rows that will be lost. |
| Aisle + store colors | Stores and aisles each have a nullable `color TEXT` column. `lib/aisleColors.ts` exports `AISLE_COLORS` (8-color palette) and `getAisleTheme(color)` which returns `{ bg, text, border }` tokens. Staple sections use `store.color` as their left-border accent. `null` color falls back to `#2563eb` (blue). |
