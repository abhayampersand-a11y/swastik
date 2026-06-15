-- ============================================================
-- Migration 001: Per-day availability & variable per-day quantity
-- ------------------------------------------------------------
-- Safe to run multiple times (idempotent). Run with: npm run db:migrate
--
-- Why:
--  1. Availability must be computed PER DATE, not as a single
--     `inventory_items.available_quantity` counter. A chair rented
--     on the 20th is free again on the 21st.
--  2. A booking spanning several days may need a DIFFERENT quantity
--     on each day (e.g. 10 chairs day-1, 20 chairs day-2 & day-3).
--     Rent = SUM(per-day qty * daily rate), not flat qty*days*rate.
-- ============================================================

-- booking_items.days was already used by the API but missing from
-- the schema. Add it so existing databases match the code.
ALTER TABLE booking_items
  ADD COLUMN IF NOT EXISTS days INTEGER DEFAULT 1;

-- Per-day breakdown for a booking line item. A row PER DATE the item
-- is actually on rent, with that date's quantity & rate. When a line
-- item has rows here, they OVERRIDE the flat quantity/days for both
-- rent and availability. When it has none, the flat values apply
-- across the booking's setup_date..return_date range.
CREATE TABLE IF NOT EXISTS booking_item_days (
  id              SERIAL PRIMARY KEY,
  booking_item_id INTEGER NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES inventory_items(id),
  usage_date      DATE NOT NULL,
  quantity        INTEGER NOT NULL,
  rental_rate     NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_item_id, usage_date)
);

-- Availability lookups hit (item_id, usage_date) hard.
CREATE INDEX IF NOT EXISTS idx_booking_item_days_item_date
  ON booking_item_days (item_id, usage_date);

-- Range-overlap lookups for flat booking_items scan by item + dates.
CREATE INDEX IF NOT EXISTS idx_booking_items_item
  ON booking_items (item_id);

CREATE INDEX IF NOT EXISTS idx_bookings_dates
  ON bookings (event_date, setup_date, return_date);
