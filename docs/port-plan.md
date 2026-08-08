# Port Plan — Expo/Supabase grocery app → standalone Next.js demo

**Target:** a zero-friction, self-contained list app deployed on Vercel and linked from a
software-developer portfolio. No backend, no accounts, no invite loops.

**Name:** Simple Grocery List — grocery-centric name, chrome, and copy. Nothing in the data
model is grocery-specific, so a user can keep any kind of list in it; the framing just gives
the app a point of view instead of being a generic to-do clone.
**Repo:** `simple-grocery-list`. **Portfolio:** https://www.felipesq.dev

---

## 1. Decisions (settled)

| Area | Decision |
|---|---|
| Framework | Next.js App Router + React + Tailwind + TypeScript strict. Full port off Expo/react-native-web. |
| Backend | **None.** Supabase removed entirely — client, migrations, Edge Function, config. |
| Persistence | `sessionStorage`. Survives refresh and in-app navigation; dies when the tab/browser closes. |
| Auth | Demo sign-in **validated locally**. Real screens, no real account, explicitly labelled. |
| Sharing | None. Single-user, private. Households, members, invites, presence all deleted. |
| Platforms | Web only. `ios/`, EAS, and every native-only dependency removed. |
| Features | Tags + filter, swipe-to-delete, edit sheet, barcode scanning. **Voice input dropped.** |
| Seed data | One populated sample list ("Weekly Shop"), some items checked. |
| Design | Port the existing iOS-system palette faithfully to Tailwind tokens. |
| Components | shadcn/ui for primitives (dialog, sheet, input, button, toast); list UI stays bespoke. |
| Layout | Responsive: stacked phone flow on mobile, two-pane (lists sidebar + item detail) on desktop. |
| Deploy | New GitHub repo + new Vercel project. The live grocery app is untouched. |
| Demo framing | Dismissible "this is a demo" notice + "Back to portfolio" link. |

### Consequence worth knowing up front

`sessionStorage` is **per tab**. Two tabs = two fully independent instances of the app. That
is exactly the "each instance functions as a stand-alone list app" behaviour you asked for,
achieved for free — no tenancy model, no row-level security, no `household_id` on anything.

---

## 2. What this repo currently is, and the hazard

This repo is a byte-copy of `grocery-list-app` and still points at **live** infrastructure:

- `.env.local` → the household app's production Supabase project (ref redacted)
- `.vercel/project.json` → Vercel project `grocery-list-app`
- `git remote origin` → `git@github.com:felipe-sq/grocery-list-app.git`

Nothing in Phase 1 onward may run until Phase 0 severs all three. A `supabase db push` from
this directory today would run destructive migrations against the app your household uses.

---

## 3. Phase 0 — Isolate and archive

No code changes. Do this first, in order.

1. **Salvage the portable files** into `/tmp/salvage/` before anything is deleted. These port
   with little or no change:
   - `hooks/useBarcodeScanner.ts` — a single `fetch` to Open Food Facts, verbatim
   - `constants/Colors.ts` — becomes the CSS custom-property palette
   - `types/index.ts` — becomes the domain types, minus every multi-user field
2. **Archive the Expo version:** `git tag archive/expo-supabase && git branch archive/expo-supabase`.
   The Expo/Supabase implementation stays recoverable and reviewable forever; nothing below
   needs to preserve it in the working tree.
3. **Sever the remotes:** create the new GitHub repo `simple-to-do-list`,
   `git remote set-url origin git@github.com:felipe-sq/simple-grocery-list.git`,
   `rm -rf .vercel`, and delete `.env.local` (no environment variables are needed at all after
   this port — a genuine simplification worth noting on the portfolio).
4. Push the archive branch and tag to the **new** repo, then start `main` from there.

**Gate:** `git remote -v` shows only the new repo, and no `.vercel` or `.env*` file exists.

---

## 4. Phase 1 — Strip Expo, scaffold Next

Delete first, scaffold second. Keeping both stacks in one `package.json` invites
`react-native` / `react-dom` resolution conflicts for no benefit — the archive branch already
holds the old code.

**Delete:** `app/`, `components/`, `hooks/`, `lib/`, `constants/`, `types/`, `supabase/`,
`ios/`, `dist/`, `assets/fonts/`, `app.config.ts`, `app.json`, `eas.json`, `expo-env.d.ts`,
`check.sh`, `.eslintrc.js`, and every `docs/*.md` except this file.

**Drop these dependencies** (all of them): `expo*`, `react-native*`, `@expo/vector-icons`,
`@react-native-*`, `react-native-reanimated`, `react-native-gesture-handler`,
`react-native-mmkv`, `react-native-draggable-flatlist`, `idb`, `@supabase/supabase-js`,
`@types/react-native`.

**Scaffold:** `create-next-app` (App Router, TypeScript, Tailwind, ESLint), then
`shadcn init`. Add `next-themes`, `lucide-react` (replaces `@expo/vector-icons`), `zustand`,
and `motion` (replaces `react-native-reanimated` for layout/gesture animation).

The whole app is client-side; there is no server code, no route handler, and no environment
variable. Keep the root layout as a server component purely for `metadata` and fonts.

**Gate:** `npx tsc --noEmit`, `npm run lint`, and `npm run build` all clean on the bare
scaffold.

---

## 5. Phase 2 — Design tokens and app shell

The existing `ThemeColors` type maps almost 1:1 onto shadcn's token names — `background`,
`foreground`, `card`, `primary`, `muted`, `accent`, `destructive`, `border`, `input` — so the
iOS palette drops straight into shadcn's contract.

1. Port `constants/Colors.ts` into `app/globals.css` as CSS custom properties: the light set
   on `:root`, the dark set under both `.dark` and `@media (prefers-color-scheme: dark)`, then
   expose them to Tailwind via `@theme`. `RADIUS = 12` becomes `--radius`.
2. `next-themes` with `attribute="class"` and `defaultTheme="system"` for a hydration-safe
   system-following theme with a manual override — this is the web-native version of the
   `useColorScheme` split you already fixed once in the Expo app.
3. **Two-pane shell** in `app/(app)/layout.tsx`: a CSS grid that is one column below `md` and
   `[320px_1fr]` above it. On desktop the lists sidebar is always visible and
   `/lists/[id]` fills the right pane; on mobile the same routes behave as today's stacked
   push navigation. One layout, one set of routes, no duplicated screens.

Route map:

```
app/
  layout.tsx              root — theme provider, store provider, demo notice
  page.tsx                → /sign-in when no demo session, else /lists
  (auth)/sign-in|sign-up|reset-password/page.tsx
  (app)/layout.tsx        two-pane shell
  (app)/lists/page.tsx            lists index (sole content on mobile, sidebar+empty on desktop)
  (app)/lists/[id]/page.tsx       item view
  (app)/settings/page.tsx
```

---

## 6. Phase 3 — Domain types and the store

This replaces `HouseholdProvider`, `ListsProvider`, `PresenceProvider`, `useItems`,
`useListCounts`, `useHouseholdMembers`, `useNetworkStatus`, and `lib/offlineQueue.ts` — about
900 lines of realtime/offline/tenancy machinery — with one store of maybe 150.

```ts
type List     = { id, name, color, icon, sortOrder, createdAt }
type ListItem = { id, listId, name, tag, quantity, unit, notes,
                  checked, checkedAt, sortOrder, source, createdAt }
```

Every multi-user field is gone: `household_id`, `created_by`, `checked_by`, `updated_at`,
`pending_sync`, `PresencePayload`, `HouseholdMember`.

**Zustand + `persist`**, with `createJSONStorage(() => sessionStorage)`.

Two things to get right:

- **Hydration.** Reading `sessionStorage` during render breaks SSR. Use `skipHydration: true`
  and `rehydrate()` inside an effect, rendering a skeleton until hydrated. Do not read storage
  in a component body.
- **The duplicate rule.** It previously had two enforcement points, a DB partial index and a UI
  check. The index is gone, so the store's `addItem` is now the *only* place the invariant can
  live — same name (case-insensitive, trimmed) unchecked in the same list is rejected with an
  error string. It must not be re-implemented in a component. The rename path in the edit sheet
  needs the same check, excluding the item being renamed.

**Seeding:** on first hydration with no persisted state, insert one "Weekly Shop" list with
~10 realistic items across Produce / Dairy / Pantry tags, 2–3 already checked. A portfolio
visitor sees a working app in the first second rather than an empty state, and grocery content
makes the quantity/unit fields and the barcode scanner self-explanatory without any copy.

**Cold deep link:** `/lists/<id>` opened in a fresh tab hydrates to seed data that has no such
id. Redirect to `/lists` rather than rendering a blank pane or throwing.

---

## 7. Phase 4 — Demo auth

Keep the three screens as a UI showcase, and be straightforward about what they are.

- Accept any well-formed email and a password of 6+ characters. Store `{ email, displayName }`
  in the session store. **Never store the password**, hashed or otherwise — there is nothing to
  authenticate against, so storing it would be pure liability.
- Every auth screen carries a persistent line: *"Demo — no account is created and nothing is
  sent to a server."* An unlabelled fake login on a public site reads as either broken or
  deceptive; labelled, it reads as a deliberate UI demonstration.
- `sign-up` and `reset-password` show their success states without sending anything.
- The route guard becomes a small client check in `(app)/layout.tsx`: no session → redirect to
  `/sign-in`. This replaces the three-way `segments`-based guard in the old root layout.
- Replace the current Settings copy *"Privacy — your data is securely stored"*. It is false
  here, and it is exactly the sort of line a reviewer notices. Use an honest About section
  naming the stack, plus the portfolio link.

---

## 8. Phase 5–6 — Lists and items UI

Structure and props carry over from the existing components; the markup is rewritten as DOM
with Tailwind. Behaviour to preserve as-is: optimistic check-off with animated reordering,
the completed section with "Clear all", tag chips as filters, long-press/context actions for
rename and delete, and the confirm dialogs before anything destructive.

Two things RN gave for free that need real web work:

- **Swipe-to-delete** used `react-native-gesture-handler`. Rebuild with `motion`'s drag on the
  row, constrained to the x-axis with a snap-back. Then add a **desktop affordance** — a delete
  button revealed on hover *and* reachable by keyboard. A swipe-only delete is unusable with a
  mouse, and most portfolio visitors are on a laptop.
- **Modal sheets** used a custom `SheetModal`. Use shadcn's `Sheet` on mobile and `Dialog` on
  desktop; both bring the focus trap, escape handling, and ARIA wiring that the RN version
  approximated with `accessibilityRole`/`accessibilityLabel`.

Port those existing `accessibilityLabel`/`accessibilityRole` props into real ARIA rather than
dropping them — the old code is a usable checklist, and a 100 Lighthouse accessibility score is
visible quality on a portfolio piece.

---

## 9. Phase 7 — Barcode scanning

With the grocery framing restored, barcode scanning is a natural first-class feature rather than
an oddity to justify: scan a product, get its name prefilled, add it to the list. It is also the
single most distinctive thing in the demo, so it is worth the implementation cost.

Voice input is **dropped**. Do not port `hooks/useSpeech.ts`, `useSpeech.ios.ts`,
`useSpeech.web.ts`, `lib/parseVoiceInput.ts`, `components/ListeningOverlay.tsx`, or
`components/VoiceReviewSheet.tsx`. That removes roughly 600 lines, a microphone-permission
prompt, and the Firefox support gap. The whole platform-split convention (`.ios.ts` / `.web.ts`)
goes with it and has no meaning in a web-only app.

`expo-camera` is gone. Use `getUserMedia` for the stream, then:

1. Native `BarcodeDetector` where available (Chrome, Edge, Android) — zero bundle cost.
2. `@zxing/browser` fallback for Safari and Firefox, **dynamically imported** (`await import`)
   so its ~200 KB decoder only loads when someone actually taps Scan.
3. No `getUserMedia`, or a denied permission → the Scan button is not rendered. Degrade by
   hiding; a button that throws is worse than no button.

The Open Food Facts lookup in `useBarcodeScanner` is CORS-enabled and ports verbatim. A camera
needs a secure context; Vercel provides HTTPS and `localhost` counts as secure, so dev works.

---

## 10. Phase 8 — Demo framing, performance, metadata

- Dismissible top banner on first load (dismissal in `sessionStorage`): data lives in this
  browser tab only and is lost when it closes.
- "Back to portfolio" link to https://www.felipesq.dev in the header or Settings, so the demo
  is not a dead end.
- `metadata` with a real title, description, and OG image — this URL will be shared.
- Verify the bundle actually got smaller. The whole point of leaving react-native-web was load
  time: check that `lucide-react` tree-shakes, that `motion` is not pulled into the initial
  chunk, and that zxing stays in a lazy chunk.
- Sanity-check in Chrome, Safari, and Firefox, at phone and laptop widths, with keyboard-only
  navigation.

---

## 11. Phase 9 — Docs and deploy

Rewrite `CLAUDE.md`, `AGENTS.md`, and `README.md` from scratch. The current versions describe a
Supabase-backed household app and would actively mislead any future session — every rule about
RLS, `household_id` scoping, service-role keys, migrations, offline queues, and platform splits
is now obsolete. The rules worth carrying forward: TypeScript strict with no `any`, functional
components, named exports, path aliases, components under 200 lines, props interfaces at the
top of the file, and the duplicate-item rule (now noting the store as its single enforcement
point).

Replace `check.sh` with `npm run check` = `tsc --noEmit && next lint && next build`. The old
script's Supabase-migration and service-role-key checks no longer apply.

Then link the new Vercel project and deploy. No environment variables to configure.

---

## 12. Completion criteria

Replaces the Supabase-era checklist in `CLAUDE.md`:

1. `npx tsc --noEmit` clean, no `any`
2. `next lint` clean
3. `next build` succeeds
4. No `console.error` on the happy path
5. Loads and works in Chrome, Safari, and Firefox; the Scan button is hidden, not broken, where
   the camera is unsupported or denied
6. Usable at 375px and 1440px; full keyboard navigation; Lighthouse accessibility 100
7. A hard refresh preserves lists; closing the tab clears them
8. Duplicate unchecked items are blocked on both add and rename

---

## 13. Open items for you

Nothing outstanding. The existing grocery-cart icons in `assets/images/` now fit the product and
carry over as the favicon and OG image — note that Phase 1's delete list deliberately leaves
`assets/images/` in place while removing `assets/fonts/`.

The only soft call is the name itself: "Simple Grocery List" follows the pattern you'd been
using and stays clear of your existing `grocery-list-app` repo. Say the word if you want a
different one — it appears in `package.json`, the page metadata, and the sign-in header, and
nowhere else.
