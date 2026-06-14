#!/bin/bash
# check.sh — Post-ticket health check for Grocery App
# Run this after every Claude Code ticket session: bash check.sh
# Or make it executable once: chmod +x check.sh, then run: ./check.sh

PASS="✅"
FAIL="❌"
WARN="⚠️ "
DIVIDER="─────────────────────────────────────"
FAILED=false

echo ""
echo "🛒 Grocery App — Post-Ticket Health Check"
echo "$DIVIDER"

# ── 1. TypeScript ────────────────────────────────────────────────
echo ""
echo "1. TypeScript"
if npx tsc --noEmit 2>&1; then
  echo "$PASS No type errors"
else
  echo "$FAIL Type errors found — fix before moving to the next ticket"
  FAILED=true
fi

# ── 2. ESLint ────────────────────────────────────────────────────
echo ""
echo "2. ESLint"
if npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1; then
  echo "$PASS No lint errors"
else
  echo "$WARN Lint warnings/errors found — review above output"
fi

# ── 3. Expo web build check ──────────────────────────────────────
echo ""
echo "3. Expo web build (dry run)"
if npx expo export --platform web --output-dir /tmp/grocery-web-check --clear 2>&1; then
  echo "$PASS Web build succeeded"
  rm -rf /tmp/grocery-web-check
else
  echo "$FAIL Web build failed — check Expo output above"
  FAILED=true
fi

# ── 4. Check for exposed secrets ─────────────────────────────────
echo ""
echo "4. Secret safety check"
SECRET_HITS=$(grep -r "SERVICE_ROLE_KEY" ./app ./components ./lib ./hooks 2>/dev/null || true)
if [ -z "$SECRET_HITS" ]; then
  echo "$PASS No service role key found in client code"
else
  echo "$FAIL SERVICE_ROLE_KEY found in client-side files — remove immediately:"
  echo "$SECRET_HITS"
  FAILED=true
fi

# ── 5. Check for any TypeScript `any` usage ──────────────────────
echo ""
echo "5. Checking for 'any' type usage"
ANY_HITS=$(grep -rn ": any" ./app ./components ./lib ./hooks 2>/dev/null || true)
if [ -z "$ANY_HITS" ]; then
  echo "$PASS No 'any' types found"
else
  echo "$WARN 'any' types found — review and type properly:"
  echo "$ANY_HITS"
fi

# ── 6. Check .env.local is not tracked by git ────────────────────
echo ""
echo "6. Git safety — .env.local"
if git ls-files --error-unmatch .env.local 2>/dev/null; then
  echo "$FAIL .env.local is tracked by git — run: git rm --cached .env.local"
  FAILED=true
else
  echo "$PASS .env.local is not tracked by git"
fi

# ── 7. Migration files present ───────────────────────────────────
echo ""
echo "7. Supabase migrations"
MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
if [ "$MIGRATION_COUNT" -gt 0 ]; then
  echo "$PASS $MIGRATION_COUNT migration file(s) found"
else
  echo "$WARN No migration files found in supabase/migrations/ — expected after T-003"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "$DIVIDER"
if [ "$FAILED" = true ]; then
  echo "$FAIL Some checks failed. Fix the issues above before starting the next ticket."
else
  echo "$PASS All checks passed. Safe to move to the next ticket."
fi
echo ""
