-- ============================================================
-- Seed data for local development and T-017 rules engine testing
-- Reset with: supabase db reset
-- ============================================================

-- ------------------------------------------------------------
-- Auth user (local Supabase allows direct inserts into auth schema)
-- ------------------------------------------------------------

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345',
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Profile
-- ------------------------------------------------------------

INSERT INTO profiles (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test User', NOW())
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Household + membership
-- ------------------------------------------------------------

INSERT INTO households (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000010', 'Test Household', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO household_members (household_id, user_id, joined_at)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  NOW()
) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Store: Trader Joe's
-- ------------------------------------------------------------

INSERT INTO stores (id, household_id, name, sort_order, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000010',
  'Trader Joe''s', 0, NOW()
) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Aisles
-- ------------------------------------------------------------

INSERT INTO aisles (id, household_id, store_id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', 'Produce',  0),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', 'Dairy',    1),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', 'Pantry',   2),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', 'Beverages',3)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Staple items
--   olive oil  → Rule 1 target (never purchased) → score 90 (80+10)
--   oat milk   → Rule 1 target (last bought 20d ago, avg interval 20d) → score 80
-- ------------------------------------------------------------

INSERT INTO staple_items (id, household_id, name, default_store_id, default_aisle_id, sort_order, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000010',
   'olive oil', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', 0, NOW()),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000010',
   'oat milk',  '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- Active grocery items — milk is on the active list (anchor for Rule 3)
-- ------------------------------------------------------------

INSERT INTO grocery_items (
  id, household_id, store_id, aisle_id, name, checked, sort_order, source, created_by, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000400',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000201',
  'milk', false, 0, 'manual',
  '00000000-0000-0000-0000-000000000001',
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Item history
--
-- Trip schedule (12 trips over ~6 months, all at Trader Joe's):
--   Each trip includes: milk (active anchor for Rule 3) + granola (co-purchase)
--   Plus additional items to exercise Rules 2, 4.
--
-- Rule 1 target  — oat milk: bought at -80d, -60d, -40d, -20d (avg interval 20d)
-- Rule 2 target  — bananas: bought 6× in last 180d, last bought 15d ago
--                    → freq score: min(30, 6/180×100)=3.33; decay: min(30,(15-7)×1.5)=12 → score ≈ 75
-- Rule 3 target  — granola: co-purchased with milk (active) in 10/12 trips
--                    → score = 50 + (10/12)×40 ≈ 83
-- Rule 4 target  — sparkling water: bought every 7d for 4 purchases, last bought 12d ago
--                    → stddev≈0, daysSince(12) ≥ avg(7), ≥ avg+3(10) → score = 100
-- ------------------------------------------------------------

-- oat milk: 4 purchases, 20-day interval (avg=20, stddev=0)
-- Also a staple → Rule 1 fires (daysSince=20 > 14) with score 80 (no modifiers, 20 == avg*1)
INSERT INTO item_history (household_id, name, store_id, aisle_id, purchased_at, added_by) VALUES
  ('00000000-0000-0000-0000-000000000010', 'oat milk', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '80 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'oat milk', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '60 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'oat milk', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '40 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'oat milk', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '20 days', '00000000-0000-0000-0000-000000000001');

-- sparkling water: 4 purchases at strict 7-day intervals, last bought 12 days ago
-- stddev=0, avg=7, daysSince=12 ≥ avg-3(4) ✓, ≥ avg(7) → +20, ≥ avg+3(10) → +10 → score=100
INSERT INTO item_history (household_id, name, store_id, aisle_id, purchased_at, added_by) VALUES
  ('00000000-0000-0000-0000-000000000010', 'sparkling water', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000203', NOW() - INTERVAL '33 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'sparkling water', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000203', NOW() - INTERVAL '26 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'sparkling water', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000203', NOW() - INTERVAL '19 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'sparkling water', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000203', NOW() - INTERVAL '12 days', '00000000-0000-0000-0000-000000000001');

-- bananas: 6 purchases spread over ~150 days, last bought 15 days ago (Rule 2)
INSERT INTO item_history (household_id, name, store_id, aisle_id, purchased_at, added_by) VALUES
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '150 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '120 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '90 days',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '60 days',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '35 days',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'bananas', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000200', NOW() - INTERVAL '15 days',  '00000000-0000-0000-0000-000000000001');

-- 12 shopping trips with milk (active anchor) + granola (co-purchase in 10 of 12)
-- Each trip on a distinct day so they count as separate trips for Rule 3
-- Trips 1–10 include granola; trips 11–12 do not → co_occurrence = 10, total_trips = 12
INSERT INTO item_history (household_id, name, store_id, aisle_id, purchased_at, added_by) VALUES
  -- Trip 1 (168d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '168 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '168 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 2 (154d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '154 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '154 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 3 (140d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '140 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '140 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 4 (126d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '126 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '126 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 5 (112d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '112 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '112 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 6 (98d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '98 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '98 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 7 (84d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '84 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '84 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 8 (70d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '70 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '70 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 9 (56d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '56 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '56 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 10 (42d ago): milk + granola
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '42 days', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'granola', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000202', NOW() - INTERVAL '42 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 11 (28d ago): milk only (no granola)
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '28 days', '00000000-0000-0000-0000-000000000001'),
  -- Trip 12 (14d ago): milk only (no granola)
  ('00000000-0000-0000-0000-000000000010', 'milk',    '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000201', NOW() - INTERVAL '14 days', '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- Expected results when calling the Edge Function with
-- household_id = 00000000-0000-0000-0000-000000000010
--
-- Rule 1 — overdue_staple:
--   "olive oil"      score=90  (80 + 10 never purchased)   category: might_be_running_low
--   "oat milk"       score=80  (daysSince=20, avg=20 → no modifier)  category: might_be_running_low
--
-- Rule 2 — frequency_recency:
--   "bananas"        score≈75  (60 + 3.33 freq + 12 decay) category: might_be_running_low
--   "granola"        score≈67  (60 + 3.9 freq + 3.27 decay, 3 purchases in 180d) category: might_be_running_low
--
-- Rule 3 — co_purchase (requires ≥10 trips: 12 trips present):
--   "granola"        score≈83  (50 + 10/12×40 ≈ 83.3)     category: ai_picks (primary rule)
--   (granola appears in both Rule 2 and Rule 3; merged score ≈ 150; category from Rule 3 wins if higher)
--
-- Rule 4 — periodic_pattern:
--   "sparkling water" score=100 (70+20+10, daysSince=12, avg=7, stddev=0)  category: might_be_running_low
--
-- Final ranking (score desc, capped 10/category):
--   1. sparkling water   100   might_be_running_low  [periodic_pattern]
--   2. olive oil          90   might_be_running_low  [overdue_staple]
--   3. oat milk           80   might_be_running_low  [overdue_staple]
--   4. granola           ~150  (merged R2+R3)        category depends on which rule scored higher
--   5. bananas           ~75   might_be_running_low  [frequency_recency]
-- ============================================================
