# Port record — Expo/Supabase grocery app → standalone Next.js demo

This is the decision log for the port that produced this repo. It is kept as written work
rather than tidied away, because most of what is interesting about this project is in the
decisions rather than the diff.

**Origin:** a byte-copy of `grocery-list-app`, a Supabase-backed, household-shared Expo/React
Native app. That implementation is preserved unchanged on the `archive/expo-supabase` branch
and tag.

**Target:** a zero-friction, self-contained list app deployed on Vercel and linked from
https://www.felipesq.dev. No backend, no accounts, no invite loops.

---

## 1. Decisions

| Area | Decision |
|---|---|
| Framework | Next.js App Router + React + Tailwind + TypeScript strict. Full port off Expo/react-native-web. |
| Backend | **None.** Supabase removed entirely — client, migrations, Edge Function, config. |
| Persistence | `sessionStorage`. Survives refresh and in-app navigation; dies when the tab closes. |
| Auth | Demo sign-in **validated locally**. Real screens, no real account, explicitly labelled. |
| Sharing | None. Single-user, private. Households, members, invites, presence all deleted. |
| Platforms | Web only. `ios/`, EAS, and every native-only dependency removed. |
| Features | Tags + filter, swipe-to-delete, edit sheet, barcode scanning. **Voice input dropped.** |
| Seed data | One populated sample list ("Weekly Shop"), some items checked. |
| Design | Port the existing iOS-system palette faithfully to Tailwind tokens. |
| Components | shadcn/ui for primitives; list UI stays bespoke. |
| Layout | Responsive: stacked phone flow on mobile, two-pane (lists sidebar + item detail) on desktop. |
| Deploy | New GitHub repo + new Vercel project. The live household app untouched. |
| Demo framing | Dismissible "this is a demo" notice + "Back to portfolio" link. |

**The name.** "Simple Grocery List" — grocery-centric name, chrome, and copy. Nothing in the
data model is grocery-specific, so any kind of list works; the framing just gives the app a
point of view instead of making it a generic to-do clone. It also stays clearly distinct from
the existing `grocery-list-app` repo.

### A consequence worth stating up front

`sessionStorage` is **per tab**. Two tabs are two fully independent instances of the app. That
is exactly the stand-alone-instance behaviour this demo needed, and I got it for free — no
tenancy model, no row-level security, no `household_id` on anything.

---

## 2. The starting point, and the hazard in it

The repo began as a byte-copy, which meant it still pointed at **live** infrastructure:

- `.env.local` → the production Supabase project of the original app (ref since scrubbed from history)
- `.vercel/project.json` → the Vercel project `grocery-list-app`
- `git remote origin` → `git@github.com:felipe-sq/grocery-list-app.git`

Nothing past Phase 0 could safely run until all three were severed. A `supabase db push` from
this directory would have run destructive migrations against a live production database. I
treated this as the blocking first task rather than something to clean up later.

---

## 3. Phase 0 — Isolate and archive

No code changes, done first and in order.

1. **Salvage the portable files** before deleting anything. Three ported with little or no
   change: `hooks/useBarcodeScanner.ts` (a single `fetch` to Open Food Facts, verbatim),
   `constants/Colors.ts` (became the CSS custom-property palette), and `types/index.ts`
   (became the domain types, minus every multi-user field).
2. **Archive the Expo version:** `git tag archive/expo-supabase && git branch archive/expo-supabase`,
   so the original stays recoverable and reviewable and nothing below needed to preserve it in
   the working tree.
3. **Sever the remotes:** point `origin` at the new `simple-grocery-list` repo, `rm -rf .vercel`,
   and delete `.env.local`. No environment variables are needed at all after this port — a
   genuine simplification, and one worth naming on a portfolio.
4. Push the archive branch and tag to the **new** repo, then start `main` from there.

**Gate:** `git remote -v` showing only the new repo, and no `.vercel` or `.env*` file present.

---

## 4. Phase 1 — Strip Expo, scaffold Next

Delete first, scaffold second. Keeping both stacks in one `package.json` invites
`react-native` / `react-dom` resolution conflicts for no benefit — the archive branch already
held the old code.

**Deleted:** `app/`, `components/`, `hooks/`, `lib/`, `constants/`, `types/`, `supabase/`,
`ios/`, `dist/`, `assets/fonts/`, `app.config.ts`, `app.json`, `eas.json`, `expo-env.d.ts`,
`check.sh`, `.eslintrc.js`, and every `docs/*.md` except this file. `assets/images/` stayed —
the existing grocery-cart icons fit the product and carried over as the favicon and OG image.

**Dependencies dropped** (all of them): `expo*`, `react-native*`, `@expo/vector-icons`,
`@react-native-*`, `react-native-reanimated`, `react-native-gesture-handler`,
`react-native-mmkv`, `react-native-draggable-flatlist`, `idb`, `@supabase/supabase-js`,
`@types/react-native`.

**Scaffold:** `create-next-app` (App Router, TypeScript, Tailwind, ESLint), then `shadcn init`.
Added `next-themes`, `lucide-react` (replacing `@expo/vector-icons`), `zustand`, and `motion`
(replacing `react-native-reanimated` for layout and gesture animation).

The whole app is client-side: no server code, no route handler, no environment variable. The
root layout stays a server component purely for `metadata` and fonts.

**Gate:** `tsc --noEmit`, lint, and build all clean on the bare scaffold.

---

## 5. Phase 2 — Design tokens and app shell

The old `ThemeColors` type mapped almost 1:1 onto shadcn's token names — `background`,
`foreground`, `card`, `primary`, `muted`, `accent`, `destructive`, `border`, `input` — so the
iOS palette dropped straight into shadcn's contract.

1. `constants/Colors.ts` became CSS custom properties in `app/globals.css`: the light set on
   `:root`, the dark set under both `.dark` and `@media (prefers-color-scheme: dark)`, then
   exposed to Tailwind via `@theme inline`. `RADIUS = 12` became `--radius: 0.75rem`.
2. `next-themes` with `attribute="class"` and `defaultTheme="system"`, for a hydration-safe
   system-following theme with a manual override. This is the web-native version of the
   `useColorScheme` split the Expo app had already needed fixing once.
3. **Two-pane shell** in `app/(app)/layout.tsx`: a CSS grid that is one column below `md` and
   a clamped sidebar plus fluid detail pane above it. On desktop the lists sidebar is always
   visible and `/lists/[id]` fills the right pane; on mobile the same routes behave as stacked
   push navigation. One layout, one set of routes, no duplicated screens.

Route map:

```
app/
  layout.tsx              root — metadata, fonts, providers, toaster
  page.tsx                → /sign-in when no demo session, else /lists
  (auth)/sign-in|sign-up|reset-password/page.tsx
  (app)/layout.tsx        two-pane shell + route guard
  (app)/lists/page.tsx            lists index (sole content on mobile, sidebar + empty on desktop)
  (app)/lists/[id]/page.tsx       item view
  (app)/settings/page.tsx
```

---

## 6. Phase 3 — Domain types and the store

This replaced `HouseholdProvider`, `ListsProvider`, `PresenceProvider`, `useItems`,
`useListCounts`, `useHouseholdMembers`, `useNetworkStatus`, and `lib/offlineQueue.ts` — about
900 lines of realtime, offline, and tenancy machinery — with one store of roughly 150.

```ts
type List     = { id, name, color, icon, sortOrder, createdAt }
type ListItem = { id, listId, name, tag, quantity, unit, notes,
                  checked, checkedAt, sortOrder, source, createdAt }
```

Every multi-user field is gone: `household_id`, `created_by`, `checked_by`, `updated_at`,
`pending_sync`, `PresencePayload`, `HouseholdMember`.

**Zustand + `persist`**, with `createJSONStorage(() => sessionStorage)`.

Two things I had to get right:

- **Hydration.** Reading `sessionStorage` during render breaks SSR. The store uses
  `skipHydration: true` and rehydrates in an effect, and components render a skeleton until
  hydrated. Storage is never read in a component body. The hydration and mount flags are
  exposed through `useSyncExternalStore` rather than `useState` in an effect, which keeps them
  SSR-correct and satisfies the React Compiler's `set-state-in-effect` rule.
- **The duplicate rule.** It previously had two enforcement points: a Postgres unique partial
  index and a UI check. The index went with the database, so the store's `addItem` is now the
  *only* place the invariant can live — the same name (case-insensitive, trimmed) unchecked in
  the same list is rejected with an error string. It must not be re-implemented in a component.
  The rename path carries the same check, excluding the item being renamed.

**Seeding:** on first hydration with no persisted state, one "Weekly Shop" list is inserted with
~10 realistic items across Produce / Dairy / Pantry tags, 2–3 already checked. A portfolio
visitor sees a working app within the first second instead of an empty state, and grocery
content makes the quantity, unit, and barcode features self-explanatory without any copy.

**Cold deep link:** `/lists/<id>` opened in a fresh tab hydrates to seed data containing no such
id. That redirects to `/lists` rather than rendering a blank pane or throwing.

---

## 7. Phase 4 — Demo auth

The three screens are kept as a UI showcase, and are straightforward about what they are.

- Any well-formed email and a password of 6+ characters is accepted; `{ email, displayName }`
  goes into the session store. **The password is never stored**, hashed or otherwise — there is
  nothing to authenticate against, so storing one would be pure liability.
- Every auth screen carries a persistent line: *"Demo — no account is created and nothing is
  sent to a server."* An unlabelled fake login on a public site reads as either broken or
  deceptive; labelled, it reads as a deliberate UI demonstration.
- `sign-up` and `reset-password` show their success states without sending anything.
- The route guard is a small client check in `(app)/layout.tsx`: no session → redirect to
  `/sign-in`. It waits for hydration before deciding. This replaced the three-way
  `segments`-based guard in the old root layout.
- The old Settings copy — *"Privacy — your data is securely stored"* — is gone. It would have
  been false here, and it is exactly the sort of line a reviewer notices. An honest About
  section names the stack and links back to the portfolio.

---

## 8. Phase 5–6 — Lists and items UI

Structure and props carried over from the existing components; the markup was rewritten as DOM
with Tailwind. Behaviour preserved as-is: optimistic check-off with animated reordering, the
completed section with "Clear all", tag chips as filters, context actions for rename and
delete, and confirm dialogs before anything destructive.

Two things React Native gave for free that needed real web work:

- **Swipe-to-delete** used `react-native-gesture-handler`. Rebuilt with `motion`'s drag on the
  row, constrained to the x-axis with a snap-back. That alone is unusable with a mouse and
  invisible to a keyboard, and most portfolio visitors are on a laptop — so the row body is
  also a button that opens the edit dialog, and the dialog carries Delete. Desktop additionally
  gets hover-revealed controls. Every destructive action has a keyboard path.
- **Modal sheets** used a custom `SheetModal`, replaced with shadcn's `Dialog` — which brings
  the focus trap, escape handling, and ARIA wiring the RN version approximated with
  `accessibilityRole` and `accessibilityLabel`. (`ui/sheet.tsx` was installed during the port
  and ended up unused; `Dialog` covered both breakpoints.)

The old `accessibilityLabel` and `accessibilityRole` props were ported into real ARIA rather
than dropped — the old code was a usable checklist, and accessibility is visible quality on a
portfolio piece.

---

## 9. Phase 7 — Barcode scanning

With the grocery framing settled, barcode scanning is a natural first-class feature rather than
an oddity needing justification: scan a product, get its name prefilled, add it to the list. It
is also the single most distinctive thing in the demo, which is why I thought it worth the
implementation cost.

Voice input was **dropped** — `hooks/useSpeech.ts`, `useSpeech.ios.ts`, `useSpeech.web.ts`,
`lib/parseVoiceInput.ts`, `components/ListeningOverlay.tsx`, and `components/VoiceReviewSheet.tsx`
did not port. That removed roughly 600 lines, a microphone-permission prompt, and the Firefox
support gap. The whole platform-split convention (`.ios.ts` / `.web.ts`) went with it, having no
meaning in a web-only app.

`expo-camera` is gone. `getUserMedia` provides the stream, then:

1. Native `BarcodeDetector` where available (Chrome, Edge, Android) — zero bundle cost.
2. `@zxing/browser` fallback for Safari and Firefox, **dynamically imported** so its ~200 KB
   decoder only loads when someone actually taps Scan.
3. No `getUserMedia`, or a denied permission → the Scan button is not rendered. Degrade by
   hiding; a button that throws is worse than no button.

The Open Food Facts lookup ported verbatim — it is CORS-enabled, so it needs no backend. A
camera needs a secure context; Vercel serves HTTPS and `localhost` counts as secure, so
development works.

---

## 10. Phase 8 — Demo framing, performance, metadata

- Dismissible top banner on first load, with the dismissal itself in `sessionStorage`: data
  lives in this browser tab only and is lost when it closes.
- "Back to portfolio" link to https://www.felipesq.dev, so the demo is not a dead end.
- `metadata` with a real title, description, and OG image — this URL gets shared.
- Confirm the bundle actually got smaller. The whole point of leaving react-native-web was load
  time: `lucide-react` must tree-shake, `motion` must stay out of the initial chunk, and zxing
  must stay in a lazy one.
- Sanity-check in Chrome, Safari, and Firefox, at phone and laptop widths, keyboard-only.

---

## 11. Phase 9 — Docs and deploy

`CLAUDE.md`, `AGENTS.md`, and `README.md` were rewritten from scratch. The originals described a
Supabase-backed household app and would have actively misled any future session — every rule
about RLS, `household_id` scoping, service-role keys, migrations, offline queues, and platform
splits was obsolete. What carried forward: TypeScript strict with no `any`, functional
components, named exports, path aliases, components under 200 lines, props interfaces at the top
of the file, and the duplicate-item rule, now noting the store as its single enforcement point.

`check.sh` was replaced by `npm run check` (`tsc --noEmit && eslint && next build`). The old
script's Supabase-migration and service-role-key checks no longer apply.

One Next.js-specific note: `agentRules: false` in `next.config.ts`. Without it, Next regenerates
`AGENTS.md` on dev boot and overwrites the project's own instructions.

Then the new Vercel project, and deploy. No environment variables to configure.

---

## 12. Completion criteria

These replaced the Supabase-era checklist and now live in `CLAUDE.md` as the standing pre-merge
gate:

1. `tsc --noEmit` clean, no `any`
2. `eslint` clean
3. `next build` succeeds
4. No console errors on the happy path, including hydration warnings
5. Works in Chrome, Safari, and Firefox; the Scan button is hidden, not broken, where the camera
   is unsupported or denied
6. Usable at 390px and 1280px, with keyboard navigation reaching every action — including
   delete, which on touch is reachable only through the edit dialog, not the swipe gesture
7. A refresh preserves the lists; a new tab starts fresh
8. Duplicate unchecked items are blocked on both add and rename
