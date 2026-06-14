# CLAUDE.md — Household Grocery List App

This file is read by Claude Code at the start of every session. Follow all instructions here throughout the session.

---

## Project Overview

A real-time collaborative grocery list app for a household of 3–4 people.
- **Platforms:** iOS (via Expo / React Native) + Web (via Expo Web)
- **Backend:** Supabase (Postgres + Realtime + Auth + Edge Functions + RLS)
- **Language:** TypeScript (strict mode)
- **Routing:** Expo Router (file-based, `app/` directory)

Full spec: see `docs/prd.md`, `docs/ux-flows.md`, `docs/tasks.md`

---

## Stack & Key Libraries

| Layer | Library | Notes |
|---|---|---|
| Framework | Expo SDK (latest) + Expo Router | File-based routing; use `app/` dir |
| UI | React Native core components | No UI kit — custom components only |
| DB / Auth / Realtime | `@supabase/supabase-js` v2 | Use service role key only in Edge Functions |
| Bottom sheets | `@gorhom/bottom-sheet` | For Add Item and all modal sheets |
| Drag-to-reorder | `react-native-draggable-flatlist` | Aisles + items within aisles |
| Offline storage | `react-native-mmkv` (native) / `idb` (web) | Offline mutation queue |
| Network status | `@react-native-community/netinfo` | Reconnect trigger for offline flush |
| Camera / Barcode | `expo-camera` | Barcode scanning; works on web via WebRTC |
| Speech (iOS) | `expo-speech-recognition` | Wraps SFSpeechRecognizer |
| Speech (Web) | `window.SpeechRecognition` | Use platform file: `speech.web.ts` |
| Animations | `react-native-reanimated` | Required by draggable-flatlist |

---

## Project Structure

```
/
├── app/                    # Expo Router pages
│   ├── (auth)/             # Auth screens (sign-in, sign-up)
│   ├── (app)/              # Main app (requires auth)
│   │   ├── _layout.tsx     # Tab bar layout (dynamic store tabs)
│   │   ├── store/
│   │   │   └── [storeId].tsx
│   │   ├── suggestions.tsx
│   │   ├── staples.tsx
│   │   └── settings/
│   │       └── stores.tsx
├── components/             # Shared UI components
├── lib/
│   ├── supabase.ts         # Supabase client singleton
│   ├── offlineQueue.ts     # Offline mutation queue
│   └── rules/              # Suggestion rules engine (Edge Function source)
├── supabase/
│   ├── migrations/         # SQL migration files
│   └── functions/
│       └── suggestions/    # Edge Function (Deno)
├── hooks/                  # Custom React hooks
├── types/                  # Shared TypeScript types
├── docs/                   # PRD, UX flows, task breakdown
└── CLAUDE.md               # This file
```

---

## Coding Standards

### General
- TypeScript strict mode — no `any`, no implicit returns on non-void functions
- Functional components only — no class components
- Named exports for components; default exports for Expo Router pages
- Absolute imports via `tsconfig.json` path aliases (`@/components/...`, `@/lib/...`, etc.)

### Supabase
- Never use the Supabase service role key in client-side code — only in Edge Functions (Deno, server-side)
- Always scope queries with `household_id` — never fetch data without this filter
- Use RLS as the security layer, not application-level filtering alone
- Realtime subscriptions: set up in `useEffect`, clean up on unmount with `channel.unsubscribe()`

### State & Data
- Server state via Supabase queries — do not duplicate in global state
- Optimistic updates: apply locally first, then write to DB; revert on error
- Offline queue: any mutation that could be made offline must go through `offlineQueue.enqueue()`

### Platform splits
- Files ending in `.ios.ts` / `.web.ts` are platform-specific — Expo auto-selects them
- Use this pattern for: speech recognition, any Web-only API, any native-only API
- Shared interface must be defined in the base file (e.g., `speech.ts` exports the type; platform files implement it)

### Components
- Keep components under 200 lines — split into sub-components if longer
- Props interfaces defined at top of file, above the component
- No inline styles — use `StyleSheet.create()` for React Native, or a `styles` object

---

## Forbidden Actions

- **Never** commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` in client code
- **Never** use `any` type — find the correct type or create one in `types/`
- **Never** delete existing migration files — always create new migrations
- **Never** bypass RLS by using the service role key on the client
- **Never** write to `item_history` directly from the UI — only via End Trip (T-013) or add-item flow (T-011)
- **Never** skip the duplicate check when adding items to a grocery list or copying from staples

---

## Database

Schema is in `supabase/migrations/`. Key tables:
- `grocery_items` — active shopping list items (per store)
- `staple_items` — persistent household staples
- `item_history` — purchase history; source of truth for suggestions
- `suggestion_cache` — cached rules engine output (JSONB)
- `household_invites` — single-use invite tokens (48hr expiry)

**Duplicate rule:** a `grocery_item` with the same `name` (case-insensitive) and `store_id` as an existing unchecked item must be hard-blocked — at both the DB level (unique partial index) and UI level.

```sql
-- Add this to migration for grocery_items:
CREATE UNIQUE INDEX grocery_items_no_duplicate_unchecked
ON grocery_items (household_id, store_id, LOWER(name))
WHERE checked = false;
```

---

## Environment Variables

Required in `.env.local` (never committed):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Edge Functions only — never in app code
```

---

## Completion Criteria for Any Ticket

Before marking a ticket done, verify:
1. TypeScript compiles with no errors (`npx tsc --noEmit`)
2. App runs on iOS simulator (`expo start --ios`) without crash
3. App runs in web browser (`expo start --web`) without crash
4. The specific edge cases listed in the ticket are handled
5. No `console.error` outputs during the happy path
6. Any new Supabase table or column has a corresponding migration file

---

## Reference Docs (open these when relevant)

- Expo Router: https://docs.expo.dev/router/introduction/
- Expo Router dynamic routes: https://docs.expo.dev/router/advanced/dynamic-routes/
- Expo Router tab layout: https://docs.expo.dev/router/advanced/tabs/
- Supabase JS v2 + Expo setup: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Supabase Presence: https://supabase.com/docs/guides/realtime/presence
- Supabase Edge Functions (Deno): https://supabase.com/docs/guides/functions
- Open Food Facts API: https://openfoodfacts.github.io/openfoodfacts-server/api/
- expo-camera barcode: https://docs.expo.dev/versions/latest/sdk/camera/
- expo-speech-recognition: https://docs.expo.dev/versions/latest/sdk/speech/
- react-native-draggable-flatlist: https://github.com/computerjazz/react-native-draggable-flatlist
- @gorhom/bottom-sheet: https://gorhom.dev/react-native-bottom-sheet/
- Claude Code docs: https://docs.claude.com/en/docs/claude-code/overview
