-- The original "household members can view other members" policy on
-- household_members contained a self-referential subquery:
--
--   USING (household_id IN (
--     SELECT household_id FROM household_members WHERE user_id = auth.uid()
--   ))
--
-- PostgreSQL detects this as infinite recursion (42P17) and aborts any query
-- that hits it — including the subqueries inside every other table's policy
-- (stores, grocery_items, etc.) and INSERT ... RETURNING on households.
--
-- Fix: replace with a direct, non-recursive check. Users only need to read
-- their own membership row; other members' presence is tracked via Realtime
-- Presence (not DB queries), so no functionality is lost.

DROP POLICY "household members can view other members" ON household_members;

CREATE POLICY "users can read own membership"
  ON household_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
