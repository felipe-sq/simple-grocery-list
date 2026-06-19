# Household Grocery List App

A real-time collaborative grocery list for a household of 3–4 people. Organized by store and aisle, with smart suggestions, a reusable staples list, barcode scanning, and voice input.

**Platforms:** iOS (iPhone/iPad) + Web browser
**Stack:** Expo (React Native) · TypeScript · Supabase · Vercel

---

## Project Docs

| File                     | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `CLAUDE.md`              | Instructions Claude Code reads at the start of every session |
| `docs/prd.md`            | Full product requirements, data schema, rules engine spec    |
| `docs/ux-flows.md`       | Wireframes and edge cases for all 8 user flows               |
| `docs/tasks.md`          | All 27 tickets organized by milestone                        |
| `docs/ticket-prompts.md` | Ready-to-paste Claude Code prompts for every ticket          |
| `docs/workflow.md`       | How to run Claude Code sessions and review completed work    |

---

## Quick Start (First Time)

### 1. Install prerequisites

```bash
# Node.js 18+ required
node --version

# Install Expo CLI
npm install -g expo-cli eas-cli

# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Verify Claude Code
claude --version
```

### 2. Clone and set up the repo

```bash
git clone <your-repo-url>
cd grocery-app
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

⚠️ Never commit `.env.local` — it is already in `.gitignore`.

### 4. Run locally

```bash
# iOS simulator
npx expo start --ios

# Web browser
npx expo start --web
```

---

## Building a Ticket with Claude Code

All 27 tickets have ready-to-paste prompts in `docs/ticket-prompts.md`.

```bash
# 1. Open your terminal in the project root
cd grocery-app

# 2. Start a Claude Code session
claude

# 3. Open docs/ticket-prompts.md in VS Code
# 4. Copy everything between --- START T-XXX --- and --- END T-XXX ---
# 5. Paste into the Claude Code terminal and press Enter
# 6. Claude Code works autonomously — come back when it hands control back

# 7. Run the health check
bash check.sh

# 8. Review the output, fix anything flagged, then:
exit   # close the session

# 9. Start fresh for the next ticket
claude
```

---

## Post-Ticket Health Check

After every Claude Code session, run:

```bash
bash check.sh
```

This checks:

1. TypeScript — no type errors
2. ESLint — no lint errors
3. Expo web build — compiles without errors
4. Secret safety — no service role key in client code
5. No `any` types in source files
6. `.env.local` is not tracked by git
7. Supabase migration files exist

All checks must pass before starting the next ticket.

---

## Milestones

| Milestone                 | Tickets       | What gets built                                |
| ------------------------- | ------------- | ---------------------------------------------- |
| 0 — Scaffolding           | T-001 – T-006 | Expo setup, Supabase, auth, households         |
| 1 — Core List             | T-007 – T-013 | Stores, aisles, add items, check off, End Trip |
| 2 — Staples & Suggestions | T-014 – T-018 | Staples CRUD, copy flow, rules engine          |
| 3 — Voice & Barcode       | T-019 – T-020 | Voice input and barcode scanning               |
| 4 — Presence & Polish     | T-021 – T-025 | Presence, offline queue, iOS + web builds      |
| 5 — Hardening             | T-026 – T-027 | Edge case audit, accessibility                 |

---

## Project Structure

```
grocery-app/
├── CLAUDE.md                  # Claude Code instructions (auto-loaded each session)
├── check.sh                   # Post-ticket health check script
├── .env.local                 # Local secrets — never commit
├── .env.example               # Template for environment variables
├── app.config.ts              # Expo app configuration
├── app/
│   ├── (auth)/                # Sign-in, sign-up screens
│   └── (app)/                 # Main app (requires auth)
│       ├── _layout.tsx        # Dynamic tab bar
│       ├── store/
│       │   └── [storeId].tsx  # Per-store grocery list
│       ├── suggestions.tsx    # Suggestions tab
│       ├── staples.tsx        # Staples tab
│       └── settings/
│           └── stores.tsx     # Store & aisle configuration
├── components/                # Shared UI components
├── hooks/                     # Custom React hooks
├── lib/
│   ├── supabase.ts            # Supabase client singleton
│   └── offlineQueue.ts        # Offline mutation queue
├── types/                     # Shared TypeScript types
├── supabase/
│   ├── migrations/            # SQL migration files
│   └── functions/
│       └── suggestions/       # Rules engine Edge Function (Deno)
└── docs/
    ├── prd.md
    ├── ux-flows.md
    ├── tasks.md
    ├── ticket-prompts.md
    └── workflow.md
```

---

## Key Rules (see CLAUDE.md for full details)

- **Never** commit `.env.local` or expose the Supabase service role key in client code
- **Never** skip the duplicate-item check when adding to a grocery list
- **Never** delete migration files — always add new ones
- All queries must be scoped to `household_id` — RLS enforces this at the DB level too
- TypeScript strict mode — no `any` types

---

## Useful Commands

```bash
# Health check after every ticket
bash check.sh

# Type check only
npx tsc --noEmit

# Lint only
npx eslint . --ext .ts,.tsx

# Start Claude Code session
claude

# Push DB schema changes
supabase db push

# Run Edge Function locally
supabase functions serve suggestions

# iOS build (Expo EAS)
eas build --platform ios --profile development

# Web export
expo export --platform web
```

---

## Environment Variables Reference

| Variable                        | Used in             | Description              |
| ------------------------------- | ------------------- | ------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`      | Client app          | Supabase project URL     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Client app          | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY`     | Edge Functions only | Never use in app code    |
