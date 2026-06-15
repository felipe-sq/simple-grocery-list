-- Allow authenticated users to mark an invite as used when joining a household.
-- The application enforces that only unused, non-expired invites are processed.
-- WITH CHECK (used_by = auth.uid()) ensures a user can only mark themselves as the user.

CREATE POLICY "authenticated users can mark invite used"
  ON household_invites FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (used_by = auth.uid());
