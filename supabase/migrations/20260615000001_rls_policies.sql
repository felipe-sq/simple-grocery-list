-- ============================================================
-- RLS Policies — Household Grocery List App
-- T-004: Lock every table so queries are scoped to the
-- authenticated user's household. Service-role key (Edge
-- Functions only) bypasses RLS automatically.
-- ============================================================

-- Reusable helper: is the current user a member of a household?
-- Used inline in USING / WITH CHECK clauses below.
-- Pattern: household_id IN (
--   SELECT household_id FROM household_members WHERE user_id = auth.uid()
-- )

-- ============================================================
-- profiles
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read profiles (needed to display
-- names on items: created_by, checked_by columns join here).
CREATE POLICY "authenticated users can read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- A user may only create their own profile row.
CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- A user may only update their own profile row.
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- households
-- ============================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read household"
  ON households FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Any authenticated user can create a new household
-- (first step of onboarding before any member row exists).
CREATE POLICY "authenticated users can create household"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "household members can update household"
  ON households FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- household_members
-- ============================================================

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can view other members"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- A user can add only themselves (join via invite link).
-- Token validation is enforced at the application layer.
CREATE POLICY "users can add themselves to a household"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- A user can remove only themselves (leave household).
CREATE POLICY "users can remove themselves from a household"
  ON household_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- stores
-- ============================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON stores FOR ALL
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

-- ============================================================
-- aisles
-- ============================================================

ALTER TABLE aisles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON aisles FOR ALL
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

-- ============================================================
-- grocery_items
-- ============================================================

ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON grocery_items FOR ALL
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

-- ============================================================
-- staple_items
-- ============================================================

ALTER TABLE staple_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON staple_items FOR ALL
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

-- ============================================================
-- item_history
-- ============================================================

ALTER TABLE item_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON item_history FOR ALL
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

-- ============================================================
-- suggestion_cache
-- ============================================================

ALTER TABLE suggestion_cache ENABLE ROW LEVEL SECURITY;

-- Clients may only read cached suggestions for their household.
-- Writes come exclusively from Edge Functions (service role
-- bypasses RLS), so no INSERT/UPDATE/DELETE policy is needed.
CREATE POLICY "household members can read suggestion cache"
  ON suggestion_cache FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- suggestion_dismissals
-- ============================================================

ALTER TABLE suggestion_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members only"
  ON suggestion_dismissals FOR ALL
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

-- ============================================================
-- household_invites
-- ============================================================

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may look up an invite to validate a
-- join token. The token is an unguessable secret, so this is
-- the correct access-control boundary (not RLS row visibility).
CREATE POLICY "authenticated users can read invites"
  ON household_invites FOR SELECT
  TO authenticated
  USING (true);

-- Only existing household members may generate invite links.
CREATE POLICY "household members can create invites"
  ON household_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- Only the creator can revoke (delete) an invite.
CREATE POLICY "creator can delete invite"
  ON household_invites FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
