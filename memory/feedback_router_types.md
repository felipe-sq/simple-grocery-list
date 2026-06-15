---
name: feedback-router-types
description: How to handle Expo Router typed routes — router.d.ts must be manually updated before tsc runs
metadata:
  type: feedback
---

When adding new Expo Router routes, `.expo/types/router.d.ts` must be manually updated to include them before running `npx tsc --noEmit`.

**Why:** check.sh runs `npx tsc --noEmit` BEFORE `npx expo export`. The export step regenerates router.d.ts, but tsc runs first and will fail on unknown route strings (`'/(onboarding)/create'` etc.) if they aren't already in the types file.

**How to apply:** After creating new `app/` files, add their routes to all three sections of `.expo/types/router.d.ts`: `hrefInputParams`, `hrefOutputParams`, and `href`. Follow the existing format — group paths use `${'/(groupname)'}/slug | /slug` pattern. Also use `/(app)` (no trailing slash) not `/(app)/` — the typed routes don't include trailing slashes.
