-- ============================================================
-- Migration 002: Dynamic expense categories
-- ------------------------------------------------------------
-- Safe to run multiple times (idempotent). Run with: npm run db:migrate
--
-- Why:
--  Expense categories used to be a hard-coded list in the UI. This
--  table lets users create / rename / delete their own categories.
--  The `expenses.category` column stays a VARCHAR holding the name
--  (no destructive FK migration), and renames cascade by name.
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the previously-hardcoded defaults. ON CONFLICT keeps this
-- idempotent and preserves any rows already present.
INSERT INTO expense_categories (name) VALUES
  ('Diesel'),
  ('Transport'),
  ('Food'),
  ('Maintenance'),
  ('Decoration'),
  ('Labor'),
  ('Miscellaneous')
ON CONFLICT (name) DO NOTHING;

-- Also backfill any category names already used by existing expenses
-- so the management table reflects real data.
INSERT INTO expense_categories (name)
SELECT DISTINCT category FROM expenses
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT (name) DO NOTHING;
