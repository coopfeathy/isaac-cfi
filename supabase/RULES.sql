-- ============================================================
-- MERLIN FLIGHT TRAINING — STRIPE CONNECT PAYOUT RULES SEED
-- ============================================================
-- Run this file AFTER SETUP.sql to insert payout routing rules.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- Schema lives in SETUP.sql section 3F.
-- ============================================================
--
-- ACCOUNT IDs:
--   acct_1FbdK6Cus0IiI5gg   — Isaac / Merlin (main business)
--   acct_1TGjHxE14NEZerCV   — Aircraft owner
--   acct_1TEH7GENasfvDHGO   — Cooper / Developer
--
-- PAYMENT FLOW:
--
--   Aircraft Items (acct_1TGjHxE14NEZerCV) — NO developer commission:
--     - Aircraft Rental N2152Z          → 100% to owner
--     - Redbird Simulator Rental        → 94% to owner, 6% to Isaac
--     - FRG Landing Fee                 → 84% to owner, 16% to Isaac
--     - Fuel Surcharge                  → 97% to owner, 3% to Isaac
--
--   Non-Aircraft Items (acct_1FbdK6Cus0IiI5gg) → Isaac + Cooper commission:
--     - Discovery Flight                → Isaac + 11% Cooper (1% base + 10% discovery bonus)
--     - Instruction                     → Isaac + 1% Cooper
--     - All other transactions          → Isaac + 1% Cooper
--     Cooper params in .env:
--       STRIPE_CONNECT_DEVELOPER_DESTINATION_ACCOUNT=acct_1TEH7GENasfvDHGO
--       STRIPE_CONNECT_DEVELOPER_WEBSITE_TRANSACTION_BPS=100    (1%)
--       STRIPE_CONNECT_DEVELOPER_DISCOVERY_FLIGHT_BPS=1000      (+10%, so 11% total)
--
-- PRIORITY: lower number = higher precedence.
--   1–50   item-specific rules (aircraft & instruction)
--   999    catch-all fallbacks (Isaac account for everything else)
-- ============================================================


-- ============================================================
-- SECTION 1: Aircraft owner item-specific rules (priority 10)
-- Routes aircraft-related items to owner with small platform fee.
-- Developer commission is DISABLED for these items.
-- ============================================================

WITH owner AS (
  SELECT 'acct_1TGjHxE14NEZerCV'::text AS account_id
)
INSERT INTO stripe_connect_payout_rules (
  name, is_active, priority, source, item_id,
  transaction_type, currency, destination_account,
  allow_developer_commission, fee_mode, fee_bps
)
SELECT
  'Aircraft owner split - ' || i.name,
  true,
  10,
  'admin_checkout',
  i.id,
  'website_transaction',
  'usd',
  owner.account_id,
  false,  -- *** NO developer commission on aircraft items ***
  'bps',
  CASE lower(i.name)
    WHEN 'aircraft rental n2152z 0.1/hr' THEN 0   -- owner gets 100%, Isaac gets 0%
    WHEN 'redbird simulator rental'       THEN 6   -- owner gets 94%, Isaac gets 6%
    WHEN 'frg landing fee'                THEN 16  -- owner gets 84%, Isaac gets 16%
    WHEN 'fuel surcharge'                 THEN 3   -- owner gets 97%, Isaac gets 3%
  END
FROM items i
CROSS JOIN owner
WHERE lower(i.name) IN (
  'aircraft rental n2152z 0.1/hr',
  'redbird simulator rental',
  'frg landing fee',
  'fuel surcharge'
)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SECTION 2: Catch-all fallback rules (priority 999)
-- Routes all non-aircraft items to Isaac's account.
-- Developer commission is ENABLED so Cooper gets his percentage.
-- ============================================================

INSERT INTO stripe_connect_payout_rules (
  name,
  is_active,
  priority,
  source,
  transaction_type,
  currency,
  destination_account,
  allow_developer_commission,
  fee_mode,
  fee_bps
) VALUES
  (
    'Fallback – admin checkout (website transaction) → Isaac + Cooper % split',
    true,
    999,
    'admin_checkout',
    'website_transaction',
    'usd',
    'acct_1FbdK6Cus0IiI5gg',
    true,  -- *** YES developer commission (Cooper) ***
    'bps',
    0
  ),
  (
    'Fallback – admin checkout (discovery flight) → Isaac + Cooper % split',
    true,
    999,
    'admin_checkout',
    'discovery_flight',
    'usd',
    'acct_1FbdK6Cus0IiI5gg',
    true,  -- *** YES developer commission (Cooper) ***
    'bps',
    0
  ),
  (
    'Fallback – slot booking → Isaac + Cooper % split',
    true,
    999,
    'slot_booking',
    'website_transaction',
    'usd',
    'acct_1FbdK6Cus0IiI5gg',
    true,  -- *** YES developer commission (Cooper) ***
    'bps',
    0
  )
ON CONFLICT DO NOTHING;


-- ============================================================
-- Verification query — run after inserts above
-- ============================================================
SELECT
  r.name,
  r.source,
  r.transaction_type,
  i.name AS item_name,
  r.destination_account,
  r.allow_developer_commission,
  r.fee_mode,
  r.fee_bps,
  r.priority,
  r.is_active
FROM stripe_connect_payout_rules r
LEFT JOIN items i ON i.id = r.item_id
ORDER BY r.priority ASC, r.name ASC;
