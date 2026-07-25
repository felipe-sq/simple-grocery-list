-- ============================================================
-- Lists — primary container for grocery items (replaces the
-- store/aisle hierarchy in the app; stores/aisles stay dormant).
--
-- The remote DB already has a `lists` table from the Replit
-- CartSync app (owner_id-based, no household_id). This migration
-- adopts that table and its data: adds the household columns,
-- backfills them from owner_id, and swaps the RLS model from
-- per-list ownership to household membership.
-- Idempotent: safe to re-run over a partially applied state.
-- ============================================================

-- Fresh-DB path: creates the full target shape. If the CartSync
-- table exists, this is skipped and the ALTERs below adapt it.
CREATE TABLE IF NOT EXISTS lists (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  color         TEXT,
  icon          TEXT,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_by    UUID        REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- CartSync-era policies reference owner_id — drop before the column.
DROP POLICY IF EXISTS "Users can view lists they own or are members of" ON lists;
DROP POLICY IF EXISTS "Users can create their own lists" ON lists;
DROP POLICY IF EXISTS "Owners can update their lists" ON lists;
DROP POLICY IF EXISTS "Owners can delete their lists" ON lists;

-- Backfill household columns from CartSync's owner_id. The column
-- itself stays as nullable legacy — other CartSync-era objects
-- depend on it, so dropping it is not worth the cascade.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lists' AND column_name = 'owner_id'
  ) THEN
    UPDATE lists SET created_by = owner_id WHERE created_by IS NULL;
    UPDATE lists l
    SET household_id = (
      SELECT hm.household_id FROM household_members hm
      WHERE hm.user_id = l.owner_id
      ORDER BY hm.joined_at ASC
      LIMIT 1
    )
    WHERE l.household_id IS NULL;
    ALTER TABLE lists ALTER COLUMN owner_id DROP NOT NULL;
  END IF;
END $$;

-- Lists whose owner belongs to no household cannot be reached under
-- household RLS — remove them (cascades to their CartSync items).
DELETE FROM lists WHERE household_id IS NULL OR created_by IS NULL;

ALTER TABLE lists
  ALTER COLUMN household_id SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL,
  ALTER COLUMN color DROP NOT NULL;

CREATE INDEX IF NOT EXISTS lists_household ON lists (household_id, sort_order);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household members only" ON lists;
CREATE POLICY "household members only"
  ON lists FOR ALL
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Add to the realtime publication only when needed: skip if the
-- publication is FOR ALL TABLES or the table is already a member
-- (CartSync's schema already added it).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication
    WHERE pubname = 'supabase_realtime' AND NOT puballtables
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lists;
  END IF;
END $$;
