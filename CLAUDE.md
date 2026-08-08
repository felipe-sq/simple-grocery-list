# CLAUDE.md — Simple Grocery List

Read at the start of every session. These instructions override default behaviour.

---

## What this is

A **portfolio demo** of a grocery list app, linked from https://www.felipesq.dev.
It is deliberately backend-free: everything runs in the browser.

- **Framework:** Next.js (App Router) + React + TypeScript strict
- **Styling:** Tailwind v4 + shadcn/ui primitives (Radix under the hood)
- **State:** Zustand, persisted to `sessionStorage`
- **Backend:** none. No database, no API, no environment variables.

The full rationale, and the history of what this replaced, is in `docs/port-plan.md`.

---

## The three rules that matter

### 1. No backend. Ever.

There is no server, no database, no auth provider, and no `.env`. If a feature seems to
need one, it does not belong in this demo. Anything that must persist goes through the
Zustand store.

### 2. `sessionStorage`, not `localStorage`

Data survives a refresh and dies with the tab. This is intentional and was specified
explicitly. It also makes every browser tab an independent instance of the app, which is
what removes the need for any tenancy model. Do not "upgrade" it to `localStorage`.

Consequence: **never read `sessionStorage` during render.** The store uses
`skipHydration`; `components/providers.tsx` rehydrates it in an effect and exposes
`useHydrated()`. Any component that displays store data must render a skeleton until
`useHydrated()` is true, or React throws a hydration mismatch. Use `useMounted()` for
values that only exist client-side, such as the `next-themes` theme.

### 3. The duplicate rule has exactly one enforcement point

An unchecked item with the same name (case-insensitive, trimmed) may not exist twice in
the same list. In the Supabase version this was enforced twice — a unique partial index
plus a UI check. The index is gone with the database, so `addItem` and `editItem` in
`lib/store.ts` are now the **only** place this is enforced. Do not re-implement the check
in a component; call the store and surface the returned error string.

---

## The auth is a demo, and says so

`lib/demo-auth.ts` validates that credentials *look* like credentials. Nothing is
authenticated and **no password is ever stored** — there is nothing to authenticate
against, so storing one would be pure liability.

Every auth screen renders `<DemoAuthNotice />`. Do not remove it, and do not add copy
that implies real security ("encrypted", "your data is safe", "securely stored"). An
unlabelled fake login on a public site reads as either broken or deceptive.

---

## Structure

```
app/
  layout.tsx              root — metadata, fonts, providers, toaster
  page.tsx                redirects to /lists or /sign-in once hydrated
  (auth)/                 sign-in, sign-up, reset-password
  (app)/
    layout.tsx            responsive two-pane shell + route guard
    lists/page.tsx        desktop-only "select a list" pane
    lists/[id]/page.tsx   item view
    settings/page.tsx
components/
  ui/                     shadcn primitives — regenerate, don't hand-edit
  app/                    everything bespoke
  providers.tsx           theme + store hydration, useHydrated, useMounted
lib/
  store.ts                the single source of truth
  seed.ts                 first-load sample content
  barcode.ts              camera + Open Food Facts
  demo-auth.ts
types/index.ts
```

---

## Coding standards

- TypeScript strict. **No `any`** — find the right type or add one to `types/`.
- Functional components only. Named exports for components, default for route files.
- Absolute imports via `@/*`.
- Components under 200 lines; props interface at the top of the file.
- No `set-state-in-effect`. The React Compiler lint rule enforces this and it is not
  disabled anywhere. Reset form state by keying and remounting the form, not by an
  effect; read external values with `useSyncExternalStore`.
- Tailwind classes only — no inline `style` except for user-chosen values such as a
  list's colour.

---

## Feature support must degrade by hiding

Barcode scanning needs a camera and a secure context. `isCameraAvailable()` gates the
Scan button; where it returns false the button is **not rendered**. A button that throws
is worse than no button. The zxing fallback (Safari, Firefox) is dynamically imported so
its ~200 KB decoder never loads on first paint — keep it that way.

---

## Before calling anything done

```bash
npm run check    # tsc --noEmit && eslint && next build
```

Then confirm by hand:

1. No console errors on the happy path, including hydration warnings
2. Works at 390px and 1280px
3. Keyboard-only navigation reaches every action — including delete, which on touch is
   only reachable through the edit dialog, not the swipe gesture
4. A refresh keeps the lists; a new tab starts fresh
5. Adding or renaming to a duplicate name is still blocked

---

## Forbidden

- Adding a backend, database, or environment variable
- Switching `sessionStorage` to `localStorage`
- Using `any`
- Removing the demo notices, or claiming the demo auth is secure
- Skipping the duplicate check, or duplicating it outside the store
- Committing screenshots or `.playwright-mcp/` output
