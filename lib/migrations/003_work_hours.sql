-- ============================================================
-- Migration 003: Configurable full-day / half-day work hours
-- ------------------------------------------------------------
-- Safe to run multiple times (idempotent). Run with: npm run db:migrate
--
-- Why:
--  The standard hours that count as a "full day" vs a "half day"
--  differ from business to business (some run 9-hour days, some 10).
--  These are now a single global, editable setting. Attendance gains
--  a per-row `work_hours` value that auto-fills from the marked
--  status using these settings, but stays manually overridable.
--
--  NOTE: hours are recorded for reference only — salary is still
--  computed from days (present + half-days x 0.5), unchanged.
-- ============================================================

-- Per-attendance worked hours. NULL on legacy rows; the UI derives a
-- value from the status + settings when none is stored.
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS work_hours NUMERIC(5,2);

-- Single-row global config for what a full / half day means in hours.
CREATE TABLE IF NOT EXISTS work_hour_settings (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  full_day_hours  NUMERIC(5,2) NOT NULL DEFAULT 8,
  half_day_hours  NUMERIC(5,2) NOT NULL DEFAULT 4,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT work_hour_settings_single_row CHECK (id = 1)
);

INSERT INTO work_hour_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
