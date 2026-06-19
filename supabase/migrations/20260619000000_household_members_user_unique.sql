-- Enforce one household per user.
-- If a user ended up in multiple households (e.g. during testing), keep the
-- earliest row and remove the rest before adding the constraint.
DELETE FROM household_members
WHERE ctid NOT IN (
  SELECT DISTINCT ON (user_id) ctid
  FROM household_members
  ORDER BY user_id, joined_at ASC
);

ALTER TABLE household_members
  ADD CONSTRAINT household_members_user_id_unique UNIQUE (user_id);
