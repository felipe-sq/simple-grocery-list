# Claude Code Workflow Guide — Grocery App

## Setup (one-time)

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```
Requires Node.js 18+. Verify: `claude --version`
Docs: https://docs.claude.com/en/docs/claude-code/overview

### 2. Create your project folder
```bash
mkdir grocery-app && cd grocery-app
```
Copy `CLAUDE.md` into this folder. Copy `docs/` folder (prd.md, ux-flows.md, tasks.md) into it too.

### 3. Start Claude Code
```bash
claude
```
Claude Code reads `CLAUDE.md` automatically on startup. You're ready.

---

## The Ticket Loop

For each ticket, you run one `/goal` command. Claude Code works autonomously until the completion condition is met, then hands control back to you for review.

### The prompt template

Copy this, fill in the bracketed sections, paste into Claude Code:

```
/goal [COMPLETION CONDITION — see per-ticket version below]

## Ticket: [TICKET-ID] — [TICKET TITLE]

### Context
Read the full task spec in docs/tasks.md, ticket [TICKET-ID].
Read docs/prd.md §[RELEVANT SECTIONS] for data schema and feature spec.
Read docs/ux-flows.md Flow [N] for wireframes and edge cases.
CLAUDE.md has coding standards, forbidden actions, and reference doc links.

### Task
[PASTE THE FULL TICKET TEXT FROM tasks.md HERE]

### Reference docs for this ticket
[PASTE THE RELEVANT LINKS FROM THE PER-TICKET LIST BELOW]

### Completion condition (same as /goal above)
[COMPLETION CONDITION]
```

---

## Per-Ticket `/goal` Commands and Reference Links

Use the prompt template above for each ticket. Fill in the `/goal` condition and reference links from this list.

---

### M0 — Scaffolding

**T-001 · Initialize Expo project**
```
/goal T-001 is complete: `expo start --web` and `expo start --ios` both launch without errors, TypeScript strict mode is enabled, ESLint and Prettier are configured, and no type errors exist (`npx tsc --noEmit` passes).
```
Links:
- https://docs.expo.dev/get-started/create-a-project/
- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev/guides/typescript/

---

**T-002 · Supabase client setup**
```
/goal T-002 is complete: `lib/supabase.ts` exists with a working client singleton, the app connects to Supabase on both iOS simulator and web browser, and a smoke-test query succeeds without errors.
```
Links:
- https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- https://supabase.com/docs/reference/javascript/introduction

---

**T-003 · Database schema migration**
```
/goal T-003 is complete: a single SQL migration file exists in `supabase/migrations/`, all tables defined in docs/prd.md §5 and §12.2 are created in Supabase with correct types, foreign keys, and indexes, and `supabase db push` runs without errors.
```
Links:
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/cli/local-development
- https://supabase.com/docs/guides/database/tables

---

**T-004 · Row-Level Security**
```
/goal T-004 is complete: RLS is enabled on all tables, policies are applied so that queries from a test user only return rows belonging to their household, and a policy audit confirms no table is readable without household membership.
```
Links:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/row-level-security#policies-with-joins

---

**T-005 · Auth flow**
```
/goal T-005 is complete: a user can sign up with email/password, sign in, see the main app shell, and have their session persist after closing and reopening the app on both iOS simulator and web.
```
Links:
- https://supabase.com/docs/guides/auth/social-login
- https://supabase.com/docs/guides/auth/sessions
- https://docs.expo.dev/router/reference/authentication/

---

**T-006 · Household creation and invite flow**
```
/goal T-006 is complete: a new authenticated user with no household is prompted to create or join one; a household creator can generate a copy-paste invite link; a second test user can join via the link; both users share the same household_id in household_members.
```
Links:
- https://docs.expo.dev/guides/deep-linking/
- https://supabase.com/docs/guides/database/postgres/row-level-security

---

### M1 — Core List

**T-007 · Store and aisle configuration**
```
/goal T-007 is complete: the settings screen at app/(app)/settings/stores.tsx allows creating up to 3 stores, adding/renaming/reordering up to 10 aisles per store, all changes persist in Supabase, and edge cases EC8-1 through EC8-7 are handled as specified in docs/ux-flows.md Flow 8.
```
Links:
- https://github.com/computerjazz/react-native-draggable-flatlist
- https://docs.expo.dev/router/advanced/stack/

---

**T-008 · Tab bar and store tab shell**
```
/goal T-008 is complete: the main app renders a bottom tab bar with one dynamic tab per store (from the DB) plus Suggestions and Staples tabs; tabs update in real time if a store is added or renamed; each store tab renders a placeholder screen.
```
Links:
- https://docs.expo.dev/router/advanced/tabs/
- https://docs.expo.dev/router/advanced/dynamic-routes/
- https://supabase.com/docs/guides/realtime/postgres-changes

---

**T-009 · Grocery item list view**
```
/goal T-009 is complete: each store tab renders grocery items grouped by aisle with correct sort order, checked items appear with strikethrough and faded at the bottom of their aisle, aisle headers show X of Y counts, auto-collapse works when all items in an aisle are checked, and a Realtime subscription updates the list live.
```
Links:
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://docs.expo.dev/versions/latest/react-native/sectionlist/

---

**T-010 · Check off and uncheck items**
```
/goal T-010 is complete: tapping an item's circle checks or unchecks it with an optimistic update, the change syncs via Supabase Realtime to other devices, and edge cases EC4-1 (uncheck reverses) and EC4-7 (offline) are handled.
```
Links:
- https://supabase.com/docs/reference/javascript/update
- https://supabase.com/docs/guides/realtime

---

**T-011 · Add item sheet — typing + suggestions**
```
/goal T-011 is complete: the Add Item bottom sheet opens from the + button, inline suggestions appear while typing from item_history, the duplicate hard-block (EC1-3) is enforced at both DB and UI level, all fields save correctly to grocery_items and item_history, and edge cases EC1-2 through EC1-7 are handled.
```
Links:
- https://gorhom.dev/react-native-bottom-sheet/
- https://supabase.com/docs/reference/javascript/insert
- https://supabase.com/docs/guides/database/postgres/row-level-security

---

**T-012 · Long-press context menu**
```
/goal T-012 is complete: long-pressing a grocery item shows a context menu with Edit, Move to aisle, and Delete options; all three actions work correctly and sync to Supabase.
```
Links:
- https://reactnative.dev/docs/pressable (use onLongPress)

---

**T-013 · End Trip flow**
```
/goal T-013 is complete: each store tab has an End Trip button scoped to that store; tapping it shows a confirmation modal listing checked and unchecked items; confirming clears checked items, writes them to item_history, and syncs to all devices; edge cases EC5-1 through EC5-7 are handled.
```
Links:
- https://supabase.com/docs/reference/javascript/delete
- https://supabase.com/docs/reference/javascript/insert

---

### M2 — Staples & Suggestions

**T-014 · Staples list read view**
```
/goal T-014 is complete: the Staples tab renders all staple_items grouped by default store, search filters rows client-side in real time, a Realtime subscription keeps the list live, and the empty state is shown when no staples exist.
```
Links:
- https://supabase.com/docs/guides/realtime/postgres-changes

---

**T-015 · Staples add and edit**
```
/goal T-015 is complete: users can add, edit, and delete staple items; all edge cases EC7-1 through EC7-5 are handled; changes sync via Supabase Realtime.
```
Links:
- https://supabase.com/docs/reference/javascript/upsert

---

**T-016 · Copy staples to active list**
```
/goal T-016 is complete: selection mode works on the Staples tab, items can be copied to a target store list, duplicates are hard-blocked before copy with "Already on list" labels (EC6-2), and all edge cases EC6-1 through EC6-6 are handled.
```
Links:
- https://supabase.com/docs/reference/javascript/insert

---

**T-017 · Rules engine Edge Function**
```
/goal T-017 is complete: the Supabase Edge Function at supabase/functions/suggestions/index.ts implements all 4 rules from docs/prd.md §12.3, writes output to suggestion_cache as JSONB, can be invoked with `supabase functions serve` locally, and returns correctly scored and ranked results given seeded test data.
```
Links:
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/auth
- https://deno.com/manual (Edge Functions run Deno, not Node)

---

**T-018 · Suggestions tab UI**
```
/goal T-018 is complete: the Suggestions tab fetches from suggestion_cache (or invokes the Edge Function if stale), renders two sections with add and dismiss actions, dismissed items write to suggestion_dismissals, and the graceful empty state is shown when insufficient history exists.
```
Links:
- https://supabase.com/docs/reference/javascript/select
- https://supabase.com/docs/guides/functions/http-filters

---

### M3 — Voice & Barcode

**T-019 · Barcode scanner**
```
/goal T-019 is complete: the barcode scanner opens from the 📷 button on iOS and web, scans UPC/EAN codes, looks up product names from Open Food Facts (with local history cache fallback), pre-fills the Add Item sheet, and edge cases EC3-1 through EC3-7 are handled.
```
Links:
- https://docs.expo.dev/versions/latest/sdk/camera/
- https://openfoodfacts.github.io/openfoodfacts-server/api/
- https://world.openfoodfacts.org/api/v2/product/{barcode}.json (API endpoint pattern)

---

**T-020 · Voice input**
```
/goal T-020 is complete: the 🎤 button opens a listening overlay on iOS (using expo-speech-recognition) and web (using Web Speech API), transcribed speech is parsed into item cards with quantity and unit extraction, the review screen allows editing and deselecting items before adding, and edge cases EC2-1 through EC2-7 are handled.
```
Links:
- https://docs.expo.dev/versions/latest/sdk/speech/
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API (web speech)
- https://docs.expo.dev/router/advanced/platform-specific-modules/ (platform file splits)

---

### M4 — Presence & Polish

**T-021 · Presence indicator**
```
/goal T-021 is complete: when a household member opens a store tab, other members see a presence indicator (name or avatar) on that store's tab; presence clears when the user leaves the tab or backgrounds the app.
```
Links:
- https://supabase.com/docs/guides/realtime/presence

---

**T-022 · Offline queue and sync**
```
/goal T-022 is complete: all mutations (add, check, delete, end trip, add staple, dismiss suggestion) are queued offline when the network is unavailable, synced in FIFO order on reconnect, and unsynced items show a ⚠ indicator; the offline badge appears on the store tab header when offline.
```
Links:
- https://github.com/mrousavy/react-native-mmkv
- https://github.com/jakearchibald/idb
- https://github.com/react-native-netinfo/react-native-netinfo

---

**T-023 · Item drag-to-reorder**
```
/goal T-023 is complete: items within an aisle can be reordered by drag; new sort_order values are written to Supabase on drop and sync to other devices.
```
Links:
- https://github.com/computerjazz/react-native-draggable-flatlist

---

**T-024 · iOS EAS build**
```
/goal T-024 is complete: the app builds successfully via `eas build --platform ios --profile development`, installs on a physical iPhone, and camera and microphone permission prompts work correctly.
```
Links:
- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/guides/permissions/

---

**T-025 · Vercel web deployment**
```
/goal T-025 is complete: the web build deploys to Vercel, the app is accessible in a browser, environment variables are configured, and barcode scanning and voice input work in Chrome.
```
Links:
- https://docs.expo.dev/distribution/publishing-websites/
- https://vercel.com/docs/deployments/overview

---

### M5 — Hardening

**T-026 · Edge case audit**
```
/goal T-026 is complete: every edge case in docs/ux-flows.md has been tested manually; all unimplemented cases are fixed; a brief audit log exists in docs/edge-case-audit.md noting the status of each edge case.
```

---

**T-027 · Accessibility pass**
```
/goal T-027 is complete: all interactive elements have accessibilityLabel and accessibilityRole, tap targets are ≥ 44×44pt, color contrast passes WCAG AA, and the check-off and add-item flows are navigable with VoiceOver enabled.
```
Links:
- https://reactnative.dev/docs/accessibility
- https://docs.expo.dev/guides/accessibility/

---

## Tips for Working with Claude Code

**Use `/goal` for autonomous runs.** It sets a completion condition; a separate evaluator model (Haiku) checks after each turn whether the condition is met. Claude keeps working until it is. You don't need to prompt each step.
Source: https://aiagentsfirst.com/claude-code-goal-command-tutorial

**Set a token ceiling on longer tickets** to prevent runaway sessions:
```
/goal --tokens 200K [your completion condition here]
```

**CLAUDE.md persists across sessions but can drift after long runs.** If you notice Claude Code ignoring a rule mid-session, type `/reset` to reload `CLAUDE.md` from scratch.

**Use `/rewind` if a change goes wrong.** Claude Code checkpoints before edits. Press Escape twice or type `/rewind` to roll back.

**One ticket per session** is the right granularity. Starting a new `claude` session per ticket keeps context clean and avoids compaction drift on longer milestones.

**For review:** after Claude Code hands back control, your checklist is:
1. `npx tsc --noEmit` — no type errors
2. `expo start --ios` — runs on simulator
3. `expo start --web` — runs in browser
4. Walk the happy path manually
5. Test 2–3 edge cases from the ticket
6. If anything is wrong: describe the issue and let Claude Code fix it in the same session before closing

**Starting the next ticket:** open a fresh `claude` session (`exit` then `claude` again). CLAUDE.md loads fresh. Paste the next ticket's prompt template.
