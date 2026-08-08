# Simple Grocery List

A fast, keyboard-friendly grocery list app that runs entirely in the browser — no backend,
no account, no setup. Built as a portfolio demo for [felipesq.dev](https://www.felipesq.dev).

> **Demo build.** Your lists live in the browser tab's `sessionStorage` and are cleared when
> you close it. The sign-in screen is a UI demonstration: no account is created, nothing is
> sent to a server, and no password is ever stored.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui primitives (Radix) + bespoke list UI |
| State | Zustand, persisted to `sessionStorage` |
| Animation | Motion |
| Icons | Lucide |
| Hosting | Vercel |

There are **no environment variables** and nothing to provision. `npm install && npm run dev`
is the entire setup.

---

## Features

- **Multiple lists**, each with a colour, and live item counts
- **Tags and filtering** — group items by aisle and filter with one tap
- **Quantity, unit, and notes** per item
- **Barcode scanning** — the camera reads a product barcode and
  [Open Food Facts](https://openfoodfacts.org) fills in the name
- **Swipe to delete** on touch, hover controls on desktop, and a keyboard path to every
  action
- **Light and dark themes**, following the system by default
- **Responsive** — a stacked single-column flow on phones, a two-pane layout on desktop

Nothing in the data model is grocery-specific, so the lists work just as well for packing,
hardware runs, or anything else.

---

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run check        # tsc --noEmit && eslint && next build
```

Barcode scanning needs a camera and a secure context. `localhost` counts as secure, so it
works in development. Where the camera is unavailable or blocked, the Scan button is not
rendered rather than failing when pressed.

---

## Design notes

**Why no backend.** The app is linked from a portfolio, so the priority is that a visitor
can use it within a second of arriving. An account wall or a cold database would both get in
the way, and a free-tier database that sleeps after a week of inactivity would eventually
make the link look broken.

**Why `sessionStorage` rather than `localStorage`.** Data should not outlive the visit. It
also has a useful side effect: `sessionStorage` is scoped per tab, so every tab is a fully
independent instance of the app — no accounts, no tenancy, no row-level security needed.

**Where the invariant lives.** An unchecked item cannot appear twice in the same list. That
used to be enforced by a Postgres unique partial index *and* a UI check; without a database,
`lib/store.ts` is the single enforcement point for both adding and renaming.

**History.** This started as a Supabase-backed, household-shared Expo/React Native app. The
port to a standalone web app — and the reasoning behind each decision — is written up in
[`docs/port-plan.md`](docs/port-plan.md). The original implementation is preserved on the
`archive/expo-supabase` branch and tag.
