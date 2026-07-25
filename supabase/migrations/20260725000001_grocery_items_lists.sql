-- ============================================================
-- Move grocery_items from store/aisle scoping to list scoping,
-- and merge in the Replit CartSync data:
--   • each existing Expo store becomes a list (aisle name → tag)
--   • CartSync `items` rows are copied into grocery_items
--     (store_tag → tag, completed → checked, note → notes)
--   • CartSync-only tables/trigger are then dropped
-- Idempotent: safe to re-run over a partially applied state.
-- ============================================================

ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tag TEXT;

-- One list per existing Expo store, preserving name/color/order.
-- created_by = earliest member of the household (households have
-- no owner column; the first joiner is the closest proxy).
-- Reuses the store id as the list id so the item update below is
-- a simple join and re-runs are conflict-free.
INSERT INTO lists (id, household_id, name, color, sort_order, created_by, created_at)
SELECT
  s.id,
  s.household_id,
  s.name,
  s.color,
  s.sort_order,
  (
    SELECT user_id FROM household_members hm
    WHERE hm.household_id = s.household_id
    ORDER BY hm.joined_at ASC
    LIMIT 1
  ),
  s.created_at
FROM stores s
WHERE EXISTS (
  SELECT 1 FROM household_members hm WHERE hm.household_id = s.household_id
)
ON CONFLICT (id) DO NOTHING;

UPDATE grocery_items gi
SET
  list_id = gi.store_id,
  tag = a.name
FROM aisles a
WHERE a.id = gi.aisle_id
  AND gi.list_id IS NULL
  AND gi.store_id IN (SELECT id FROM lists);

-- Copy CartSync items into grocery_items (guarded: the items table
-- only exists on DBs that ran the CartSync schema).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'items'
  ) THEN
    INSERT INTO grocery_items
      (id, household_id, list_id, tag, name, notes, checked, checked_at,
       sort_order, source, created_by, created_at)
    SELECT
      i.id,
      l.household_id,
      i.list_id,
      i.store_tag,
      i.name,
      i.note,
      i.completed,
      i.completed_at,
      COALESCE(i.sort_order, 0),
      'manual',
      COALESCE(i.created_by, l.created_by),
      i.created_at
    FROM items i
    JOIN lists l ON l.id = i.list_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Items whose store had no household member (orphans) cannot get a
-- list; delete them rather than block the NOT NULL constraint.
DELETE FROM grocery_items WHERE list_id IS NULL;

-- CartSync had no duplicate constraint — dedupe unchecked items per
-- (list, name), keeping the earliest, before the unique index below.
DELETE FROM grocery_items g
USING grocery_items keep
WHERE g.list_id = keep.list_id
  AND LOWER(g.name) = LOWER(keep.name)
  AND NOT g.checked AND NOT keep.checked
  AND g.id <> keep.id
  AND (g.created_at > keep.created_at
       OR (g.created_at = keep.created_at AND g.id > keep.id));

ALTER TABLE grocery_items
  ALTER COLUMN list_id SET NOT NULL,
  ALTER COLUMN store_id DROP NOT NULL,
  ALTER COLUMN aisle_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS grocery_items_list ON grocery_items (list_id);

-- Duplicate rule now scoped per list (two lists may both have "milk").
DROP INDEX IF EXISTS grocery_items_no_duplicate_unchecked;
CREATE UNIQUE INDEX grocery_items_no_duplicate_unchecked
  ON grocery_items (list_id, LOWER(name))
  WHERE checked = false;

-- ------------------------------------------------------------
-- Drop CartSync leftovers now that their data is merged.
-- ------------------------------------------------------------

DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS list_members;
DROP FUNCTION IF EXISTS user_can_access_list(uuid);
DROP FUNCTION IF EXISTS is_list_member(uuid);
DROP FUNCTION IF EXISTS is_list_owner(uuid);

-- CartSync's signup trigger writes profiles(email, display_name) —
-- columns this DB's profiles table doesn't have — so it breaks every
-- new sign-up. The app upserts profiles client-side instead.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- CartSync's duplicate profiles policies (the Expo ones remain).
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
