-- ============================================================
-- Initial schema — Household Grocery List App
-- ============================================================

-- ------------------------------------------------------------
-- Enum
-- ------------------------------------------------------------

CREATE TYPE item_source AS ENUM (
  'manual',
  'staples',
  'suggestion',
  'barcode',
  'voice'
);

-- ------------------------------------------------------------
-- profiles (extends auth.users — one row per auth user)
-- ------------------------------------------------------------

CREATE TABLE profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- households
-- ------------------------------------------------------------

CREATE TABLE households (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- household_members
-- ------------------------------------------------------------

CREATE TABLE household_members (
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

-- ------------------------------------------------------------
-- stores (up to 3 per household, enforced at app level)
-- ------------------------------------------------------------

CREATE TABLE stores (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- aisles (up to 10 per store, enforced at app level)
-- ------------------------------------------------------------

CREATE TABLE aisles (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID  NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id      UUID  NOT NULL REFERENCES stores(id)     ON DELETE CASCADE,
  name          TEXT  NOT NULL,
  sort_order    INT   NOT NULL DEFAULT 0
);

-- ------------------------------------------------------------
-- grocery_items
-- ------------------------------------------------------------

CREATE TABLE grocery_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_id      UUID        NOT NULL REFERENCES stores(id)     ON DELETE CASCADE,
  aisle_id      UUID        NOT NULL REFERENCES aisles(id)     ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  quantity      FLOAT,
  unit          TEXT,
  notes         TEXT,
  checked       BOOLEAN     NOT NULL DEFAULT FALSE,
  checked_at    TIMESTAMPTZ,
  checked_by    UUID        REFERENCES profiles(id),
  sort_order    INT         NOT NULL DEFAULT 0,
  source        item_source NOT NULL DEFAULT 'manual',
  created_by    UUID        NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate unchecked items with the same name in the same store.
-- Case-insensitive: LOWER(name) ensures "Milk" and "milk" are the same.
CREATE UNIQUE INDEX grocery_items_no_duplicate_unchecked
  ON grocery_items (household_id, store_id, LOWER(name))
  WHERE checked = false;

-- Keep updated_at accurate automatically.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grocery_items_updated_at
  BEFORE UPDATE ON grocery_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ------------------------------------------------------------
-- staple_items
-- ------------------------------------------------------------

CREATE TABLE staple_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id      UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  default_store_id  UUID        REFERENCES stores(id) ON DELETE SET NULL,
  default_aisle_id  UUID        REFERENCES aisles(id) ON DELETE SET NULL,
  default_qty       FLOAT,
  default_unit      TEXT,
  sort_order        INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- item_history (purchase log; source of truth for suggestions)
-- ------------------------------------------------------------

CREATE TABLE item_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,  -- normalized: lowercased, trimmed
  store_id      UUID        NOT NULL REFERENCES stores(id)    ON DELETE CASCADE,
  aisle_id      UUID        NOT NULL REFERENCES aisles(id)    ON DELETE CASCADE,
  barcode       TEXT,
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by      UUID        NOT NULL REFERENCES profiles(id)
);

-- Heavily queried by the rules engine (180-day window per household).
CREATE INDEX item_history_household_purchased
  ON item_history (household_id, purchased_at DESC);

-- ------------------------------------------------------------
-- household_invites (single-use, 48-hour expiry)
-- ------------------------------------------------------------

CREATE TABLE household_invites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token         TEXT        NOT NULL UNIQUE,
  created_by    UUID        NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  used_at       TIMESTAMPTZ,
  used_by       UUID        REFERENCES profiles(id)
);

-- UNIQUE already creates an index; explicit index for documentation clarity.
CREATE INDEX household_invites_token ON household_invites (token);

-- ------------------------------------------------------------
-- suggestion_cache (one row per household, refreshed every 6 h)
-- ------------------------------------------------------------

CREATE TABLE suggestion_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
  suggestions   JSONB       NOT NULL DEFAULT '[]'
);

-- ------------------------------------------------------------
-- suggestion_dismissals (resurface after 7 days)
-- ------------------------------------------------------------

CREATE TABLE suggestion_dismissals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name     TEXT        NOT NULL,  -- normalized: lowercased, trimmed
  dismissed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resurface_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  dismissed_by  UUID        NOT NULL REFERENCES profiles(id)
);
